import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

// Applies the schema files. Every statement in them is idempotent, so this is
// safe to run against an existing database and safe to run twice.
const here = dirname(fileURLToPath(import.meta.url));

const readSql = (name) => readFileSync(join(here, name), "utf-8");

async function apply(sql) {
  const client = await pool.connect();
  try {
    // One transaction: a failure halfway leaves nothing behind.
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function migrate() {
  await apply(readSql("schema.sql"));
  console.log("Core schema applied.");

  // The retrieval corpus needs the pgvector extension. It is applied
  // separately and its failure is not fatal: chat, the classifier and the
  // archive all work without it, and retrieval degrades to ungrounded answers.
  try {
    await apply(readSql("schema-vector.sql"));
    console.log("Vector schema applied; grounded answers are available.");
  } catch (error) {
    console.warn(
      `\nVector schema NOT applied: ${error.message}\n` +
        "Retrieval will be disabled and answers will be ungrounded.\n" +
        "This usually means the database image lacks pgvector. The README's\n" +
        "docker command uses pgvector/pgvector:pg16, which includes it.\n"
    );
  }

  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log("Tables:", rows.map((r) => r.table_name).join(", "));
}

migrate()
  .catch((error) => {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
