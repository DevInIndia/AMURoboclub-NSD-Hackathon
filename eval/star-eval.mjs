import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { classifyStar } from "../backend/services/starModel.js";

/**
 * Evaluation of the star classifier against real catalogue data.
 *
 * Inputs: Gaia DR3 astrophysical parameters (temperature, radius, absolute
 * magnitude), professionally derived and catalogued.
 *
 * Ground truth: the MK luminosity class from SIMBAD's spectral type, assigned
 * from spectral line ratios. This is the crucial design point -- a label
 * derived from position on the HR diagram would be read off the same
 * temperature and luminosity the classifier itself uses, so the test would
 * only measure whether the model reproduces our labelling rule.
 *
 * Two caveats stated up front rather than buried:
 *
 *  - Luminosity is computed from catalogued radius and temperature via
 *    Stefan-Boltzmann. Checked against Gaia's own lum_flame where both exist:
 *    0.45% median difference, so this is a faithful reconstruction.
 *  - Absolute magnitude is Gaia's M_G, while the model was trained on absolute
 *    *visual* magnitude. The two differ by up to a magnitude for very red or
 *    very blue stars, and that mismatch is charged against the model here.
 */

const here = dirname(fileURLToPath(import.meta.url));
const SUN_TEFF = 5772;

const stars = JSON.parse(readFileSync(join(here, "data/stars-raw.json"), "utf-8"));

/** Colour category from temperature, matching the training encoding's ordering. */
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

/** The model accepts only the seven Harvard letters. */
const spectralLetter = (spType) => {
  const letter = spType.trim()[0].toUpperCase();
  if ("OBAFGKM".includes(letter)) return letter;
  // White dwarfs (D...) and brown dwarfs (L/T/Y) have no Harvard letter. The
  // closest the model's vocabulary allows: white dwarfs are hot (their spectra
  // resemble A/B), brown dwarfs are cooler than M.
  if (letter === "D") return "A";
  if ("LTY".includes(letter)) return "M";
  return null;
};

const MAPPED = ["Main Sequence", "Red Dwarf", "White Dwarf", "Supergiant", "Brown Dwarf"];
const UNMAPPED = ["Giant (unmapped)", "Subgiant (unmapped)", "Bright Giant (unmapped)"];

function buildInput(star) {
  const radius = star.radiusFlame ?? star.radiusGspphot;
  if (!star.teff || !radius || star.absMagG === null) return null;

  const letter = spectralLetter(star.spType);
  if (!letter) return null;

  return {
    temperature: star.teff,
    // Exact physics from two catalogued quantities.
    luminosity: radius ** 2 * (star.teff / SUN_TEFF) ** 4,
    radius,
    absoluteMagnitude: star.absMagG,
    color: colourFromTemperature(star.teff),
    spectralClass: letter,
  };
}

