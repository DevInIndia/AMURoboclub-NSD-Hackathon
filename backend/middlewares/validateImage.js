import ExpressError from "../utils/ExpressError.js";

/**
 * Image content validation.
 *
 * multer's fileFilter can only see `file.mimetype`, which is copied from the
 * multipart Content-Type header the client supplied -- an attacker sets it to
 * whatever they like. Checking the leading bytes verifies what the file
 * actually is, independently of what it claims to be.
 */

// Magic numbers for the formats Gemini accepts.
const SIGNATURES = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/bmp", bytes: [0x42, 0x4d] },
];

const startsWith = (buffer, bytes) =>
  bytes.every((byte, index) => buffer[index] === byte);

/** WebP is RIFF....WEBP, so the tag sits at offset 8 rather than 0. */
const isWebp = (buffer) =>
  buffer.length >= 12 &&
  buffer.toString("ascii", 0, 4) === "RIFF" &&
  buffer.toString("ascii", 8, 12) === "WEBP";

/** The real format of a buffer, or null if it is not a supported image. */
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (isWebp(buffer)) return "image/webp";
  return SIGNATURES.find(({ bytes }) => startsWith(buffer, bytes))?.mime ?? null;
}

/**
 * Rejects uploads whose bytes are not a real image, and pins the declared type
 * to the detected one so a mislabelled file is never forwarded to Gemini.
 */
export function validateImageUpload(req, res, next) {
  if (!req.file) {
    return next(new ExpressError(400, "No file uploaded."));
  }

  const detected = detectImageType(req.file.buffer);
  if (!detected) {
    return next(
      new ExpressError(400, "That file is not a readable image (JPEG, PNG, GIF, BMP or WebP).")
    );
  }

  // Trust the bytes, not the header.
  req.file.mimetype = detected;
  next();
}
