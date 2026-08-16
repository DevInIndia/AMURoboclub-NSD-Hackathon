import axios from "axios";
import { useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

const client = axios.create({ baseURL: import.meta.env.VITE_BACKEND_URL });

/** Raised when Auth0 has no usable session, so the caller must sign in again. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has expired. Please sign in again.");
    this.name = "SessionExpiredError";
  }
}

/** Pull a readable message out of a failed request. */
export function errorMessage(error, fallback) {
  if (error instanceof SessionExpiredError) return error.message;
  return error?.response?.data?.error || fallback;
}

/** Model metadata and the values the classifier accepts. Needs no auth. */
export async function fetchClassifierOptions() {
  const { data } = await client.get("/api/advanced-search/options");
  return data;
}

/** Live NOAA space weather. Public, cached server-side. */
export async function fetchSpaceWeather() {
  const { data } = await client.get("/api/space-weather");
  return data;
}

/** Near-Earth close approaches from NASA NeoWs. Public, cached server-side. */
export async function fetchAsteroids() {
  const { data } = await client.get("/api/space-weather/asteroids");
  return data;
}

/** Planet classes and the methodology citations. Needs no auth. */
export async function fetchExoplanetOptions() {
  const { data } = await client.get("/api/exoplanet/options");
  return data;
}

/**
 * Backend calls that require a signed-in user. The Auth0 access token is
 * fetched per request, so it is always current.
 */
export function useApi() {
  const { getToken } = useAuth();

  const authorized = useCallback(
    async (config) => {
      let token;
      try {
        token = await getToken();
      } catch (error) {
        // Auth0 raises login_required / consent_required once the refresh
        // token is gone. That is a sign-in problem, not a network one, and
        // saying so is far more useful than "could not be reached".
        console.error("Could not obtain an access token:", error);
        throw new SessionExpiredError();
      }

      return client({
        ...config,
        headers: { ...config.headers, Authorization: `Bearer ${token}` },
      });
    },
    [getToken]
  );

  return useMemo(
    () => ({
      /** Ask a question. The backend archives the answer as it returns it. */
      async ask(question) {
        const { data } = await authorized({
          method: "post",
          url: "/search",
          data: { name: question },
        });
        return data; // { answer, archiveError }
      },

      async analyseImage(file) {
        const form = new FormData();
        form.append("image", file);
        const { data } = await authorized({
          method: "post",
          url: "/upload",
          data: form,
          headers: { "Content-Type": "multipart/form-data" },
        });
        return data;
      },

      /** Classify a star. The backend archives the measurements as columns. */
      async classifyStar(parameters) {
        const { data } = await authorized({
          method: "post",
          url: "/api/advanced-search",
          data: parameters,
        });
        return data;
      },

      /** Characterise a planet. Pure computation -- no LLM call behind it. */
      async characteriseExoplanet(parameters) {
        const { data } = await authorized({
          method: "post",
          url: "/api/exoplanet",
          data: parameters,
        });
        return data;
      },

      /** Only image descriptions are saved from here; the rest save server-side. */
      async savePrompt({ text, response }) {
        await authorized({
          method: "post",
          url: "/api/archive/prompts",
          data: { text, response },
        });
      },

      /**
       * The archive, newest first. `search` is applied by Postgres across every
       * stored row, not just the ones already downloaded.
       */
      async fetchArchive({ search = "", limit = 50 } = {}) {
        const { data } = await authorized({
          method: "get",
          url: "/api/archive",
          params: { q: search || undefined, limit },
        });
        return data.entries;
      },

      /** Per-type counts of everything this user has classified. */
      async fetchClassificationStats() {
        const { data } = await authorized({
          method: "get",
          url: "/api/archive/stats",
        });
        return data.classifications;
      },
    }),
    [authorized]
  );
}
