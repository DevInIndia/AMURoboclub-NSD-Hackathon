import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Builds a star evaluation set with an *independent* ground truth.
 *
 * The trap this design avoids: if the label were derived from temperature and
 * luminosity, we would be testing whether the classifier reproduces our own
 * labelling rule, not whether it is right. Both the classifier and any
 * HR-position rule read the same two numbers.
 *
 * So the label comes from the MK luminosity class in SIMBAD's spectral type,
 * which is assigned from spectral line ratios -- genuinely independent of the
 * photometric quantities fed to the model. The input parameters come from
 * Gaia DR3's astrophysical parameters, professionally derived and catalogued
 * rather than computed here.
 */

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, "data"), { recursive: true });

const SIMBAD = "https://simbad.cds.unistra.fr/simbad/sim-tap/sync";
const GAIA = "https://gea.esac.esa.int/tap-server/tap/sync";

async function tap(url, query, extra = {}) {
  const body = new URLSearchParams({
    request: "doQuery",
    lang: "adql",
    format: "csv",
    query,
    ...extra,
  });

  const response = await fetch(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) throw new Error(`${url} responded ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return response.text();
}

const parseCsv = (text) => {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const headers = head.split(",");
  return lines
    .filter(Boolean)
    .map((line) => {
      const values = line.match(/("[^"]*"|[^,]*)/g).filter((_, i) => i % 2 === 0);
      return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? "").replace(/^"|"$/g, "")]));
    });
};

/**
 * Spectral-type patterns per target class, chosen so each query returns a
 * clean population. Sampling per class rather than at random is deliberate:
 * a random sample of the sky is overwhelmingly main-sequence dwarfs and would
 * say nothing about how the model handles the rarer classes.
 */
// ADQL's LIKE has no character classes, so each spectral letter is queried
// separately and the luminosity class is parsed here rather than in SQL.
const PATTERNS = [
  "O%", "B%", "A%", "F%", "G%", "K%", "M%", "D%", "L%", "T%",
];

/**
 * Ground truth from the MK luminosity class.
 *
 * Returns null for anything ambiguous -- a wrong label is worse than a
 * smaller sample.
 */
function labelFromSpectralType(spType) {
  const type = spType.trim();

  // White dwarfs: DA, DB, DZ, DQ...
  if (/^D[ABCOQZXV]/.test(type)) return "White Dwarf";
  // Brown dwarfs: the L, T and Y sequences.
  if (/^[LTY]\d/.test(type)) return "Brown Dwarf";

  const letter = type[0];
  if (!"OBAFGKM".includes(letter)) return null;

  // Luminosity class sits after the numeric subtype. Order matters: test the
  // longer numerals first so III is not read as I.
  const tail = type.slice(1);
  if (/\bI{3}\b|III/.test(tail)) return "Giant (unmapped)";
  if (/\bII\b|II[ab]?(?!I)/.test(tail)) return "Bright Giant (unmapped)";
  if (/\bIV\b|IV/.test(tail)) return "Subgiant (unmapped)";
  if (/\bV\b|V(?![I])/.test(tail)) {
    // The model splits dwarfs: M-type dwarfs are its "Red Dwarf" class.
    return letter === "M" ? "Red Dwarf" : "Main Sequence";
  }
  if (/\bI[ab]?\b|^I[ab]?$|Ia|Ib/.test(tail)) return "Supergiant";

  return null;
}

async function fetchSimbadPattern(pattern) {
  const query =
    `select top 900 b.main_id, b.sp_type, i.id ` +
    `from basic b join ident i on b.oid = i.oidref ` +
    `where b.sp_type like '${pattern}' and i.id like 'Gaia DR3%' and b.plx_value > 1`;

  const rows = parseCsv(await tap(SIMBAD, query));
  return rows
    .filter((row) => !/[+]/.test(row.sp_type)) // drop composite classifications
    .map((row) => ({
      name: row.main_id,
      spType: row.sp_type,
      gaiaId: row.id.replace("Gaia DR3 ", "").trim(),
      truth: labelFromSpectralType(row.sp_type),
    }))
    .filter((row) => row.truth);
}

/** Gaia's own derived parameters for these sources. */
async function fetchGaia(ids) {
  const list = ids.map((id) => `'${id}'`).join(",");
  const query =
    `select ap.source_id, ap.teff_gspphot, ap.radius_gspphot, ap.mg_gspphot, ` +
    `ap.lum_flame, ap.radius_flame, gs.parallax, gs.phot_g_mean_mag, gs.bp_rp ` +
    `from gaiadr3.astrophysical_parameters ap ` +
    `join gaiadr3.gaia_source gs on gs.source_id = ap.source_id ` +
    `where ap.source_id in (${list})`;

  return parseCsv(await tap(GAIA, query));
}

const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size)
  );

async function main() {
  const candidates = [];

  for (const pattern of PATTERNS) {
    process.stdout.write(`SIMBAD ${pattern.padEnd(3)} ... `);
    try {
      const rows = await fetchSimbadPattern(pattern);
      const counts = rows.reduce((acc, r) => {
        acc[r.truth] = (acc[r.truth] ?? 0) + 1;
        return acc;
      }, {});
      console.log(
        `${rows.length} labelled  ${Object.entries(counts).map(([k, v]) => `${k.split(" ")[0]}:${v}`).join(" ")}`
      );
      candidates.push(...rows);
    } catch (error) {
      console.log(`failed: ${error.message.slice(0, 80)}`);
    }
  }

  console.log(`\n${candidates.length} candidates; querying Gaia for parameters...`);

  const byId = new Map(candidates.map((c) => [c.gaiaId, c]));
  const enriched = [];

  for (const batch of chunk([...byId.keys()], 400)) {
    try {
      const rows = await fetchGaia(batch);
      for (const row of rows) {
        const base = byId.get(String(row.source_id));
        if (!base) continue;
        enriched.push({
          ...base,
          teff: Number(row.teff_gspphot) || null,
          radiusGspphot: Number(row.radius_gspphot) || null,
          radiusFlame: Number(row.radius_flame) || null,
          absMagG: Number(row.mg_gspphot) || null,
          lumFlame: Number(row.lum_flame) || null,
          bpRp: Number(row.bp_rp) || null,
          parallax: Number(row.parallax) || null,
          gMag: Number(row.phot_g_mean_mag) || null,
        });
      }
      process.stdout.write(`  ${enriched.length} matched\r`);
    } catch (error) {
      console.log(`\n  Gaia batch failed: ${error.message.slice(0, 120)}`);
    }
  }

  console.log(`\n${enriched.length} stars with Gaia parameters`);

  writeFileSync(join(here, "data/stars-raw.json"), JSON.stringify(enriched, null, 1));

  const counts = enriched.reduce((acc, s) => {
    acc[s.truth] = (acc[s.truth] ?? 0) + 1;
    return acc;
  }, {});
  console.log("by class:", JSON.stringify(counts, null, 1));
}

main().catch((error) => {
  console.error("Fetch failed:", error);
  process.exitCode = 1;
});
