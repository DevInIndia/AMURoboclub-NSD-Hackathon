import { describe, it, expect, vi } from "vitest";
import { detectImageType, validateImageUpload } from "../middlewares/validateImage.js";

// Minimal buffers carrying each format's real leading bytes.
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(16)]);
const gif = Buffer.concat([Buffer.from("GIF89a", "ascii"), Buffer.alloc(16)]);
const bmp = Buffer.concat([Buffer.from("BM", "ascii"), Buffer.alloc(16)]);
const webp = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.alloc(4),
  Buffer.from("WEBP", "ascii"),
  Buffer.alloc(8),
]);

describe("detectImageType", () => {
  it.each([
    ["png", png, "image/png"],
    ["jpeg", jpeg, "image/jpeg"],
    ["gif", gif, "image/gif"],
    ["bmp", bmp, "image/bmp"],
    ["webp", webp, "image/webp"],
  ])("recognises %s by its magic bytes", (_name, buffer, expected) => {
    expect(detectImageType(buffer)).toBe(expected);
  });

  it("rejects a shell script", () => {
    expect(detectImageType(Buffer.from("#!/bin/sh\\nrm -rf /\\n"))).toBeNull();
  });

  it("rejects HTML, which browsers would otherwise render", () => {
    expect(detectImageType(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
  });

  it("rejects SVG, an XML payload that can carry script", () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });

  it("rejects an empty or truncated buffer", () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    expect(detectImageType(Buffer.from([0x89, 0x50]))).toBeNull();
    expect(detectImageType(undefined)).toBeNull();
  });
});

describe("validateImageUpload", () => {
  const run = (file) => {
    const next = vi.fn();
    validateImageUpload({ file }, {}, next);
    return next.mock.calls[0][0];
  };

  it("passes a real image through", () => {
    expect(run({ buffer: png, mimetype: "image/png" })).toBeUndefined();
  });

  // The core of the fix: multer only sees the client-supplied header, so a
  // non-image can claim to be a PNG and clear the mimetype filter.
  it("rejects a non-image that claims an image mimetype", () => {
    const error = run({ buffer: Buffer.from("#!/bin/sh\\nid"), mimetype: "image/png" });
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.message).toMatch(/not a readable image/i);
  });

  it("corrects a mislabelled mimetype to the detected one", () => {
    const file = { buffer: jpeg, mimetype: "image/png" };
    validateImageUpload({ file }, {}, vi.fn());
    expect(file.mimetype).toBe("image/jpeg");
  });

  it("rejects a missing file", () => {
    const error = run(undefined);
    expect(error.statusCode).toBe(400);
    expect(error.message).toMatch(/no file uploaded/i);
  });
});
