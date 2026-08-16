/**
 * Exoplanet characterisation.
 *
 * Everything here is computed, not learnt. Habitability has no training labels
 * -- we know of exactly one inhabited planet -- so a model claiming a
 * "habitability probability" would be reporting confidence about invented
 * ground truth. Each quantity below instead comes from a published
 * formulation, which makes it exact, checkable, and honest about what it is.
 *
 * Sources:
 *  - Earth Similarity Index: Schulze-Makuch et al. (2011), "A Two-Tiered
 *    Approach to Assessing the Habitability of Exoplanets", Astrobiology 11(10)
 *  - Habitable zone: Kopparapu et al. (2014), ApJ 787, L29
 *  - Mass-radius relation: Chen & Kipping (2017), ApJ 834, 17 ("Forecaster")
 */

// --- Reference values (Earth = 1 unless noted) -------------------------------

/** Earth's equilibrium temperature, K, at Bond albedo 0.3. */
export const EARTH_EQUILIBRIUM_TEMPERATURE_K = 255;

/** Equilibrium temperature at 1 S-earth with zero albedo, K. */
const ZERO_ALBEDO_TEMPERATURE_K = 278.5;

/** Earth's Bond albedo, the default when the caller does not supply one. */
export const EARTH_BOND_ALBEDO = 0.3;

// --- Planetary taxonomy ------------------------------------------------------

/**
 * Radius bins, in Earth radii. Boundaries chosen so the solar system's own
 * planets land where a reader expects: Mars 0.53 sub-Earth, Earth 1.0 terran,
 * Neptune 3.86 neptunian, Saturn 9.4 and Jupiter 11.2 jovian.
 */
const PLANET_CLASSES = [
  { label: "Sub-Earth", maxRadius: 0.8, description: "Smaller than Earth; likely thin or no atmosphere." },
  { label: "Terran", maxRadius: 1.25, description: "Earth-sized and plausibly rocky." },
  { label: "Super-Earth", maxRadius: 2.0, description: "Rocky but substantially more massive than Earth." },
  { label: "Mini-Neptune", maxRadius: 3.5, description: "Likely a thick hydrogen-helium envelope over a rocky core." },
  { label: "Neptunian", maxRadius: 8.0, description: "An ice giant comparable to Neptune or Uranus." },
  { label: "Jovian", maxRadius: Infinity, description: "A gas giant in the Jupiter and Saturn class." },
];

/** Classify a planet by radius alone. Deterministic, not a prediction. */
export function classifyPlanet(radiusEarths) {
  return PLANET_CLASSES.find((cls) => radiusEarths < cls.maxRadius);
}

export const planetClasses = PLANET_CLASSES.map(({ label, description }) => ({
  label,
  description,
}));

// --- Mass estimation ---------------------------------------------------------

// Forecaster gives radius as a function of mass, R = C * M^S, in three regimes.
// Inverting it lets us estimate mass from a radius, which is the direction a
// site visitor can actually supply.
const FORECASTER = {
  terran: { C: 1.008, S: 0.2790, maxRadius: 1.23 },
  neptunian: { C: 0.808, S: 0.589, maxRadius: 14.3 },
};

/**
 * Estimate mass from radius when the caller does not know it.
 *
 * Returns { massEarths, estimated: true, uncertain } -- `uncertain` marks the
 * giant-planet regime, where radius barely varies with mass (Jupiter and a
 * 5-Jupiter-mass planet are nearly the same size), so a radius simply does not
 * determine a mass there.
 */
export function estimateMass(radiusEarths) {
  if (radiusEarths < FORECASTER.terran.maxRadius) {
    const { C, S } = FORECASTER.terran;
    return { massEarths: (radiusEarths / C) ** (1 / S), estimated: true, uncertain: false };
  }

  if (radiusEarths < FORECASTER.neptunian.maxRadius) {
    const { C, S } = FORECASTER.neptunian;
    return { massEarths: (radiusEarths / C) ** (1 / S), estimated: true, uncertain: false };
  }

  // Degenerate regime: report Jupiter's mass as a placeholder and say plainly
  // that the radius does not constrain it.
  return { massEarths: 317.8, estimated: true, uncertain: true };
}

// --- Thermodynamics ----------------------------------------------------------

/**
 * Equilibrium temperature from insolation flux.
 * T_eq = 278.5 K * (S * (1 - A))^(1/4), which returns 255 K for Earth.
 */
