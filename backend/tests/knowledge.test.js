import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { __testing as embeddingTesting, toVectorLiteral, EMBEDDING_DIMENSIONS } from "../services/embeddings.js";

/**
 * Retrieval degradation.
 *
 * The property under test throughout: retrieval failure must never fail the
 * question. Every path below has to return zero passages so POST /search falls
 * back to an ungrounded answer rather than erroring.
 */

// The module holds a cached availability flag and talks to Postgres, so it is
// imported fresh per test with the pool stubbed.
async function loadKnowledge({ queryImpl, embedImpl }) {
  vi.resetModules();

  vi.doMock("../db/pool.js", () => ({
    query: queryImpl,
    pool: { connect: vi.fn(), end: vi.fn(), on: vi.fn() },
  }));

  vi.doMock("../services/embeddings.js", async () => {
    const actual = await vi.importActual("../services/embeddings.js");
    return {
      ...actual,
      embed: embedImpl ?? vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
      embedQuery: embedImpl ?? vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
    };
  });

  return import("../db/knowledge.js");
}

afterEach(() => {
  vi.doUnmock("../db/pool.js");
  vi.doUnmock("../services/embeddings.js");
  vi.resetModules();
});

describe("retrieveContext degradation", () => {
  it("returns no passages when the documents table does not exist", async () => {
    // Simulates a database without pgvector, or one that never ran the
    // vector migration.
    const query = vi.fn().mockRejectedValue(new Error('relation "documents" does not exist'));
    const { retrieveContext } = await loadKnowledge({ queryImpl: query });

    const result = await retrieveContext("What is a pulsar?");

    expect(result.passages).toEqual([]);
    expect(result.reason).toBe("corpus-unavailable");
  });

  it("returns no passages when embedding the question fails", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] }); // table exists
    const embed = vi.fn().mockRejectedValue(new Error("embedding API down"));
    const { retrieveContext } = await loadKnowledge({ queryImpl: query, embedImpl: embed });

    const result = await retrieveContext("What is a pulsar?");

    expect(result.passages).toEqual([]);
    expect(result.reason).toBe("embedding-failed");
  });

  it("returns no passages when the vector search itself fails", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // availability probe succeeds
      .mockRejectedValue(new Error("operator does not exist: vector <=> vector"));
    const { retrieveContext } = await loadKnowledge({ queryImpl: query });

    const result = await retrieveContext("What is a pulsar?");

    expect(result.passages).toEqual([]);
    expect(result.reason).toBe("search-failed");
  });

  it("reports no-match when nothing clears the similarity threshold", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const { retrieveContext } = await loadKnowledge({ queryImpl: query });

    const result = await retrieveContext("What is the best recipe for cake?");

    expect(result.passages).toEqual([]);
    expect(result.reason).toBe("no-match");
  });

  it("returns ranked passages when the search succeeds", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 7,
          source: "iau-constants",
          title: "Parsec and light-year",
          url: "https://example.test",
          content: "One parsec is ...",
          similarity: 0.7619,
        },
      ],
    });
    const { retrieveContext } = await loadKnowledge({ queryImpl: query });

    const result = await retrieveContext("How far is a parsec?");

    expect(result.reason).toBe("ok");
    expect(result.passages).toHaveLength(1);
    expect(result.passages[0]).toMatchObject({
      id: "7",
      title: "Parsec and light-year",
      similarity: 0.7619,
    });
  });

  it("applies a similarity threshold and a bounded limit in the query", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const { retrieveContext } = await loadKnowledge({ queryImpl: query });

    await retrieveContext("anything", { limit: 999 });

    const [sql, params] = query.mock.calls.at(-1);
    expect(sql).toMatch(/<=>/); // cosine distance operator
    expect(params[1]).toBeGreaterThan(0); // threshold is applied
    expect(params[2]).toBeLessThanOrEqual(10); // limit is clamped
  });

  it("caches the availability check rather than probing on every question", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const { retrieveContext } = await loadKnowledge({ queryImpl: query });

    await retrieveContext("one");
    const callsAfterFirst = query.mock.calls.length;
    await retrieveContext("two");

    // Second question runs the search but not another availability probe.
    expect(query.mock.calls.length).toBe(callsAfterFirst + 1);
  });
});

describe("embedding vectors", () => {
  it("normalises to unit length", () => {
    const normalised = embeddingTesting.normalise([3, 4]);
    const magnitude = Math.hypot(...normalised);
    expect(magnitude).toBeCloseTo(1, 10);
  });

  // Truncated Matryoshka embeddings come back with a norm around 0.59, so
  // normalisation is required rather than cosmetic.
  it("rescales a short vector to unit length", () => {
    const normalised = embeddingTesting.normalise(new Array(768).fill(0.02));
    expect(Math.hypot(...normalised)).toBeCloseTo(1, 10);
  });

  it("refuses a zero vector rather than dividing by zero", () => {
    expect(() => embeddingTesting.normalise([0, 0, 0])).toThrow(/magnitude/i);
  });

  it("formats a pgvector literal", () => {
    expect(toVectorLiteral([0.1, -0.2, 0.3])).toBe("[0.1,-0.2,0.3]");
  });

  it("pins the dimension count to what the schema declares", () => {
    // pgvector's HNSW index rejects anything above 2000 dimensions, which is
    // why this is 768 and not the model's default 3072.
    expect(EMBEDDING_DIMENSIONS).toBe(768);
    expect(EMBEDDING_DIMENSIONS).toBeLessThanOrEqual(2000);
  });
});
