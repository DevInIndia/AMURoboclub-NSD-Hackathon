import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * Rate limits.
 *
 * Sign-up is self-service, so "authenticated" is not a meaningful barrier:
 * anyone can register and then call the Gemini-backed routes as often as they
 * like. Without limits that is unbounded spend on our API key, and quota
 * exhaustion denies the feature to everyone else.
 *
 * Limits are keyed on the Auth0 subject where available so that one account
 * cannot dodge the cap by rotating IPs, and fall back to IP for routes reached
 * before authentication runs.
 */

const minutes = (n) => n * 60 * 1000;

// The token's `sub` is only present after requireAuth has verified it, so this
// is trustworthy wherever it is defined -- it cannot be spoofed by a header.
//
// Falling back to a bare req.ip would be bypassable over IPv6: a single user is
// routinely handed a whole /64, so rotating the low bits yields unlimited
// distinct keys. ipKeyGenerator collapses an address to its subnet, leaving
// IPv4 keys untouched.
const keyByUserOrIp = (req) => req.auth?.payload?.sub ?? ipKeyGenerator(req.ip);

const json = (message) => (req, res) => res.status(429).json({ error: message });

/** Broad ceiling for the whole API, mostly to blunt unauthenticated floods. */
export const generalLimiter = rateLimit({
  windowMs: minutes(1),
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  handler: json("Too many requests. Please slow down."),
});

/**
 * Anything that spends money with Gemini. Deliberately tight: these calls take
 * seconds and cost tokens, so a legitimate person will not notice the cap and
 * an abuser hits it immediately.
 */
export const aiLimiter = rateLimit({
  windowMs: minutes(1),
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  handler: json(
    "You are sending requests too quickly. Please wait a moment and try again."
  ),
});

/** Uploads additionally carry bandwidth and image-decoding cost. */
export const uploadLimiter = rateLimit({
  windowMs: minutes(10),
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  handler: json("Too many image uploads. Please wait a few minutes."),
});
