import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { estimateMass } from "../backend/services/exoplanet.js";

/**
 * Fits mass as a function of radius, directly.
 *
 * The existing estimator inverts Chen & Kipping's R(M) relation algebraically.
 * That is a statistical error, not a coding one: R(M) is a median forward
 * relation with intrinsic scatter, and flipping it does not produce the median
 * of the reverse conditional. The evaluation measured the consequence -- a
 * median predicted/measured ratio of 0.58, so masses came out ~40% light
 * across every size band.
 *
 * The fix is to regress log10(M) on log10(R) using planets with *measured*
 * masses, which estimates E[log M | R] directly. Breakpoints follow the known
 * physical regimes: rocky bodies, volatile envelopes, and giants where
 * electron degeneracy makes radius nearly independent of mass.
 */

const here = dirname(fileURLToPath(import.meta.url));

function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const headers = head.split(",");
  return lines.filter(Boolean).map((line) => {
    const values = line.match(/("[^"]*"|[^,]*)/g).filter((_, i) => i % 2 === 0);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").replace(/^"|"$/g, "")]));
  });
}

const planets = parseCsv(readFileSync(join(here, "data/exoplanets_all.csv"), "utf-8"))
  .map((r) => ({ name: r.pl_name, radius: Number(r.pl_rade), mass: Number(r.pl_masse) }))
  .filter((p) => p.radius > 0 && p.mass > 0 && Number.isFinite(p.radius) && Number.isFinite(p.mass));

console.log(`Fitting on ${planets.length} planets with measured masses\n`);

const medianOf = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Slope by least squares, intercept by the median residual.
 *
 * Plain OLS estimates E[log M | R], and exponentiating that returns the
 * geometric mean rather than the median whenever the residuals are skewed --
 * which they are here, giving a 1.30x over-prediction. Re-centring on the
 * median residual makes the estimator do what it claims: return a mass with
 * half the real planets above it and half below.
 */
function fit(points) {
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  const slope =
    points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0) /
    points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);

  const olsIntercept = meanY - slope * meanX;
  const residuals = points.map((p) => p.y - (olsIntercept + slope * p.x));
  const intercept = olsIntercept + medianOf(residuals);

  const ssRes = points.reduce((s, p) => s + (p.y - (intercept + slope * p.x)) ** 2, 0);
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);

  return { slope, intercept, r2: 1 - ssRes / ssTot, n };
}

// Physical regimes. The giant break is where degeneracy flattens the relation:
// beyond it radius carries almost no mass information.
const REGIMES = [
  { label: "rocky", min: 0, max: 1.5 },
  { label: "volatile", min: 1.5, max: 8 },
  { label: "giant", min: 8, max: 99 },
];

const coefficients = REGIMES.map((regime) => {
  const inRegime = planets.filter((p) => p.radius >= regime.min && p.radius < regime.max);
  const points = inRegime.map((p) => ({ x: Math.log10(p.radius), y: Math.log10(p.mass) }));
  const result = fit(points);

  console.log(
    `  ${regime.label.padEnd(9)} R ${String(regime.min).padStart(2)}-${String(regime.max).padEnd(3)} ` +
      `n=${String(result.n).padStart(4)}  log10(M) = ${result.intercept.toFixed(4)} + ` +
      `${result.slope.toFixed(4)}*log10(R)   R^2=${result.r2.toFixed(3)}`
  );

  return { ...regime, ...result };
});

// ---- Compare old and new against the measured masses -------------------------

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const predictNew = (radius) => {
  const regime = coefficients.find((c) => radius >= c.min && radius < c.max) ?? coefficients.at(-1);
  return 10 ** (regime.intercept + regime.slope * Math.log10(radius));
};

console.log("\n" + "=".repeat(72));
console.log("Predicted / measured mass ratio (1.00 is perfect)");
console.log("=".repeat(72));
console.log("  band                 n      old (inverted)      new (direct fit)");

const BANDS = [
  { label: "Sub-Earth/Terran", min: 0, max: 1.25 },
  { label: "Super-Earth", min: 1.25, max: 2 },
  { label: "Mini-Neptune", min: 2, max: 3.5 },
  { label: "Neptunian", min: 3.5, max: 8 },
  { label: "Jovian", min: 8, max: 99 },
];

for (const band of BANDS) {
  const group = planets.filter((p) => p.radius >= band.min && p.radius < band.max);
  if (!group.length) continue;
  const oldRatios = group.map((p) => estimateMass(p.radius).massEarths / p.mass);
  const newRatios = group.map((p) => predictNew(p.radius) / p.mass);
  console.log(
    `  ${band.label.padEnd(18)} ${String(group.length).padStart(4)}   ` +
      `${median(oldRatios).toFixed(2).padStart(8)}x            ${median(newRatios).toFixed(2).padStart(8)}x`
  );
}

const allOld = planets.map((p) => estimateMass(p.radius).massEarths / p.mass);
const allNew = planets.map((p) => predictNew(p.radius) / p.mass);
const within = (ratios, factor) =>
  ratios.filter((r) => r >= 1 / factor && r <= factor).length;

console.log(
  `  ${"ALL".padEnd(18)} ${String(planets.length).padStart(4)}   ` +
    `${median(allOld).toFixed(2).padStart(8)}x            ${median(allNew).toFixed(2).padStart(8)}x`
);
console.log(
  `\n  within 2x:  old ${within(allOld, 2)}/${planets.length}` +
    `   new ${within(allNew, 2)}/${planets.length}`
);
console.log(
  `  within 5x:  old ${within(allOld, 5)}/${planets.length}` +
    `   new ${within(allNew, 5)}/${planets.length}`
);

console.log("\nCoefficients for exoplanet.js:\n");
console.log(JSON.stringify(
  coefficients.map(({ label, min, max, intercept, slope, r2, n }) => ({
    label, maxRadius: max, intercept: Number(intercept.toFixed(4)),
    slope: Number(slope.toFixed(4)), r2: Number(r2.toFixed(3)), n,
  })),
  null, 2
));
