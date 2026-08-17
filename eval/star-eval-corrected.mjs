import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { classifyStar } from "../backend/services/starModel.js";

/**
 * Corrected star evaluation.
 *
 * The first pass fed the classifier Gaia GSP-Phot parameters for every class
 * and scored 54%. Inspecting the inputs showed why that number is meaningless
 * for three of the five classes: GSP-Phot fits main-sequence-like models, so
 * it reported white dwarfs at ~1 solar radius and 11 solar luminosities when
 * the truth is ~0.01 and ~0.001. The model was being handed physically
 * impossible stars and blamed for the answer.
 *
 * This pass uses a source that actually models each class:
 *
 *  - White dwarfs: Gentile Fusillo et al. (2021) Gaia white dwarf catalogue,
 *    which fits white dwarf atmospheres. Radius comes from surface gravity and
 *    mass, which is exact: g = GM/R^2.
 *  - Supergiants and brown dwarfs: published values for well-studied objects,
 *    since neither is reliably catalogued at scale.
 *  - Main sequence and red dwarfs: Gaia, which is validated for them.
 */

const here = dirname(fileURLToPath(import.meta.url));

// Physical constants in SI, for deriving radius from surface gravity.
const G = 6.674e-11;
const SOLAR_MASS = 1.989e30;
const SOLAR_RADIUS = 6.957e8;
const SUN_TEFF = 5772;

/** R = sqrt(GM/g), with logg in cgs. Exact, not an approximation. */
function radiusFromLogg(loggCgs, massSolar) {
  const g = 10 ** loggCgs / 100; // cgs cm/s^2 -> SI m/s^2
  const mass = massSolar * SOLAR_MASS;
  return Math.sqrt((G * mass) / g) / SOLAR_RADIUS;
}

const luminosity = (radiusSolar, teff) => radiusSolar ** 2 * (teff / SUN_TEFF) ** 4;

/** Absolute bolometric magnitude from luminosity; M_bol_sun = 4.74. */
const absoluteMagnitude = (lum) => 4.74 - 2.5 * Math.log10(lum);

function colourFromTemperature(teff) {
  if (teff >= 30000) return "Blue";
  if (teff >= 10000) return "Blue-White";
  if (teff >= 7500) return "White";
  if (teff >= 6000) return "Yellowish White";
  if (teff >= 5200) return "Yellowish";
  if (teff >= 4400) return "Pale Yellow Orange";
  if (teff >= 3700) return "Orange";
  if (teff >= 3000) return "Orange-Red";
  return "Red";
}

const spectralLetter = (teff) => {
  if (teff >= 30000) return "O";
  if (teff >= 10000) return "B";
  if (teff >= 7500) return "A";
  if (teff >= 6000) return "F";
  if (teff >= 5200) return "G";
  if (teff >= 3700) return "K";
  return "M";
};

// ---- White dwarfs, from the dedicated catalogue ------------------------------

function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const headers = head.split(",");
  return lines.filter(Boolean).map((line) => {
    const values = line.match(/("[^"]*"|[^,]*)/g).filter((_, i) => i % 2 === 0);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").replace(/^"|"$/g, "").trim()]));
  });
}

const whiteDwarfs = parseCsv(readFileSync(join(here, "data/white-dwarfs.csv"), "utf-8"))
  .map((row) => {
    const teff = Number(row.TeffH);
    const radius = radiusFromLogg(Number(row.loggH), Number(row.MassH));
    const lum = luminosity(radius, teff);
    return {
      name: row.WDJname,
      truth: "White Dwarf",
      input: {
        temperature: teff,
        luminosity: lum,
        radius,
        absoluteMagnitude: absoluteMagnitude(lum),
        color: colourFromTemperature(teff),
        spectralClass: spectralLetter(teff),
      },
    };
  })
  .filter((s) => Number.isFinite(s.input.radius) && s.input.radius > 0);

// ---- Supergiants and brown dwarfs, from published measurements ---------------

/**
 * Well-studied objects with values from the literature. Small n, but every
 * figure is a published measurement rather than a pipeline extrapolation --
 * which is the whole point after the first pass.
 */
const LITERATURE = [
  // Supergiants: temperature, radius and luminosity from interferometry and
  // spectroscopy.
  { name: "Betelgeuse", truth: "Supergiant", teff: 3600, radius: 887, lum: 126000 },
  { name: "Rigel", truth: "Supergiant", teff: 12100, radius: 78.9, lum: 120000 },
  { name: "Antares", truth: "Supergiant", teff: 3660, radius: 680, lum: 75900 },
  { name: "Deneb", truth: "Supergiant", teff: 8525, radius: 203, lum: 196000 },
  { name: "Canopus", truth: "Supergiant", teff: 7400, radius: 71, lum: 10700 },
  { name: "Polaris", truth: "Supergiant", teff: 6015, radius: 37.5, lum: 1260 },
  { name: "Mu Cephei", truth: "Supergiant", teff: 3750, radius: 972, lum: 269000 },
  { name: "VY Canis Majoris", truth: "Hypergiant", teff: 3490, radius: 1420, lum: 270000 },
  { name: "Rho Cassiopeiae", truth: "Hypergiant", teff: 7300, radius: 636, lum: 500000 },
  { name: "Eta Carinae A", truth: "Hypergiant", teff: 9400, radius: 240, lum: 5000000 },

  // Brown dwarfs: radii near Jupiter's, luminosities a millionth of the Sun's.
  { name: "Luhman 16A", truth: "Brown Dwarf", teff: 1350, radius: 0.1, lum: 2.2e-5 },
  { name: "Luhman 16B", truth: "Brown Dwarf", teff: 1210, radius: 0.1, lum: 1.4e-5 },
  { name: "WISE 0855-0714", truth: "Brown Dwarf", teff: 250, radius: 0.1, lum: 1.4e-8 },
  { name: "Teide 1", truth: "Brown Dwarf", teff: 2600, radius: 0.12, lum: 5.8e-4 },
  { name: "Gliese 229B", truth: "Brown Dwarf", teff: 927, radius: 0.1, lum: 6.4e-6 },
  { name: "2MASS J0523-1403", truth: "Brown Dwarf", teff: 2074, radius: 0.086, lum: 1.3e-4 },
  { name: "Epsilon Indi Ba", truth: "Brown Dwarf", teff: 1300, radius: 0.1, lum: 1.9e-5 },
  { name: "SIMP J0136", truth: "Brown Dwarf", teff: 1100, radius: 0.11, lum: 1.1e-5 },
].map((star) => ({
  name: star.name,
  truth: star.truth,
  input: {
    temperature: star.teff,
    luminosity: star.lum,
    radius: star.radius,
    absoluteMagnitude: absoluteMagnitude(star.lum),
    color: colourFromTemperature(star.teff),
    spectralClass: spectralLetter(star.teff),
  },
}));

