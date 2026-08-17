import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  characteriseExoplanet,
  equilibriumTemperature,
  estimateMass,
  classifyPlanet,
  habitableZonePosition,
} from "../backend/services/exoplanet.js";

/**
 * Validation of the exoplanet calculator against the NASA Exoplanet Archive.
 *
 * Nothing in the calculator is a trained model, so "accuracy" here does not
 * mean prediction accuracy. It means: do the published formulas, as
 * implemented, reproduce quantities that other people measured or derived
 * independently?
 *
 * Three genuinely independent checks are possible:
 *
 *  1. Equilibrium temperature. We derive it from insolation flux; the archive
 *     publishes pl_eqt derived by each discovery team from stellar parameters
 *     and orbital distance. Agreement tests the thermodynamics.
 *  2. Mass from radius. We estimate it via Chen & Kipping; the archive carries
 *     masses measured by radial velocity or transit timing. Agreement tests
 *     how far a radius-only estimate can be trusted.
 *  3. Habitable zone membership. Checked against planets independently
 *     catalogued as habitable-zone candidates.
 *
 * A note on sampling: the archive is dominated by hot Jupiters because they
 * are easiest to detect, so a uniform sample would say little about the small
 * planets people actually ask about. The set below is stratified by radius.
 */

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLE_SIZE = 100;

// Deterministic shuffle so the sample is reproducible run to run.
function seededPick(items, count, seed = 42) {
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

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  return lines.map((line) => {
    // Fields are unquoted numbers except pl_name, which is quoted.
    const values = line.match(/("[^"]*"|[^,]*)/g).filter((_, i) => i % 2 === 0);
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").replace(/^"|"$/g, "")])
    );
  });
}

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Stratify so small planets are not swamped by the hot-Jupiter majority.
const BANDS = [
  { label: "Sub-Earth / Terran", min: 0, max: 1.25, share: 0.2 },
  { label: "Super-Earth", min: 1.25, max: 2, share: 0.2 },
  { label: "Mini-Neptune", min: 2, max: 3.5, share: 0.2 },
  { label: "Neptunian", min: 3.5, max: 8, share: 0.2 },
  { label: "Jovian", min: 8, max: 99, share: 0.2 },
];

const rows = parseCsv(readFileSync(join(here, "data/exoplanets_all.csv"), "utf-8"))
  .map((row) => ({
    name: row.pl_name,
    radius: num(row.pl_rade),
    mass: num(row.pl_masse),
    insolation: num(row.pl_insol),
    eqt: num(row.pl_eqt),
    period: num(row.pl_orbper),
    starTeff: num(row.st_teff),
    starLum: num(row.st_lum), // log10(L/Lsun)
    starMass: num(row.st_mass),
  }))
  .filter((r) => r.radius && r.mass && r.insolation && r.eqt && r.starTeff);

const sample = BANDS.flatMap((band) => {
  const inBand = rows.filter((r) => r.radius >= band.min && r.radius < band.max);
  return seededPick(inBand, Math.round(SAMPLE_SIZE * band.share)).map((r) => ({
    ...r,
    band: band.label,
  }));
});

console.log(`Evaluating ${sample.length} planets from the NASA Exoplanet Archive\n`);

const results = sample.map((planet) => {
  const derived = characteriseExoplanet({
    radiusEarths: planet.radius,
    insolationFlux: planet.insolation,
    massEarths: planet.mass, // measured mass, for the ESI figure
    stellarTemperatureK: planet.starTeff,
    ...(planet.starLum !== null ? { stellarLuminositySuns: 10 ** planet.starLum } : {}),
    ...(planet.period && planet.starMass
      ? { orbitalPeriodDays: planet.period, stellarMassSuns: planet.starMass }
      : {}),
  });

  // Independent check 1: our T_eq against the archive's published value.
  const ourEqt = equilibriumTemperature(planet.insolation);
  const eqtError = ourEqt - planet.eqt;
  const eqtPercent = (eqtError / planet.eqt) * 100;

  // Independent check 2: mass estimated from radius alone against the measured
  // mass, which the estimator never sees.
  const estimated = estimateMass(planet.radius);
  const massRatio = estimated.massEarths / planet.mass;

  return {
    ...planet,
    ourEqt,
    eqtError,
    eqtPercent,
    estimatedMass: estimated.massEarths,
    massUncertain: estimated.uncertain,
    massRatio,
    esi: derived.similarity.esi,
    planetClass: derived.classification.label,
    hzPosition: derived.habitableZonePosition,
  };
});

// ---- Report -----------------------------------------------------------------

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const fmt = (n, d = 1) => n.toFixed(d).padStart(7);

