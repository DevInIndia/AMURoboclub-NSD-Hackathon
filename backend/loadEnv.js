// Loads .env before anything else reads process.env.
//
// This has to live in its own module: ES imports are all evaluated before the
// body of the importing file runs, so calling dotenv.config() inside app.js
// happens *after* the database pool and the Gemini client have already been
// evaluated -- and they would see an empty environment. Importing this module
// first makes the load order explicit and correct.
import dotenv from "dotenv";

dotenv.config();

const REQUIRED = [
  "GEMINI_API_KEY",
  // Auth0 verifies who the caller is...
  "AUTH0_DOMAIN",
  "AUTH0_AUDIENCE",
  // ...and Postgres stores what they asked for.
  "DATABASE_URL",
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(
    `Missing required environment variable(s): ${missing.join(", ")}.\n` +
      `Copy backend/.env.example to backend/.env and fill it in, or set them ` +
      `in your host's environment settings.`
  );
  process.exit(1);
}
