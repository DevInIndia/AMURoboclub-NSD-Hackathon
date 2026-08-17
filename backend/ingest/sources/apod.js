import { fetchJson } from "../../services/cache.js";

/**
 * NASA's Astronomy Picture of the Day archive.
 *
 * Each entry pairs an image with a few paragraphs written by professional
 * astronomers, which makes the explanations a good grounding corpus: current,
 * accurate, and written for exactly the audience this app serves.
 */

const APOD_API = "https://api.nasa.gov/planetary/apod";

// Entries shorter than this are usually a one-line caption with no substance
// worth retrieving.
const MIN_CONTENT_LENGTH = 200;

export async function loadApod({ count = 30 } = {}) {
  const key = process.env.NASA_API_KEY || "DEMO_KEY";
  const url = `${APOD_API}?api_key=${encodeURIComponent(key)}&count=${count}&thumbs=false`;

  const entries = await fetchJson(url, { timeoutMs: 20_000 });
  if (!Array.isArray(entries)) throw new Error("APOD returned an unexpected payload");

  return entries
    .filter((entry) => entry?.explanation?.length >= MIN_CONTENT_LENGTH && entry.title)
    .map((entry) => ({
      source: "nasa-apod",
      title: entry.title,
      url: `https://apod.nasa.gov/apod/ap${entry.date.slice(2).replace(/-/g, "")}.html`,
      // The title carries real signal for retrieval (object names especially),
      // so it is embedded alongside the explanation rather than stored beside it.
      content: `${entry.title} (NASA Astronomy Picture of the Day, ${entry.date}). ${entry.explanation}`,
    }));
}
