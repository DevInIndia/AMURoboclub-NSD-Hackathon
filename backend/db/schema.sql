-- Schema for the Celestial Chatbot archive.
--
-- Every statement is idempotent, so `npm run db:migrate` can be run repeatedly
-- and against an existing database without dropping anything.
--
-- Rows are keyed on the Auth0 `sub` claim (e.g. "google-oauth2|1234567890").
-- There is no users table: Auth0 owns identity, and nothing here needs a
-- profile beyond that identifier.

CREATE TABLE IF NOT EXISTS prompts (
    id          BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     TEXT        NOT NULL,
    prompt      TEXT        NOT NULL,
    response    TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every read is "this user's rows, newest first", which this index serves
-- directly.
CREATE INDEX IF NOT EXISTS prompts_user_created_idx
    ON prompts (user_id, created_at DESC);

-- Star classifications keep their measurements as real columns rather than
-- being flattened into prose. That is the whole point of the move: these rows
-- stay queryable, so the model's behaviour can be analysed later.
CREATE TABLE IF NOT EXISTS classifications (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id            TEXT             NOT NULL,
    temperature        DOUBLE PRECISION NOT NULL,
    luminosity         DOUBLE PRECISION NOT NULL,
    radius             DOUBLE PRECISION NOT NULL,
    absolute_magnitude DOUBLE PRECISION NOT NULL,
    color              TEXT             NOT NULL,
    spectral_class     TEXT             NOT NULL,
    predicted_type     SMALLINT         NOT NULL,
    predicted_label    TEXT             NOT NULL,
    confidence         REAL             NOT NULL,
    explanation        TEXT,
    created_at         TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classifications_user_created_idx
    ON classifications (user_id, created_at DESC);

-- Aggregates over predicted types ("which types come up most") are the
-- obvious follow-up question, so give them an index too.
CREATE INDEX IF NOT EXISTS classifications_type_idx
    ON classifications (predicted_type);
