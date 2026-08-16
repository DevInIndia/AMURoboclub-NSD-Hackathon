import express from "express";
import { characteriseExoplanet, planetClasses, HZ_VALID_TEMPERATURE_RANGE } from "../services/exoplanet.js";
import { ExoplanetInputSchema } from "../schemas/exoplanet.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import wrapAsync from "../utils/wrapAsync.js";
import ExpressError from "../utils/ExpressError.js";

const router = express.Router();

// Reference values so the frontend can label its inputs and offer presets
// without hard-coding numbers that would drift from the calculator.
router.get("/options", (req, res) => {
  res.json({
    planetClasses,
    habitableZoneValidRange: HZ_VALID_TEMPERATURE_RANGE,
    method: {
      esi: "Schulze-Makuch et al. (2011), two-tier formulation",
      habitableZone: "Kopparapu et al. (2014)",
      massRadius: "Chen & Kipping (2017)",
    },
  });
});

// No Gemini call here: every figure is computed from published formulas, so
// this route is cheap and needs no AI rate limit -- only the general one.
router.post(
  "/",
  requireAuth,
  wrapAsync(async (req, res) => {
    const parsed = ExoplanetInputSchema.safeParse(req.body);

    if (!parsed.success) {
      // Surface the first physical objection rather than a schema dump.
      const [issue] = parsed.error.issues;
      throw new ExpressError(400, issue.message);
    }

    res.json(characteriseExoplanet(parsed.data));
  })
);

export default router;
