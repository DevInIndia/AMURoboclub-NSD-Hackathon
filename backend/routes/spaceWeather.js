import express from "express";
import { getSpaceWeather } from "../services/spaceWeather.js";
import { getNearEarthObjects } from "../services/nearEarthObjects.js";
import wrapAsync from "../utils/wrapAsync.js";

const router = express.Router();

/**
 * Public, because the Stargazing page they feed is public.
 *
 * Being public and proxying a rate-limited third party is the risk here: a
 * flood could exhaust NASA's quota for everyone. The caches in each service
 * make that impossible -- once a value is cached, extra traffic is served from
 * memory and never reaches the upstream -- and the general limiter still caps
 * request volume.
 */

router.get(
  "/",
  wrapAsync(async (req, res) => {
    res.json(await getSpaceWeather());
  })
);

router.get(
  "/asteroids",
  wrapAsync(async (req, res) => {
    // Clamped inside the service; NeoWs rejects windows longer than 7 days.
    res.json(await getNearEarthObjects({ days: req.query.days }));
  })
);

export default router;
