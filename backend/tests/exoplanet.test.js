import { describe, it, expect } from "vitest";
import {
  characteriseExoplanet,
  classifyPlanet,
  earthSimilarityIndex,
  equilibriumTemperature,
  estimateMass,
  habitableZone,
  habitableZonePosition,
  semiMajorAxis,
  EARTH_EQUILIBRIUM_TEMPERATURE_K,
} from "../services/exoplanet.js";
import { ExoplanetInputSchema } from "../schemas/exoplanet.js";

describe("Earth Similarity Index", () => {
  // The defining property of the index: Earth is the reference, so it must
  // score exactly 1. Any drift here means a term or weight is wrong.
  it("gives Earth exactly 1", () => {
    const { esi } = earthSimilarityIndex({
      radiusEarths: 1,
      massEarths: 1,
      equilibriumTemperatureK: EARTH_EQUILIBRIUM_TEMPERATURE_K,
    });
    expect(esi).toBeCloseTo(1, 10);
  });

  it("reproduces the published value for Mars", () => {
    const { esi } = earthSimilarityIndex({
      radiusEarths: 0.532,
      massEarths: 0.107,
      equilibriumTemperatureK: 210,
    });
    // Published ESI for Mars is ~0.70; this uses equilibrium rather than
    // surface temperature, so a small offset is expected and acceptable.
    expect(esi).toBeGreaterThan(0.65);
    expect(esi).toBeLessThan(0.78);
  });

  it("stays within 0 and 1 for extreme planets", () => {
    const hotJupiter = earthSimilarityIndex({
      radiusEarths: 11.2,
      massEarths: 317.8,
      equilibriumTemperatureK: 1500,
    });
    expect(hotJupiter.esi).toBeGreaterThan(0);
    expect(hotJupiter.esi).toBeLessThan(1);
  });

  it("falls as a planet departs from Earth in any single property", () => {
    const base = { radiusEarths: 1, massEarths: 1, equilibriumTemperatureK: 255 };
    const hotter = earthSimilarityIndex({ ...base, equilibriumTemperatureK: 400 });
    const bigger = earthSimilarityIndex({ ...base, radiusEarths: 2 });
    expect(hotter.esi).toBeLessThan(1);
    expect(bigger.esi).toBeLessThan(1);
  });

  it("derives density and escape velocity in Earth units", () => {
    const result = earthSimilarityIndex({
      radiusEarths: 2,
      massEarths: 8,
      equilibriumTemperatureK: 255,
    });
    // rho = M / R^3 = 8 / 8 = 1; v_esc = sqrt(M / R) = sqrt(4) = 2
    expect(result.densityEarths).toBeCloseTo(1, 10);
    expect(result.escapeVelocityEarths).toBeCloseTo(2, 10);
  });
});

describe("equilibrium temperature", () => {
  it("returns Earth's 255 K at one solar flux", () => {
    expect(equilibriumTemperature(1)).toBeCloseTo(255, 0);
  });

  it("scales as the fourth root of flux", () => {
    // Sixteen times the flux is twice the temperature.
    expect(equilibriumTemperature(16, 0) / equilibriumTemperature(1, 0)).toBeCloseTo(2, 6);
  });

  it("is colder for a more reflective planet", () => {
    expect(equilibriumTemperature(1, 0.8)).toBeLessThan(equilibriumTemperature(1, 0));
  });
});

describe("habitable zone (Kopparapu 2014)", () => {
  it("reproduces the Sun's conservative zone", () => {
    const { conservative } = habitableZone({
      stellarTemperatureK: 5780,
      stellarLuminositySuns: 1,
    });
    // Published: 0.95 - 1.68 AU.
    expect(conservative.innerAU).toBeCloseTo(0.95, 2);
    expect(conservative.outerAU).toBeCloseTo(1.68, 1);
  });

  it("puts the optimistic zone outside the conservative one on both edges", () => {
    const { conservative, optimistic } = habitableZone({
      stellarTemperatureK: 5780,
      stellarLuminositySuns: 1,
    });
    expect(optimistic.innerAU).toBeLessThan(conservative.innerAU);
    expect(optimistic.outerAU).toBeGreaterThan(conservative.outerAU);
  });

  it("scales with the square root of luminosity", () => {
    const dim = habitableZone({ stellarTemperatureK: 5780, stellarLuminositySuns: 1 });
    const bright = habitableZone({ stellarTemperatureK: 5780, stellarLuminositySuns: 4 });
    expect(bright.conservative.innerAU / dim.conservative.innerAU).toBeCloseTo(2, 3);
  });

  it("flags extrapolation outside the calibrated temperature range", () => {
    expect(habitableZone({ stellarTemperatureK: 5780, stellarLuminositySuns: 1 }).extrapolated).toBe(false);
    expect(habitableZone({ stellarTemperatureK: 9000, stellarLuminositySuns: 1 }).extrapolated).toBe(true);
    expect(habitableZone({ stellarTemperatureK: 2000, stellarLuminositySuns: 1 }).extrapolated).toBe(true);
  });

  it("places Earth, Venus and Mars correctly relative to the zone", () => {
    const sun = { stellarTemperatureK: 5780 };
    expect(habitableZonePosition({ ...sun, insolationFlux: 1 })).toBe("conservative");
    expect(habitableZonePosition({ ...sun, insolationFlux: 1.91 })).toBe("too-hot"); // Venus
    expect(habitableZonePosition({ ...sun, insolationFlux: 0.43 })).toBe("conservative"); // Mars
    expect(habitableZonePosition({ ...sun, insolationFlux: 0.01 })).toBe("too-cold");
  });
});

