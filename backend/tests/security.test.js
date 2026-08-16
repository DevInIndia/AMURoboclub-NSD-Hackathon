import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

/**
 * Integration tests for the security boundary.
 *
 * These run against the real Express app with the real auth middleware -- no
 * auth stubbing -- so a regression that removes a check will fail here rather
 * than passing against a mock.
 */

const PROTECTED = [
  ["get", "/api/archive"],
  ["get", "/api/archive/stats"],
  ["post", "/api/archive/prompts"],
  ["post", "/api/advanced-search"],
  ["post", "/search"],
  ["post", "/upload"],
];

describe("authentication boundary", () => {
  it.each(PROTECTED)("%s %s rejects an anonymous request", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it.each(PROTECTED)("%s %s rejects a forged token", async (method, path) => {
    const res = await request(app)
      [method](path)
      .set("Authorization", "Bearer not.a.real.token");
    expect(res.status).toBe(401);
  });

  // A classic algorithm-confusion attempt: an unsigned token asserting a
  // subject. requireAuth pins RS256 and verifies against the tenant's JWKS.
  it("rejects an alg=none token asserting another user", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ sub: "auth0|victim", aud: "test-audience", iss: "https://test-tenant.eu.auth0.com/" })
    ).toString("base64url");

    const res = await request(app)
      .get("/api/archive")
      .set("Authorization", `Bearer ${header}.${payload}.`);
    expect(res.status).toBe(401);
  });

  it("does not accept a user id supplied in the body instead of a token", async () => {
    const res = await request(app)
      .post("/api/archive/prompts")
      .send({ text: "hi", response: "there", userId: "auth0|victim", user_id: "auth0|victim" });
    expect(res.status).toBe(401);
  });
});

describe("public endpoints", () => {
  it("serves the health check", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  it("serves classifier options without auth", async () => {
    const res = await request(app).get("/api/advanced-search/options");
    expect(res.status).toBe(200);
    expect(res.body.colorOptions).toBeInstanceOf(Array);
  });

  it("leaks no secrets through the options payload", async () => {
    const res = await request(app).get("/api/advanced-search/options");
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/test-key-not-real/);
    expect(body).not.toMatch(/postgres|password|secret|token/i);
  });

  it("returns 404 as JSON for unknown routes", async () => {
    const res = await request(app).get("/definitely-not-a-route");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe("error handling does not leak internals", () => {
  it("returns a generic message for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/advanced-search")
      .set("Content-Type", "application/json")
      .send('{"broken":');

    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at .*\\.js:\d+/); // no stack frames
    expect(body).not.toMatch(/node_modules|C:\\\\|\/home\//); // no filesystem paths
  });

  it("never returns a stack trace on any error response", async () => {
    const res = await request(app).post("/search").send({ name: "x" });
    expect(JSON.stringify(res.body)).not.toMatch(/\bat\s+\w+.*:\d+:\d+/);
  });
});

describe("request size limits", () => {
  it("rejects a JSON body beyond the 32kb cap", async () => {
    const res = await request(app)
      .post("/api/advanced-search")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ blob: "A".repeat(64 * 1024) }));

    // 413 (too large) rather than being parsed and forwarded onward.
    expect([413, 400]).toContain(res.status);
  });

  it("does not parse form-encoded bodies", async () => {
    // The urlencoded parser was removed; nothing should populate req.body from
    // a form post, so this cannot become a vector for the body-parser DoS.
    const res = await request(app)
      .post("/api/archive/prompts")
      .type("form")
      .send("text=a&response=b");
    expect(res.status).toBe(401); // still stopped at auth, never parsed
  });
});

describe("CORS", () => {
  it("allows the local dev origin", async () => {
    const res = await request(app).get("/").set("Origin", "http://localhost:5173");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("refuses an unknown origin", async () => {
    const res = await request(app).get("/").set("Origin", "https://evil.example");
    expect(res.status).toBe(403);
  });

  it("does not reflect an arbitrary origin back", async () => {
    const res = await request(app).get("/").set("Origin", "https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
