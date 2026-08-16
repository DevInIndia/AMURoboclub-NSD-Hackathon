import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Fixed, obviously-fake values so the suite never depends on a developer's
    // .env and never reaches a real Auth0 tenant, database or Gemini key.
    setupFiles: ["./tests/setup.js"],
    // Rate-limit tests share process-wide counters, so files must not race.
    fileParallelism: false,
  },
});
