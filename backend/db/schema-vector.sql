-- Retrieval corpus for grounded answers.
--
-- Kept separate from schema.sql so the core application still migrates on a
-- Postgres without pgvector: the chat, classifier and archive do not depend on
-- this table, and retrieval degrades to ungrounded answers when it is absent.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source       TEXT        NOT NULL,
    title        TEXT        NOT NULL,
    url          TEXT,
    content      TEXT        NOT NULL,

    -- Ingestion is re-runnable: the same passage hashes to the same value, so
    -- a repeat run updates rather than duplicating.
    content_hash TEXT        NOT NULL UNIQUE,

    -- 768 rather than the model's default 3072: pgvector's HNSW index refuses
    -- anything above 2000 dimensions, and an unindexed column means every
    -- query is a sequential scan.
    embedding    VECTOR(768) NOT NULL,

    ingested_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cosine distance (<=>) is what the retrieval query uses, so the index has to
-- be built for the same operator class or it will simply not be used.
CREATE INDEX IF NOT EXISTS documents_embedding_idx
    ON documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS documents_source_idx ON documents (source);