export function equilibriumTemperature(insolationFlux, bondAlbedo = EARTH_BOND_ALBEDO) {
  return ZERO_ALBEDO_TEMPERATURE_K * (insolationFlux * (1 - bondAlbedo)) ** 0.25;
}

// --- Earth Similarity Index --------------------------------------------------

/** One ESI term: 1 - |(x - x0) / (x + x0)|, raised to its weighted exponent. */
const esiTerm = (value, reference, weight, parameterCount) => {
  const similarity = 1 - Math.abs((value - reference) / (value + reference));
  return similarity ** (weight / parameterCount);
};

/**
 * Earth Similarity Index, 0 to 1.
 *
 * The two-tier formulation: an interior index over radius and density, a
 * surface index over escape velocity and temperature, combined as their
 * geometric mean.
 *
 * One deliberate deviation, stated in the output: the published index uses
 * *surface* temperature against Earth's 288 K. Surface temperature is unknown
 * for essentially every exoplanet, so this compares equilibrium temperatures
 * instead, against Earth's 255 K. That is like for like; mixing a planet's
 * equilibrium temperature with Earth's surface temperature would silently
 * penalise every planet by the size of Earth's greenhouse effect.
 */
export function earthSimilarityIndex({ radiusEarths, massEarths, equilibriumTemperatureK }) {
  // Both derived from mass and radius, in Earth units.
  const densityEarths = massEarths / radiusEarths ** 3;
  const escapeVelocityEarths = Math.sqrt(massEarths / radiusEarths);

  const interior =
    esiTerm(radiusEarths, 1, 0.57, 2) * esiTerm(densityEarths, 1, 1.07, 2);

  const surface =
    esiTerm(escapeVelocityEarths, 1, 0.7, 2) *
    esiTerm(equilibriumTemperatureK, EARTH_EQUILIBRIUM_TEMPERATURE_K, 5.58, 2);

  return {
    esi: Math.sqrt(interior * surface),
    interiorEsi: interior,
    surfaceEsi: surface,
    densityEarths,
    escapeVelocityEarths,
  };
}

// --- Habitable zone ----------------------------------------------------------

// Kopparapu et al. (2014), Table 1. Each boundary's effective stellar flux is
// a quartic in (T_eff - 5780 K).
const HZ_BOUNDARIES = {
  recentVenus: { seff: 1.776, a: 2.136e-4, b: 2.533e-8, c: -1.332e-11, d: -3.097e-15 },
  runawayGreenhouse: { seff: 1.107, a: 1.332e-4, b: 1.58e-8, c: -8.308e-12, d: -1.931e-15 },
  maximumGreenhouse: { seff: 0.356, a: 6.171e-5, b: 1.698e-9, c: -3.198e-12, d: -5.575e-16 },
  earlyMars: { seff: 0.32, a: 5.547e-5, b: 1.526e-9, c: -2.874e-12, d: -5.011e-16 },
};

/** Temperature range over which the Kopparapu polynomials are valid, K. */
export const HZ_VALID_TEMPERATURE_RANGE = { min: 2600, max: 7200 };

const effectiveFlux = ({ seff, a, b, c, d }, deltaT) =>
  seff + a * deltaT + b * deltaT ** 2 + c * deltaT ** 3 + d * deltaT ** 4;

/**
 * Habitable zone bounds in AU for a star of given effective temperature and
 * luminosity.
 *
 * Returns both the conservative zone (runaway greenhouse to maximum
 * greenhouse) and the optimistic zone (recent Venus to early Mars), because
 * the difference between them is a real scientific disagreement, not a detail
 * to paper over by picking one.
 */
export function habitableZone({ stellarTemperatureK, stellarLuminositySuns }) {
  const deltaT = stellarTemperatureK - 5780;
  const distance = (boundary) =>
    Math.sqrt(stellarLuminositySuns / effectiveFlux(boundary, deltaT));

  return {
    conservative: {
      innerAU: distance(HZ_BOUNDARIES.runawayGreenhouse),
      outerAU: distance(HZ_BOUNDARIES.maximumGreenhouse),
    },
    optimistic: {
      innerAU: distance(HZ_BOUNDARIES.recentVenus),
      outerAU: distance(HZ_BOUNDARIES.earlyMars),
    },
    extrapolated:
      stellarTemperatureK < HZ_VALID_TEMPERATURE_RANGE.min ||
      stellarTemperatureK > HZ_VALID_TEMPERATURE_RANGE.max,
  };
}

