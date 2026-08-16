import { describe, it, expect, vi } from "vitest";
import { createCache, fetchJson } from "../services/cache.js";

/** A clock we control, so TTL behaviour is tested without real waiting. */
const fakeClock = (start = 1_000_000) => {
  let current = start;
  return { now: () => current, advance: (ms) => (current += ms) };
};

describe("createCache", () => {
  it("fetches on a miss and serves the value", async () => {
    const cache = createCache({ ttlMs: 1000 });
    const fetcher = vi.fn().mockResolvedValue("data");

    const result = await cache.get("k", fetcher);

    expect(result.value).toBe("data");
    expect(result.stale).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("serves a fresh value without touching the network", async () => {
    const clock = fakeClock();
    const cache = createCache({ ttlMs: 1000, now: clock.now });
    const fetcher = vi.fn().mockResolvedValue("data");

    await cache.get("k", fetcher);
    clock.advance(500);
    await cache.get("k", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches once the TTL has passed", async () => {
    const clock = fakeClock();
    const cache = createCache({ ttlMs: 1000, now: clock.now });
    const fetcher = vi.fn().mockResolvedValue("data");

    await cache.get("k", fetcher);
    clock.advance(1500);
    await cache.get("k", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  // The property that protects NASA's 10-per-hour quota: a burst of visitors
  // on a cold cache must produce exactly one upstream request.
  it("collapses concurrent misses into a single fetch", async () => {
    const cache = createCache({ ttlMs: 1000 });
    let resolve;
    const fetcher = vi.fn(() => new Promise((r) => (resolve = r)));

    const all = Promise.all(Array.from({ length: 10 }, () => cache.get("k", fetcher)));
    resolve("data");
    const results = await all;

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.value === "data")).toBe(true);
  });

  it("serves stale data when the upstream fails", async () => {
    const clock = fakeClock();
    const cache = createCache({ ttlMs: 1000, staleMs: 10_000, now: clock.now });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("good")
      .mockRejectedValue(new Error("upstream down"));

    await cache.get("k", fetcher);
    clock.advance(2000); // past TTL, inside the stale window

    const result = await cache.get("k", fetcher);
    expect(result.value).toBe("good");
    expect(result.stale).toBe(true);
  });

  it("propagates the error once the stale window has also passed", async () => {
    const clock = fakeClock();
    const cache = createCache({ ttlMs: 1000, staleMs: 5000, now: clock.now });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("good")
      .mockRejectedValue(new Error("upstream down"));

    await cache.get("k", fetcher);
    clock.advance(10_000);

    await expect(cache.get("k", fetcher)).rejects.toThrow("upstream down");
  });

  it("propagates the error when nothing was ever cached", async () => {
    const cache = createCache({ ttlMs: 1000 });
    const fetcher = vi.fn().mockRejectedValue(new Error("cold failure"));
    await expect(cache.get("k", fetcher)).rejects.toThrow("cold failure");
  });

  it("keeps separate keys independent", async () => {
    const cache = createCache({ ttlMs: 1000 });
    await cache.get("a", () => Promise.resolve(1));
    await cache.get("b", () => Promise.resolve(2));
    expect(cache.size).toBe(2);
  });

  it("does not leave a failed fetch blocking later attempts", async () => {
    const cache = createCache({ ttlMs: 1000 });
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("blip"))
      .mockResolvedValue("recovered");

    await expect(cache.get("k", fetcher)).rejects.toThrow("blip");
    const result = await cache.get("k", fetcher);
    expect(result.value).toBe("recovered");
  });
});

describe("fetchJson", () => {
  it("returns parsed JSON on success", async () => {
    const stub = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ hello: "world" }) });

    await expect(fetchJson("https://example.test")).resolves.toEqual({ hello: "world" });
    stub.mockRestore();
  });

  it("throws on a non-2xx response rather than returning an error body", async () => {
    const stub = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });

    await expect(fetchJson("https://example.test")).rejects.toThrow(/429/);
    stub.mockRestore();
  });

  // Node's fetch has no default timeout, so a hung upstream would otherwise
  // hold the request open indefinitely.
  it("times out instead of hanging", async () => {
    const stub = vi.spyOn(globalThis, "fetch").mockImplementation(
      (url, { signal }) =>
        new Promise((_, reject) =>
          signal.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          })
        )
    );

    await expect(fetchJson("https://example.test", { timeoutMs: 20 })).rejects.toThrow(
      /timed out/i
    );
    stub.mockRestore();
  });
});
