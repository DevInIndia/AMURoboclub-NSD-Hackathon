/**
 * TTL cache for third-party API responses.
 *
 * This is load-bearing, not an optimisation. NASA's DEMO_KEY allows ten
 * requests per hour for the whole server, so without caching a handful of
 * visitors would exhaust the quota and everyone else would see errors.
 *
 * Three behaviours matter:
 *
 *  - **TTL**: a fresh value is served without touching the network.
 *  - **Single flight**: concurrent misses share one upstream request. Ten
 *    simultaneous visitors on a cold cache must not become ten API calls.
 *  - **Stale on failure**: if the upstream is down or rate-limited, a stale
 *    value is served with a flag rather than an error. Space weather from
 *    twenty minutes ago is far more useful than nothing.
 */

export function createCache({ ttlMs, staleMs = ttlMs * 12, now = Date.now } = {}) {
  const entries = new Map();
  const inFlight = new Map();

  async function get(key, fetcher) {
    const cached = entries.get(key);
    const age = cached ? now() - cached.fetchedAt : Infinity;

    if (cached && age < ttlMs) {
      return { value: cached.value, fetchedAt: cached.fetchedAt, stale: false };
    }

    // Someone else is already fetching this key; wait for their result rather
    // than starting a second identical request.
    if (inFlight.has(key)) {
      try {
        return await inFlight.get(key);
      } catch (error) {
        if (cached && age < staleMs) {
          return { value: cached.value, fetchedAt: cached.fetchedAt, stale: true };
        }
        throw error;
      }
    }

    const pending = (async () => {
      const value = await fetcher();
      const fetchedAt = now();
      entries.set(key, { value, fetchedAt });
      return { value, fetchedAt, stale: false };
    })();

    inFlight.set(key, pending);

    try {
      return await pending;
    } catch (error) {
      // Serve the last good value rather than failing the page outright.
      if (cached && age < staleMs) {
        console.error(`Upstream fetch for "${key}" failed; serving stale data:`, error.message);
        return { value: cached.value, fetchedAt: cached.fetchedAt, stale: true };
      }
      throw error;
    } finally {
      inFlight.delete(key);
    }
  }

  return {
    get,
    clear: () => {
      entries.clear();
      inFlight.clear();
    },
    get size() {
      return entries.size;
    },
  };
}

/**
 * fetch with a timeout, so a hung upstream cannot pin a request open.
 * Node's fetch has no default timeout at all.
 */
export async function fetchJson(url, { timeoutMs = 10_000, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Upstream responded ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Upstream timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