// ---- Main sequence and red dwarfs, from Gaia (validated for these) -----------

const gaiaStars = JSON.parse(readFileSync(join(here, "data/stars-raw.json"), "utf-8"));

function seededPick(items, count, seed = 11) {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

const fromGaia = (truth, count) =>
  seededPick(
    gaiaStars.filter((s) => {
      if (s.truth !== truth) return false;
      const radius = s.radiusFlame ?? s.radiusGspphot;
      return s.teff && radius && s.absMagG !== null;
    }),
    count
  ).map((s) => {
    const radius = s.radiusFlame ?? s.radiusGspphot;
    const lum = luminosity(radius, s.teff);
    return {
      name: s.name,
      truth,
      input: {
        temperature: s.teff,
        luminosity: lum,
        radius,
        absoluteMagnitude: absoluteMagnitude(lum),
        color: colourFromTemperature(s.teff),
        spectralClass: s.spType.trim()[0].toUpperCase(),
      },
    };
  });

// ---- Assemble and run --------------------------------------------------------

const sample = [
  ...fromGaia("Main Sequence", 32),
  ...fromGaia("Red Dwarf", 24),
  ...seededPick(whiteDwarfs, 26),
  ...LITERATURE,
];

console.log(`Corrected star evaluation — ${sample.length} stars`);
console.log("White dwarfs: Gentile Fusillo et al. (2021) atmosphere fits");
console.log("Supergiants and brown dwarfs: published literature values");
console.log("Main sequence and red dwarfs: Gaia DR3\n");

const results = sample.map((star) => {
  const { prediction, warnings } = classifyStar(star.input);
  return {
    ...star,
    predicted: prediction.label,
    confidence: prediction.confidence,
    correct: prediction.label === star.truth,
    extrapolated: warnings.length > 0,
  };
});

const correct = results.filter((r) => r.correct).length;
console.log("=".repeat(74));
console.log(`OVERALL: ${correct}/${results.length} correct (${((correct / results.length) * 100).toFixed(1)}%)`);
console.log("=".repeat(74));

const CLASSES = ["Main Sequence", "Red Dwarf", "White Dwarf", "Supergiant", "Hypergiant", "Brown Dwarf"];

console.log("\nPer-class recall:");
console.log("  truth              n   correct  recall   confusions");
for (const truth of CLASSES) {
  const group = results.filter((r) => r.truth === truth);
  if (!group.length) continue;
  const hits = group.filter((r) => r.correct).length;
  const errors = group
    .filter((r) => !r.correct)
    .reduce((acc, r) => {
      acc[r.predicted] = (acc[r.predicted] ?? 0) + 1;
      return acc;
    }, {});
  console.log(
    `  ${truth.padEnd(16)} ${String(group.length).padStart(3)}     ${String(hits).padStart(3)}   ` +
      `${((hits / group.length) * 100).toFixed(0).padStart(4)}%   ` +
      (Object.keys(errors).length
        ? Object.entries(errors).map(([k, v]) => `${k}:${v}`).join(", ")
        : "-")
  );
}

console.log("\nExtrapolation warnings:");
const flagged = results.filter((r) => r.extrapolated);
const flaggedRight = flagged.filter((r) => r.correct).length;
const clean = results.filter((r) => !r.extrapolated);
console.log(
  `  in range   : ${clean.filter((r) => r.correct).length}/${clean.length} correct ` +
    `(${((clean.filter((r) => r.correct).length / clean.length) * 100).toFixed(0)}%)`
);
console.log(
  `  flagged    : ${flaggedRight}/${flagged.length} correct` +
    (flagged.length ? ` (${((flaggedRight / flagged.length) * 100).toFixed(0)}%)` : "")
);

console.log("\nMisclassifications:");
results
  .filter((r) => !r.correct)
  .slice(0, 12)
  .forEach((r) =>
    console.log(
      `  ${r.name.slice(0, 24).padEnd(25)} truth ${r.truth.padEnd(14)} -> ${r.predicted.padEnd(14)} ` +
        `(${(r.confidence * 100).toFixed(0)}%)  T=${r.input.temperature.toFixed(0)} ` +
        `R=${r.input.radius.toExponential(1)} L=${r.input.luminosity.toExponential(1)}`
    )
  );
