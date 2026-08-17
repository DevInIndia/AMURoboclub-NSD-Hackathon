import "../loadEnv.js";
import { pool } from "../db/pool.js";
import { upsertDocument, corpusStats, isRetrievalAvailable, resetAvailabilityCache } from "../db/knowledge.js";
import { loadConstants } from "./sources/constants.js";
import { loadApod } from "./sources/apod.js";
import { loadArxiv } from "./sources/arxiv.js";

/**
 * Corpus ingestion.
 *
 *   npm run ingest              -- all sources
 *   npm run ingest -- constants -- one source
 *   npm run ingest -- --stats   -- report without ingesting
 *
 * Re-runnable by design: passages are keyed on a content hash, so running this
 * twice updates rather than duplicating, and a changed passage replaces its
 * old embedding.
 */

const SOURCES = {
  constants: { label: "IAU constants", load: loadConstants },
  apod: { label: "NASA APOD", load: loadApod },
  arxiv: { label: "arXiv astro-ph", load: loadArxiv },
};

// Embedding calls are rate-limited upstream, so documents are embedded in
// small batches with a pause rather than all at once.
const BATCH_SIZE = 5;
const PAUSE_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ingestSource(name) {
  const source = SOURCES[name];
  process.stdout.write(`\n${source.label}\n`);

  let documents;
  try {
    documents = await source.load();
  } catch (error) {
    console.error(`  could not load: ${error.message}`);
    return { inserted: 0, updated: 0, failed: 0 };
  }

  console.log(`  ${documents.length} passages`);

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(batch.map((doc) => upsertDocument(doc)));

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        result.value.inserted ? inserted++ : updated++;
      } else {
        failed++;
        console.error(`  failed: ${batch[index].title.slice(0, 60)} -- ${result.reason.message}`);
      }
    }

    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, documents.length)}/${documents.length}\r`);
    if (i + BATCH_SIZE < documents.length) await sleep(PAUSE_MS);
  }

  console.log(`  inserted ${inserted}, updated ${updated}, failed ${failed}`);
  return { inserted, updated, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const statsOnly = args.includes("--stats");
  const requested = args.filter((arg) => !arg.startsWith("--"));

  resetAvailabilityCache();
  if (!(await isRetrievalAvailable())) {
    console.error(
      "The documents table is not available. Run `npm run db:migrate` first,\n" +
        "and make sure the database image includes pgvector."
    );
    process.exitCode = 1;
    return;
  }

  if (statsOnly) {
    console.log(JSON.stringify(await corpusStats(), null, 2));
    return;
  }

  const names = requested.length ? requested : Object.keys(SOURCES);
  const unknown = names.filter((name) => !SOURCES[name]);
  if (unknown.length) {
    console.error(`Unknown source(s): ${unknown.join(", ")}`);
    console.error(`Available: ${Object.keys(SOURCES).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const totals = { inserted: 0, updated: 0, failed: 0 };
  for (const name of names) {
    const result = await ingestSource(name);
    totals.inserted += result.inserted;
    totals.updated += result.updated;
    totals.failed += result.failed;
  }

  console.log(
    `\nDone: ${totals.inserted} inserted, ${totals.updated} updated, ${totals.failed} failed.`
  );
  console.log(JSON.stringify(await corpusStats(), null, 2));
}

main()
  .catch((error) => {
    console.error("Ingestion failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
