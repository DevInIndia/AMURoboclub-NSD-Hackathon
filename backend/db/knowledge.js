import { query } from "./pool.js";
import { embed, embedQuery, toVectorLiteral, EMBEDDING_DIMENSIONS } from "../services/embeddings.js";
import { createHash } from "crypto";

/**
 * The retrieval corpus.
 *
 * Every function here treats an unavailable corpus as a normal condition
 * rather than an error: if pgvector is missing, the table is empty, or the
 * embedding call fails, retrieval returns nothing and the caller answers
 * without grounding. A question answered ungrounded is far better than a
 * question that errors.
 */

/**
 * Passages scoring below this are dropped.
 *
 * Cosine similarity on normalised embeddings runs -1 to 1. Semantically
 * unrelated text still lands around 0.3-0.5 with modern embedding models, so a
 * threshold well above zero is needed or every question retrieves its three
 * nearest passages no matter how irrelevant. Too high and genuinely relevant
 * passages are lost; 0.65 is a starting point to tune against real questions.
 */
const MIN_SIMILARITY = 0.65;

const DEFAULT_LIMIT = 4;

let corpusAvailable = null;

/** Whether the documents table exists. Cached after the first check. */
export async function isRetrievalAvailable() {
  if (corpusAvailable !== null) return corpusAvailable;

  try {
    await query("SELECT 1 FROM documents LIMIT 1");
    corpusAvailable = true;
  } catch {
    corpusAvailable = false;
  }
  return corpusAvailable;
}

/** Reset the cached availability flag. Used by tests and after migrating. */
export const resetAvailabilityCache = () => {
  corpusAvailable = null;
};

/** Stable identity for a passage, so re-ingesting updates instead of duplicating. */
export const hashContent = (source, content) =>
  createHash("sha256").update(`${source}::${content}`).digest("hex");

/** Insert or refresh one passage. */
export async function upsertDocument({ source, title, url, content }) {
  const embedding = await embed(content);

  const { rows } = await query(
    `INSERT INTO documents (source, title, url, content, content_hash, embedding)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (content_hash) DO UPDATE
       SET title = EXCLUDED.title,
           url = EXCLUDED.url,
           embedding = EXCLUDED.embedding,
           ingested_at = now()
     RETURNING id, (xmax = 0) AS inserted`,
    [source, title, url ?? null, content, hashContent(source, content), toVectorLiteral(embedding)]
  );

  return rows[0];
}

/**
 * Passages most similar to a question.
 *
 * Returns an empty array rather than throwing when anything in the chain is
 * unavailable -- that is what lets POST /search degrade to an ungrounded
 * answer instead of failing.
 */
export async function retrieveContext(question, { limit = DEFAULT_LIMIT } = {}) {
  if (!(await isRetrievalAvailable())) {
    return { passages: [], reason: "corpus-unavailable" };
  }

  let vector;
  try {
    vector = await embedQuery(question);
  } catch (error) {
    console.error("Could not embed the question; answering ungrounded:", error.message);
    return { passages: [], reason: "embedding-failed" };
  }

  try {
    // 1 - (a <=> b) converts pgvector's cosine *distance* into similarity, so
    // larger is better and the threshold reads the way a person expects.
    const { rows } = await query(
      `SELECT id, source, title, url, content,
              1 - (embedding <=> $1::vector) AS similarity
       FROM documents
       WHERE 1 - (embedding <=> $1::vector) >= $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [toVectorLiteral(vector), MIN_SIMILARITY, Math.min(Math.max(limit, 1), 10)]
    );

    return {
      passages: rows.map((row) => ({
        id: String(row.id),
        source: row.source,
        title: row.title,
        url: row.url,
        content: row.content,
        similarity: Number(row.similarity.toFixed(4)),
      })),
      reason: rows.length ? "ok" : "no-match",
    };
  } catch (error) {
    console.error("Vector search failed; answering ungrounded:", error.message);
    return { passages: [], reason: "search-failed" };
  }
}

/** Corpus size by source, for the ingestion CLI and diagnostics. */
export async function corpusStats() {
  if (!(await isRetrievalAvailable())) return { available: false, total: 0, bySource: [] };

  const { rows } = await query(
    `SELECT source, COUNT(*)::int AS count, MAX(ingested_at) AS latest
     FROM documents GROUP BY source ORDER BY count DESC`
  );

  return {
    available: true,
    dimensions: EMBEDDING_DIMENSIONS,
    total: rows.reduce((sum, r) => sum + r.count, 0),
    bySource: rows,
  };
}