/**
 * Whether a given insolation places the planet inside the habitable zone.
 * Compares fluxes rather than distances, so it needs no orbital distance.
 */
export function habitableZonePosition({ insolationFlux, stellarTemperatureK }) {
  const deltaT = stellarTemperatureK - 5780;
  const inner = effectiveFlux(HZ_BOUNDARIES.runawayGreenhouse, deltaT);
  const outer = effectiveFlux(HZ_BOUNDARIES.maximumGreenhouse, deltaT);
  const optimisticInner = effectiveFlux(HZ_BOUNDARIES.recentVenus, deltaT);
  const optimisticOuter = effectiveFlux(HZ_BOUNDARIES.earlyMars, deltaT);

  // Higher flux means closer to the star, so the inner edge is the larger value.
  if (insolationFlux <= inner && insolationFlux >= outer) return "conservative";
  if (insolationFlux <= optimisticInner && insolationFlux >= optimisticOuter) {
    return "optimistic";
  }
  return insolationFlux > optimisticInner ? "too-hot" : "too-cold";
}

// --- Orbit -------------------------------------------------------------------

/**
 * Semi-major axis in AU from Kepler's third law.
 * a^3 = M_star * P^2, with P in years and masses in solar units.
 */
export function semiMajorAxis({ orbitalPeriodDays, stellarMassSuns }) {
  const periodYears = orbitalPeriodDays / 365.25;
  return (stellarMassSuns * periodYears ** 2) ** (1 / 3);
}

// --- Top level ---------------------------------------------------------------

/**
 * Full characterisation of one planet.
 * Every field is derived; nothing here is a model output.
 */
export function characteriseExoplanet(input) {
  const {
    radiusEarths,
    insolationFlux,
    massEarths: providedMass,
    bondAlbedo = EARTH_BOND_ALBEDO,
    stellarTemperatureK,
    orbitalPeriodDays,
    stellarMassSuns,
    stellarLuminositySuns,
  } = input;

  const mass = providedMass
    ? { massEarths: providedMass, estimated: false, uncertain: false }
    : estimateMass(radiusEarths);

  const equilibriumTemperatureK = equilibriumTemperature(insolationFlux, bondAlbedo);

  const similarity = earthSimilarityIndex({
    radiusEarths,
    massEarths: mass.massEarths,
    equilibriumTemperatureK,
  });

  const classification = classifyPlanet(radiusEarths);

  const notes = [];

  // The single most important caveat on this whole calculation, and the one a
  // reader is least likely to supply themselves.
  //
  // Equilibrium temperature ignores greenhouse warming entirely. Venus has
  // roughly Earth's radius and a *lower* equilibrium temperature than Earth
  // (227 K), so it scores about 0.90 here -- while its actual surface sits at
  // 737 K under a runaway greenhouse. A high ESI therefore means "similar in
  // the properties we can measure", never "habitable".
  notes.push(
    "ESI compares equilibrium temperature, which ignores greenhouse warming. Venus scores about 0.90 on this measure despite a 737 K surface, so a high score means Earth-like in bulk properties, not habitable."
  );

  if (mass.estimated) {
    notes.push(
      mass.uncertain
        ? "Mass was estimated from radius, but radius barely constrains mass for giant planets -- treat the density and escape velocity terms as indicative only."
        : "Mass was estimated from radius using the Chen & Kipping (2017) relation; supplying a measured mass will sharpen the result."
    );
  }

  const result = {
    input: { ...input, bondAlbedo },
    mass,
    equilibriumTemperatureK,
    classification,
    similarity,
    notes,
  };

  // Optional extras, only when the caller supplied the stellar context.
  if (typeof stellarTemperatureK === "number") {
    result.habitableZonePosition = habitableZonePosition({
      insolationFlux,
      stellarTemperatureK,
    });

    if (typeof stellarLuminositySuns === "number") {
      const zone = habitableZone({ stellarTemperatureK, stellarLuminositySuns });
      result.habitableZone = zone;
      if (zone.extrapolated) {
        notes.push(
          `The habitable zone model is calibrated for stars between ${HZ_VALID_TEMPERATURE_RANGE.min} K and ${HZ_VALID_TEMPERATURE_RANGE.max} K; these bounds are extrapolated.`
        );
      }
    }
  }

  if (typeof orbitalPeriodDays === "number" && typeof stellarMassSuns === "number") {
    result.semiMajorAxisAU = semiMajorAxis({ orbitalPeriodDays, stellarMassSuns });
  }

  return result;
}
