import { z } from "zod";
import { createCache, fetchJson } from "./cache.js";

/**
 * Live space weather from NOAA's Space Weather Prediction Center.
 *
 * Deliberately *not* a model. Predicting solar flares is an open research
 * problem, and a hackathon-grade classifier asserting "24-hour X-class
 * probability" would look authoritative while being untrustworthy. NOAA
 * already publishes a forecast produced by actual forecasters; showing theirs
 * is both more useful and honest about whose judgement it is.
 *
 * NOAA's feeds are public, need no key, and ask that clients poll politely --
 * hence the cache.
 */

const SWPC = "https://services.swpc.noaa.gov";

// NOAA payloads are third-party input and get validated like any other. The
// schemas are loose about extra fields (NOAA adds them) and strict about the
// ones we actually read.
const KpEntrySchema = z.object({
  time_tag: z.string(),
  Kp: z.coerce.number(),
});

const SolarProbabilitySchema = z.object({
  date: z.string(),
  c_class_1_day: z.coerce.number(),
  m_class_1_day: z.coerce.number(),
  x_class_1_day: z.coerce.number(),
});

const AlertSchema = z.object({
  product_id: z.string(),
  issue_datetime: z.string(),
  message: z.string(),
});

/**
 * NOAA's G-scale for geomagnetic storms, derived from Kp.
 * A published lookup, not an estimate.
 */
export function geomagneticStorm(kp) {
  if (kp >= 9) return { level: "G5", label: "Extreme", severity: 5 };
  if (kp >= 8) return { level: "G4", label: "Severe", severity: 4 };
  if (kp >= 7) return { level: "G3", label: "Strong", severity: 3 };
  if (kp >= 6) return { level: "G2", label: "Moderate", severity: 2 };
  if (kp >= 5) return { level: "G1", label: "Minor", severity: 1 };
  return { level: "G0", label: "Quiet", severity: 0 };
}

/**
 * Aurora visibility is the question most readers actually have about Kp.
 * These are rough geomagnetic-latitude rules of thumb, labelled as such.
 */
function auroraOutlook(kp) {
  if (kp >= 7) return "Aurora possible at mid-latitudes during darkness.";
  if (kp >= 5) return "Aurora possible at high latitudes; storm conditions.";
  if (kp >= 4) return "Aurora likely confined to polar regions.";
  return "Aurora unlikely outside the far north and far south.";
}

const kpCache = createCache({ ttlMs: 10 * 60 * 1000 });
const flareCache = createCache({ ttlMs: 30 * 60 * 1000 });
const alertCache = createCache({ ttlMs: 10 * 60 * 1000 });

/** Current planetary K index, plus a short recent history for context. */
async function loadKpIndex() {
  const raw = await fetchJson(`${SWPC}/products/noaa-planetary-k-index.json`);

  const entries = z.array(KpEntrySchema).parse(raw);
  if (entries.length === 0) throw new Error("NOAA returned no Kp readings");

  // NOAA orders oldest first, so the current value is the last one.
  const latest = entries[entries.length - 1];
  const recent = entries.slice(-24).map((entry) => ({
    time: entry.time_tag,
    kp: entry.Kp,
  }));

  return {
    kp: latest.Kp,
    observedAt: latest.time_tag,
    storm: geomagneticStorm(latest.Kp),
    aurora: auroraOutlook(latest.Kp),
    recent,
  };
}

/** NOAA's own flare forecast for the next 24 hours, as percentages. */
async function loadFlareForecast() {
  const raw = await fetchJson(`${SWPC}/json/solar_probabilities.json`);
  const entries = z.array(SolarProbabilitySchema).parse(raw);
  if (entries.length === 0) throw new Error("NOAA returned no flare forecast");

  // The feed is newest-first; pick the most recent date explicitly rather than
  // trusting the ordering.
  const latest = entries.reduce((a, b) => (b.date > a.date ? b : a));

  return {
    issuedFor: latest.date,
    cClassPercent: latest.c_class_1_day,
    mClassPercent: latest.m_class_1_day,
    xClassPercent: latest.x_class_1_day,
  };
}

/** Active SWPC watches, warnings and alerts. */
async function loadAlerts() {
  const raw = await fetchJson(`${SWPC}/products/alerts.json`);
  const entries = z.array(AlertSchema).parse(raw);

  return entries.slice(0, 5).map((alert) => ({
    id: alert.product_id,
    issuedAt: alert.issue_datetime,
    // The message is free text containing CRLF and NOAA's own formatting. It
    // is passed through as plain text and must never be rendered as HTML.
    summary: summariseAlert(alert.message),
  }));
}

/** Pull the human-readable headline out of NOAA's fixed-format message. */
function summariseAlert(message) {
  const line = message
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => /^(WARNING|ALERT|WATCH|SUMMARY|EXTENDED WARNING):/i.test(part));

  return (line ?? message.split(/\r?\n/).find(Boolean) ?? "").slice(0, 200);
}

/**
 * Everything the watchboard needs, in one call.
 *
 * Each feed is fetched and cached independently so one failing source does not
 * blank the whole board -- a NOAA outage on alerts should not hide the Kp
 * index that loaded fine.
 */
export async function getSpaceWeather() {
  const [kp, flares, alerts] = await Promise.allSettled([
    kpCache.get("kp", loadKpIndex),
    flareCache.get("flares", loadFlareForecast),
    alertCache.get("alerts", loadAlerts),
  ]);

  const unwrap = (settled) =>
    settled.status === "fulfilled"
      ? { ...settled.value, error: null }
      : { value: null, fetchedAt: null, stale: false, error: "Unavailable" };

  const geomagnetic = unwrap(kp);
  const flareForecast = unwrap(flares);
  const alertFeed = unwrap(alerts);

  return {
    geomagnetic: geomagnetic.value,
    flareForecast: flareForecast.value,
    alerts: alertFeed.value ?? [],
    meta: {
      source: "NOAA Space Weather Prediction Center",
      sourceUrl: "https://www.swpc.noaa.gov/",
      fetchedAt: geomagnetic.fetchedAt,
      stale: geomagnetic.stale || flareForecast.stale || alertFeed.stale,
      failures: [
        geomagnetic.error && "geomagnetic",
        flareForecast.error && "flareForecast",
        alertFeed.error && "alerts",
      ].filter(Boolean),
    },
  };
}

export const __testing = { summariseAlert, auroraOutlook };