describe("planet taxonomy", () => {
  it.each([
    ["Mars", 0.532, "Sub-Earth"],
    ["Earth", 1.0, "Terran"],
    ["a super-Earth", 1.6, "Super-Earth"],
    ["a mini-Neptune", 2.5, "Mini-Neptune"],
    ["Neptune", 3.86, "Neptunian"],
    ["Uranus", 4.01, "Neptunian"],
    ["Saturn", 9.45, "Jovian"],
    ["Jupiter", 11.21, "Jovian"],
  ])("classifies %s correctly", (_name, radius, expected) => {
    expect(classifyPlanet(radius).label).toBe(expected);
  });

  it("returns a class for any positive radius", () => {
    expect(classifyPlanet(0.01)).toBeDefined();
    expect(classifyPlanet(25)).toBeDefined();
  });
});

describe("mass estimation", () => {
  it("recovers roughly Earth's mass from Earth's radius", () => {
    const { massEarths, estimated } = estimateMass(1);
    expect(estimated).toBe(true);
    expect(massEarths).toBeGreaterThan(0.8);
    expect(massEarths).toBeLessThan(1.3);
  });

  it("increases with radius", () => {
    expect(estimateMass(2).massEarths).toBeGreaterThan(estimateMass(1).massEarths);
  });

  // Radius barely constrains mass for gas giants; the flag exists so the UI
  // can say so instead of implying false precision.
  it("marks the giant-planet regime as uncertain", () => {
    expect(estimateMass(1).uncertain).toBe(false);
    expect(estimateMass(15).uncertain).toBe(true);
  });
});

describe("semi-major axis", () => {
  it("returns 1 AU for Earth's orbit around the Sun", () => {
    expect(semiMajorAxis({ orbitalPeriodDays: 365.25, stellarMassSuns: 1 })).toBeCloseTo(1, 6);
  });

  it("returns Jupiter's distance from its period", () => {
    // Jupiter: 4332.6 days, ~5.20 AU
    expect(semiMajorAxis({ orbitalPeriodDays: 4332.6, stellarMassSuns: 1 })).toBeCloseTo(5.2, 1);
  });
});

describe("characteriseExoplanet", () => {
  const earthLike = { radiusEarths: 1, insolationFlux: 1, massEarths: 1 };

  it("scores an Earth analogue near 1", () => {
    const result = characteriseExoplanet(earthLike);
    expect(result.similarity.esi).toBeCloseTo(1, 2);
    expect(result.classification.label).toBe("Terran");
  });

  it("always carries the greenhouse caveat", () => {
    // The Venus case: high ESI does not mean habitable, and the output must
    // say so rather than leaving the reader to infer it.
    const result = characteriseExoplanet(earthLike);
    expect(result.notes.join(" ")).toMatch(/greenhouse/i);
    expect(result.notes.join(" ")).toMatch(/venus/i);
  });

  it("notes when mass was estimated rather than measured", () => {
    const estimated = characteriseExoplanet({ radiusEarths: 1, insolationFlux: 1 });
    expect(estimated.mass.estimated).toBe(true);
    expect(estimated.notes.join(" ")).toMatch(/estimated from radius/i);

    const measured = characteriseExoplanet(earthLike);
    expect(measured.mass.estimated).toBe(false);
  });

  it("omits stellar context when the star is not described", () => {
    const result = characteriseExoplanet(earthLike);
    expect(result.habitableZone).toBeUndefined();
    expect(result.habitableZonePosition).toBeUndefined();
  });

  it("includes the habitable zone when the star is described", () => {
    const result = characteriseExoplanet({
      ...earthLike,
      stellarTemperatureK: 5780,
      stellarLuminositySuns: 1,
    });
    expect(result.habitableZone.conservative.innerAU).toBeCloseTo(0.95, 2);
    expect(result.habitableZonePosition).toBe("conservative");
  });

  it("computes the orbit when period and stellar mass are given", () => {
    const result = characteriseExoplanet({
      ...earthLike,
      orbitalPeriodDays: 365.25,
      stellarMassSuns: 1,
    });
    expect(result.semiMajorAxisAU).toBeCloseTo(1, 6);
  });
});

describe("ExoplanetInputSchema", () => {
  const valid = { radiusEarths: 1, insolationFlux: 1 };

  it("accepts the minimum viable input", () => {
    expect(ExoplanetInputSchema.safeParse(valid).success).toBe(true);
  });

  it("coerces numeric strings from a form", () => {
    const parsed = ExoplanetInputSchema.parse({ radiusEarths: "1.5", insolationFlux: "0.8" });
    expect(parsed.radiusEarths).toBe(1.5);
  });

  it.each([
    ["a negative radius", { ...valid, radiusEarths: -1 }],
    ["a zero radius", { ...valid, radiusEarths: 0 }],
    ["a negative insolation", { ...valid, insolationFlux: -0.5 }],
    ["a non-numeric radius", { ...valid, radiusEarths: "big" }],
    ["an infinite radius", { ...valid, radiusEarths: Infinity }],
    ["a negative albedo", { ...valid, bondAlbedo: -0.1 }],
    ["a perfectly reflective albedo", { ...valid, bondAlbedo: 1 }],
    ["a negative stellar temperature", { ...valid, stellarTemperatureK: -100 }],
    ["absolute zero for the star", { ...valid, stellarTemperatureK: 0 }],
    ["an unknown field", { ...valid, sneaky: true }],
  ])("rejects %s", (_label, input) => {
    expect(ExoplanetInputSchema.safeParse(input).success).toBe(false);
  });

  it("explains the objection in the message", () => {
    const result = ExoplanetInputSchema.safeParse({ ...valid, radiusEarths: -3 });
    expect(result.error.issues[0].message).toMatch(/greater than zero/i);
  });
});
