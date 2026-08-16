import "../loadEnv.js";
import pg from "pg";

const { Pool } = pg;

// Hosted Postgres (Neon, Supabase, Render) requires TLS; a local container has
// no certificate, so only ask for TLS when the URL is not pointing at one.
const url = process.env.DATABASE_URL;
const isLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(url);

// Certificate verification stays ON by default: disabling it accepts any
// certificate, which reverts TLS to encryption without authentication and
// leaves the connection open to interception. Some providers issue
// self-signed certs and genuinely need this, so it is an explicit opt-in
// rather than a silent default.
const skipVerification = process.env.DATABASE_SSL_NO_VERIFY === "true";

if (skipVerification && !isLocal) {
  console.warn(
    "DATABASE_SSL_NO_VERIFY is set: the database certificate is not being verified."
  );
}

export const pool = new Pool({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: !skipVerification },
  // Keep the pool small: the free tiers of hosted Postgres cap connections
  // well below Node's default appetite.
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// A pooled client can die between checkouts (idle timeout, database restart).
// Without a listener, that surfaces as an unhandled error event and takes the
// process down.
pool.on("error", (error) => {
  console.error("Idle Postgres client error:", error);
});

export const query = (text, params) => pool.query(text, params);
