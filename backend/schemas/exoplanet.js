import { z } from "zod";

/**
 * Input contract for the exoplanet calculator.
 *
 * The bounds are physics, not arbitrary guard rails: insolation and radius are
 * strictly positive quantities, albedo is a reflected fraction and so lies in
 * [0, 1), and a temperature cannot fall below absolute zero. Rejecting these
 * here means the formulas downstream never have to defend against them.
 */

/** Coerce so an HTML form's strings arrive as numbers without client help. */
const positive = (max, label) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number.` })
    .finite(`${label} must be a real number.`)
    .positive(`${label} must be greater than zero.`)
    .max(max, `${label} is implausibly large.`);

export const ExoplanetInputSchema = z
  .object({
    // Larger than any confirmed planet; beyond ~25 R-earth an object is a star.
    radiusEarths: positive(30, "Planetary radius"),

    // Hot Jupiters reach a few thousand times Earth's insolation.
    insolationFlux: positive(10_000, "Insolation flux"),

    // Optional: a measured mass beats one estimated from radius.
    massEarths: positive(20_000, "Planetary mass").optional(),

    // A perfect reflector (1) would absorb nothing and sit at absolute zero,
    // so the upper bound is exclusive.
    bondAlbedo: z.coerce
      .number()
      .min(0, "Bond albedo cannot be negative.")
      .lt(1, "Bond albedo must be below 1.")
      .optional(),

    // Kopparapu's polynomials cover 2600-7200 K; values outside are accepted
    // but flagged as extrapolated rather than silently trusted.
    stellarTemperatureK: positive(60_000, "Host star temperature").optional(),
    stellarLuminositySuns: positive(1_000_000, "Host star luminosity").optional(),
    stellarMassSuns: positive(200, "Host star mass").optional(),

    orbitalPeriodDays: positive(4_000_000, "Orbital period").optional(),
  })
  .strict();

export const PLANET_INPUT_FIELDS = Object.keys(ExoplanetInputSchema.shape);
