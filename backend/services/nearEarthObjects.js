import { z } from "zod";
import { createCache, fetchJson } from "./cache.js";

/**
 * Near-Earth object close approaches, from NASA's NeoWs.
 *
 * A word on framing, because this is the easiest feature in the project to
 * make dishonest.
 *
 * "Potentially Hazardous Asteroid" is a *filing category*, not a warning. An
 * object earns the label by having a minimum orbit intersection distance under
 * 0.05 AU and an absolute magnitude brighter than 22 -- meaning "big enough
 * and close enough to be worth tracking for the next century". It does not
 * mean the object is on course to hit anything. Presenting a PHA list as a
 * threat board would be alarming and wrong, so the API returns the criteria
 * alongside the flag and the UI states them.
 *
 * The Torino Scale is deliberately absent. It is a defined function of impact
 * probability and kinetic energy, and NeoWs supplies no impact probability --
 * that lives in JPL's separate Sentry system, and these routine close
 * approaches are not on it. Computing a Torino value here would mean inventing
 * the probability, so the code reports kinetic energy alone and says why.
 */

const NEO_API = "https://api.nasa.gov/neo/rest/v1/feed";

// A typical stony asteroid. Real densities span roughly 1,000 (rubble pile) to
// 8,000 (iron), so energies below are order-of-magnitude, and labelled so.
const ASSUMED_DENSITY_KG_M3 = 3000;
const JOULES_PER_MEGATON_TNT = 4.184e15;

const NeoSchema = z.object({
  id: z.string(),
  name: z.string(),
  absolute_magnitude_h: z.coerce.number(),
  is_potentially_hazardous_asteroid: z.boolean(),
  nasa_jpl_url: z.string().url().optional(),
  estimated_diameter: z.object({
    meters: z.object({
      estimated_diameter_min: z.coerce.number(),
      estimated_diameter_max: z.coerce.number(),
    }),
  }),
  close_approach_data: z
    .array(
      z.object({
        close_approach_date_full: z.string().nullable().optional(),
        close_approach_date: z.string(),
        relative_velocity: z.object({ kilometers_per_second: z.coerce.number() }),
        miss_distance: z.object({
          kilometers: z.coerce.number(),
          lunar: z.coerce.number(),
        }),
      })
    )
    .min(1),
});

const FeedSchema = z.object({
  element_count: z.coerce.number(),
  near_earth_objects: z.record(z.string(), z.array(NeoSchema)),
});

/**
 * Kinetic energy of an impact, in megatons of TNT.
 *
 * Deterministic given diameter, velocity and an assumed density -- which is
 * the catch, and why the assumption is returned with the number. This is the
 * energy the object *carries*, not a prediction that it will be delivered.
 */
export function kineticEnergyMegatons({ diameterMetres, velocityKmPerSecond }) {
  const radius = diameterMetres / 2;
  const volume = (4 / 3) * Math.PI * radius ** 3;
  const mass = volume * ASSUMED_DENSITY_KG_M3;
  const velocity = velocityKmPerSecond * 1000;
  return (0.5 * mass * velocity ** 2) / JOULES_PER_MEGATON_TNT;
}

const cache = createCache({ ttlMs: 60 * 60 * 1000 });

const isoDate = (date) => date.toISOString().slice(0, 10);

/**
 * NASA returns most numbers as strings. The schema coerces them, but this
 * function coerces again rather than assuming it was handed parsed input --
 * an implicit "must be validated first" precondition is the kind of thing that
 * silently breaks when a caller is added later.
 */
function normalise(neo) {
  const { meters } = neo.estimated_diameter;
  const approach = neo.close_approach_data[0];

  const diameterMin = Number(meters.estimated_diameter_min);
  const diameterMax = Number(meters.estimated_diameter_max);
  const diameterAverage = (diameterMin + diameterMax) / 2;
  const velocity = Number(approach.relative_velocity.kilometers_per_second);

  return {
    id: neo.id,
    name: neo.name,
    absoluteMagnitudeH: Number(neo.absolute_magnitude_h),
    isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
    jplUrl: neo.nasa_jpl_url ?? null,
    diameterMinMetres: diameterMin,
    diameterMaxMetres: diameterMax,
    velocityKmPerSecond: velocity,
    missDistanceKm: Number(approach.miss_distance.kilometers),
    missDistanceLunar: Number(approach.miss_distance.lunar),
    approachDate: approach.close_approach_date_full ?? approach.close_approach_date,
    kineticEnergyMegatons: kineticEnergyMegatons({
      diameterMetres: diameterAverage,
      velocityKmPerSecond: velocity,
    }),
  };
}

async function loadFeed(days) {
  const key = process.env.NASA_API_KEY || "DEMO_KEY";
  const start = new Date();
  const end = new Date(start.getTime() + (days - 1) * 86_400_000);

  const url =
    `${NEO_API}?start_date=${isoDate(start)}&end_date=${isoDate(end)}` +
    `&api_key=${encodeURIComponent(key)}`;

  const raw = await fetchJson(url, { timeoutMs: 15_000 });
  const feed = FeedSchema.parse(raw);

  const objects = Object.values(feed.near_earth_objects)
    .flat()
    .map(normalise)
    // Closest approach first: that is the ordering a reader expects.
    .sort((a, b) => a.missDistanceLunar - b.missDistanceLunar);

  return {
    objects,
    totalCount: feed.element_count,
    hazardousCount: objects.filter((o) => o.isPotentiallyHazardous).length,
    windowDays: days,
  };
}

/** Close approaches over the next `days` days (NeoWs allows at most 7). */
export async function getNearEarthObjects({ days = 7 } = {}) {
  const window = Math.min(Math.max(Number(days) || 7, 1), 7);
  const { value, fetchedAt, stale } = await cache.get(`neo-${window}`, () =>
    loadFeed(window)
  );

  return {
    ...value,
    meta: {
      source: "NASA Near Earth Object Web Service",
      sourceUrl: "https://cneos.jpl.nasa.gov/",
      fetchedAt,
      stale,
      usingDemoKey: !process.env.NASA_API_KEY,
      assumptions: {
        density: `Kinetic energy assumes a stony asteroid at ${ASSUMED_DENSITY_KG_M3} kg/m³; real densities span roughly 1,000 to 8,000, so treat it as order-of-magnitude.`,
        hazardous:
          "'Potentially hazardous' means the orbit passes within 0.05 AU and the object is brighter than magnitude 22. It is a tracking category, not a prediction of impact.",
        torino:
          "No Torino Scale value is shown: it requires an impact probability, which NeoWs does not provide and these routine approaches do not have.",
      },
    },
  };
}

export const __testing = { normalise, loadFeed, cache };
