// Environment for the test run.
//
// loadEnv.js exits the process when a required variable is missing, so these
// must be present before any application module is imported. They are
// deliberately fake: nothing in the suite should reach a real Auth0 tenant, a
// real database, or spend a real Gemini token.
process.env.GEMINI_API_KEY = "test-key-not-real";
process.env.AUTH0_DOMAIN = "test-tenant.eu.auth0.com";
process.env.AUTH0_AUDIENCE = "test-audience";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/test_does_not_exist";
process.env.NODE_ENV = "test";