function seededPick(items, count, seed = 7) {
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

const usable = stars
  .map((star) => ({ star, input: buildInput(star) }))
  .filter((entry) => entry.input);

const byTruth = new Map();
for (const entry of usable) {
  if (!byTruth.has(entry.star.truth)) byTruth.set(entry.star.truth, []);
  byTruth.get(entry.star.truth).push(entry);
}

// Stratified so rare classes are represented at all: a random sample of the
// sky would be almost entirely main-sequence dwarfs.
const QUOTAS = {
  "Main Sequence": 40,
  "Red Dwarf": 27,
  "White Dwarf": 21,
  Supergiant: 6,
  "Brown Dwarf": 6,
};

const sample = Object.entries(QUOTAS).flatMap(([truth, quota]) =>
  seededPick(byTruth.get(truth) ?? [], quota)
);

console.log(`Star classifier evaluation — ${sample.length} real stars`);
console.log("Inputs: Gaia DR3 | Ground truth: SIMBAD MK luminosity class\n");

const results = sample.map(({ star, input }) => {
  const { prediction, warnings } = classifyStar(input);
  return {
    name: star.name,
    spType: star.spType,
    truth: star.truth,
    predicted: prediction.label,
    confidence: prediction.confidence,
    correct: prediction.label === star.truth,
    extrapolated: warnings.length > 0,
    input,
  };
});

// ---- Overall ----------------------------------------------------------------

const correct = results.filter((r) => r.correct).length;
console.log("=".repeat(76));
console.log(`OVERALL: ${correct}/${results.length} correct (${((correct / results.length) * 100).toFixed(1)}%)`);
console.log("=".repeat(76));

// ---- Per class --------------------------------------------------------------

console.log("\nPer-class recall:");
console.log("  truth              n    correct   recall   most common error");
for (const truth of MAPPED) {
  const group = results.filter((r) => r.truth === truth);
  if (!group.length) continue;
  const hits = group.filter((r) => r.correct).length;
  const errors = group.filter((r) => !r.correct).reduce((acc, r) => {
    acc[r.predicted] = (acc[r.predicted] ?? 0) + 1;
    return acc;
  }, {});
  const worst = Object.entries(errors).sort((a, b) => b[1] - a[1])[0];
  console.log(
    `  ${truth.padEnd(16)} ${String(group.length).padStart(3)}      ${String(hits).padStart(3)}    ` +
      `${((hits / group.length) * 100).toFixed(0).padStart(4)}%   ${worst ? `${worst[0]} (${worst[1]})` : "-"}`
  );
}

// ---- Confusion matrix -------------------------------------------------------

const labels = [...new Set(results.map((r) => r.predicted).concat(MAPPED))];
console.log("\nConfusion matrix (rows = truth, columns = predicted):");
const width = 14;
console.log("  " + "".padEnd(width) + labels.map((l) => l.slice(0, 9).padStart(10)).join(""));
for (const truth of MAPPED) {
  const group = results.filter((r) => r.truth === truth);
  if (!group.length) continue;
  const row = labels.map((label) => {
    const n = group.filter((r) => r.predicted === label).length;
    return (n === 0 ? "." : String(n)).padStart(10);
  });
  console.log("  " + truth.slice(0, width - 1).padEnd(width) + row.join(""));
}

// ---- Extrapolation ----------------------------------------------------------

const extrapolated = results.filter((r) => r.extrapolated);
const extrapolatedCorrect = extrapolated.filter((r) => r.correct).length;
const inRange = results.filter((r) => !r.extrapolated);
const inRangeCorrect = inRange.filter((r) => r.correct).length;

console.log("\nDoes the out-of-range warning predict failure?");
console.log(
  `  inside training range : ${inRangeCorrect}/${inRange.length} correct ` +
    `(${inRange.length ? ((inRangeCorrect / inRange.length) * 100).toFixed(0) : "-"}%)`
);
console.log(
  `  flagged extrapolated  : ${extrapolatedCorrect}/${extrapolated.length} correct ` +
    `(${extrapolated.length ? ((extrapolatedCorrect / extrapolated.length) * 100).toFixed(0) : "-"}%)`
);

// ---- Confidence calibration -------------------------------------------------

console.log("\nIs confidence meaningful?");
for (const [lo, hi] of [[0, 0.5], [0.5, 0.7], [0.7, 0.9], [0.9, 1.01]]) {
  const bucket = results.filter((r) => r.confidence >= lo && r.confidence < hi);
  if (!bucket.length) continue;
  const hits = bucket.filter((r) => r.correct).length;
  console.log(
    `  confidence ${(lo * 100).toFixed(0)}-${(hi * 100).toFixed(0)}%: ` +
      `${String(bucket.length).padStart(3)} stars, ${((hits / bucket.length) * 100).toFixed(0)}% correct`
  );
}

// ---- Classes the taxonomy cannot express ------------------------------------

console.log("\n" + "=".repeat(76));
console.log("CLASSES THE MODEL CANNOT EXPRESS");
console.log("=".repeat(76));
console.log("The training taxonomy has no giant, bright giant or subgiant class,");
console.log("so for these stars there is no correct answer available.\n");

const unmappedSample = UNMAPPED.flatMap((truth) =>
  seededPick(byTruth.get(truth) ?? [], 20)
);

const unmappedResults = unmappedSample.map(({ star, input }) => ({
  truth: star.truth,
  predicted: classifyStar(input).prediction.label,
}));

for (const truth of UNMAPPED) {
  const group = unmappedResults.filter((r) => r.truth === truth);
  if (!group.length) continue;
  const counts = group.reduce((acc, r) => {
    acc[r.predicted] = (acc[r.predicted] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `  ${truth.replace(" (unmapped)", "").padEnd(14)} n=${String(group.length).padStart(3)}  ->  ` +
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
  );
}

// ---- Worst misses -----------------------------------------------------------

console.log("\nSample of misclassifications:");
results
  .filter((r) => !r.correct)
  .sort((a, b) => b.confidence - a.confidence)
  .slice(0, 8)
  .forEach((r) =>
    console.log(
      `  ${r.name.padEnd(22)} ${r.spType.padEnd(10)} truth ${r.truth.padEnd(14)} ` +
        `-> ${r.predicted.padEnd(14)} (${(r.confidence * 100).toFixed(0)}%)  ` +
        `T=${r.input.temperature.toFixed(0)}K L=${r.input.luminosity.toExponential(1)}`
    )
  );

writeFileSync(join(here, "data/star-results.json"), JSON.stringify(results, null, 1));
console.log("\nPer-star results written to eval/data/star-results.json");
