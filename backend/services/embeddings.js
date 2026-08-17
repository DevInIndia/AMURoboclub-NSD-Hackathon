import "../loadEnv.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Text embeddings for retrieval.
 *
 * Two decisions here were driven by measurement rather than documentation.
 *
 * **Why 768 dimensions and not the default.** gemini-embedding-001 returns
 * 3072 dimensions by default, but pgvector's HNSW index accepts at most 2000.
 * A 3072-dim column can be stored but not indexed, leaving every query a
 * sequential scan. The model is Matryoshka-trained, so a 768-dim prefix is a
 * usable embedding in its own right -- and 768 also quarters the storage.
 *
 * **Why the explicit re-normalisation.** The default 3072-dim vector comes
 * back with an L2 norm of 1.0, but the truncated 768-dim vector does not:
 * measured at 0.5936. Cosine distance is scale-invariant so ranking survives,
 * but any later switch to inner-product distance would silently produce wrong
 * results, and unnormalised vectors make the stored data harder to reason
 * about. Normalising once at write time removes the whole class of problem.
 */

const MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";

/** Must match the vector(N) column width in the schema. */
export const EMBEDDING_DIMENSIONS = 768;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL });

/** Scale a vector to unit length. */
function normalise(values) {
  const magnitude = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  if (!magnitude || !Number.isFinite(magnitude)) {
    throw new Error("Embedding has zero or invalid magnitude");
  }
  return values.map((v) => v / magnitude);
}

/**
 * Embed one piece of text.
 *
 * `taskType` matters for retrieval quality: the model places a question and
 * the passage that answers it in different regions unless told which role the
 * text is playing.
 */
export async function embed(text, { taskType = "RETRIEVAL_DOCUMENT" } = {}) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("Cannot embed empty text");

  const response = await model.embedContent({
    content: { parts: [{ text: trimmed }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
    taskType,
  });

  const values = response.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${values?.length ?? "none"}`
    );
  }

  return normalise(values);
}

/** Embed a question. Uses the query task type, not the document one. */
export const embedQuery = (text) => embed(text, { taskType: "RETRIEVAL_QUERY" });

/** pgvector accepts a vector literal as a bracketed, comma-separated string. */
export const toVectorLiteral = (values) => `[${values.join(",")}]`;

export const __testing = { normalise };
