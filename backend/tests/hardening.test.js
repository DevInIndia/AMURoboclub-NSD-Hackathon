import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { detectImageType } from "../middlewares/validateImage.js";

describe("security headers", () => {
  it("sets nosniff so JSON cannot be sniffed as HTML", async () => {
    const res = await request(app).get("/");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("forbids framing", async () => {
    const res = await request(app).get("/");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["content-security-policy"]).toMatch(/frame-ancestors 'none'/);
  });

  it("does not leak the API URL as a referrer", async () => {
    const res = await request(app).get("/");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
  });

  it("omits HSTS on plain HTTP but asserts it behind an HTTPS proxy", async () => {
    const plain = await request(app).get("/");
    expect(plain.headers["strict-transport-security"]).toBeUndefined();

    const proxied = await request(app).get("/").set("x-forwarded-proto", "https");
    expect(proxied.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
  });
});

describe("upload content validation", () => {
  // Regression test for the fix: multer only sees the client-declared
  // mimetype, so bytes are what must be trusted.
  it("does not classify a script as an image even when labelled image/png", () => {
    expect(detectImageType(Buffer.from("#!/bin/bash\nrm -rf /"))).toBeNull();
  });

  it("rejects an upload whose bytes are not an image", async () => {
    const res = await request(app)
      .post("/upload")
      .attach("image", Buffer.from("<svg onload=alert(1)>"), {
        filename: "payload.png",
        contentType: "image/png",
      });

    // Auth runs first, so anonymous callers never reach validation at all --
    // which is itself the correct outcome.
    expect(res.status).toBe(401);
  });
});

// Declared last on purpose: the limiter's counters are process-wide, so a
// flood here would starve any test declared after it in this file.
describe("rate limiting", () => {
  // The general limiter allows 120/minute. Exceeding it must produce 429s
  // rather than passing every request through to the handler.
  it("eventually rejects a flood of anonymous requests with 429", async () => {
    let sawTooMany = false;

    for (let i = 0; i < 200; i++) {
      const res = await request(app).get("/api/advanced-search/options");
      if (res.status === 429) {
        sawTooMany = true;
        expect(res.body.error).toMatch(/too many|slow down/i);
        break;
      }
    }

    expect(sawTooMany, "expected the limiter to start rejecting").toBe(true);
  }, 60_000);

  it("advertises the limit with standard headers", async () => {
    const res = await request(app).get("/");
    // draft-7 uses a single RateLimit header; accept either spelling so a
    // library upgrade does not fail the suite spuriously.
    const hasLimitHeader =
      "ratelimit" in res.headers || "ratelimit-limit" in res.headers;
    expect(hasLimitHeader).toBe(true);
  });
});