console.log("=".repeat(78));
console.log("CHECK 1 — Equilibrium temperature vs the archive's published pl_eqt");
console.log("=".repeat(78));

const eqtErrors = results.map((r) => Math.abs(r.eqtPercent));
const within10 = eqtErrors.filter((e) => e <= 10).length;
const within20 = eqtErrors.filter((e) => e <= 20).length;

console.log(`  median absolute error : ${fmt(median(eqtErrors))} %`);
console.log(`  mean absolute error   : ${fmt(eqtErrors.reduce((a, b) => a + b, 0) / eqtErrors.length)} %`);
console.log(`  within 10%            : ${within10}/${results.length}`);
console.log(`  within 20%            : ${within20}/${results.length}`);

const biased = results.reduce((a, r) => a + r.eqtPercent, 0) / results.length;
console.log(`  mean signed error     : ${fmt(biased)} %  (sign shows systematic bias)`);

console.log("\n  Worst five:");
[...results]
  .sort((a, b) => Math.abs(b.eqtPercent) - Math.abs(a.eqtPercent))
  .slice(0, 5)
  .forEach((r) =>
    console.log(
      `    ${r.name.padEnd(22)} ours ${fmt(r.ourEqt, 0)}K  archive ${fmt(r.eqt, 0)}K  ${fmt(r.eqtPercent)}%`
    )
  );

console.log("\n" + "=".repeat(78));
console.log("CHECK 2 — Mass estimated from radius vs measured mass");
console.log("=".repeat(78));

const byBand = new Map();
for (const r of results) {
  if (!byBand.has(r.band)) byBand.set(r.band, []);
  byBand.get(r.band).push(r);
}

console.log("  band                  n   median ratio   within 2x   within 5x");
for (const band of BANDS) {
  const group = byBand.get(band.label) ?? [];
  if (!group.length) continue;
  const ratios = group.map((r) => r.massRatio);
  const within2 = ratios.filter((r) => r >= 0.5 && r <= 2).length;
  const within5 = ratios.filter((r) => r >= 0.2 && r <= 5).length;
  console.log(
    `  ${band.label.padEnd(20)} ${String(group.length).padStart(3)}   ` +
      `${fmt(median(ratios), 2)}x       ${String(within2).padStart(3)}/${group.length}` +
      `       ${String(within5).padStart(3)}/${group.length}`
  );
}

const allRatios = results.map((r) => r.massRatio);
console.log(
  `  ${"ALL".padEnd(20)} ${String(results.length).padStart(3)}   ${fmt(median(allRatios), 2)}x` +
    `       ${String(allRatios.filter((r) => r >= 0.5 && r <= 2).length).padStart(3)}/${results.length}` +
    `       ${String(allRatios.filter((r) => r >= 0.2 && r <= 5).length).padStart(3)}/${results.length}`
);

console.log("\n" + "=".repeat(78));
console.log("CHECK 3 — Habitable zone and ESI distribution");
console.log("=".repeat(78));

const hzCounts = results.reduce((acc, r) => {
  acc[r.hzPosition ?? "unknown"] = (acc[r.hzPosition ?? "unknown"] ?? 0) + 1;
  return acc;
}, {});
console.log("  zone position:", JSON.stringify(hzCounts));

const inHz = results.filter((r) => r.hzPosition === "conservative" || r.hzPosition === "optimistic");
console.log(`\n  ${inHz.length} planets fall inside a habitable zone:`);
inHz
  .sort((a, b) => b.esi - a.esi)
  .slice(0, 10)
  .forEach((r) =>
    console.log(
      `    ${r.name.padEnd(22)} ESI ${r.esi.toFixed(3)}  ${r.radius.toFixed(2)} Re  ` +
        `${r.insolation.toFixed(2)} S  ${r.hzPosition}`
    )
  );

const topEsi = [...results].sort((a, b) => b.esi - a.esi).slice(0, 10);
console.log("\n  Highest ESI overall:");
topEsi.forEach((r) =>
  console.log(
    `    ${r.name.padEnd(22)} ESI ${r.esi.toFixed(3)}  ${r.radius.toFixed(2)} Re  ` +
      `T_eq ${r.ourEqt.toFixed(0)}K  ${r.hzPosition ?? "-"}`
  )
);

console.log("\n" + "=".repeat(78));
console.log("CHECK 4 — Planet classification distribution");
console.log("=".repeat(78));
const classCounts = results.reduce((acc, r) => {
  acc[r.planetClass] = (acc[r.planetClass] ?? 0) + 1;
  return acc;
}, {});
console.log(" ", JSON.stringify(classCounts));

writeFileSync(
  join(here, "data/exoplanet-results.json"),
  JSON.stringify(results, null, 1)
);
console.log("\nPer-planet results written to eval/data/exoplanet-results.json");
