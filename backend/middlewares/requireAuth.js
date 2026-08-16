import { auth } from "express-oauth2-jwt-bearer";

/**
 * Validates the Auth0 access token on the Authorization header.
 *
 * Auth0 signs tokens with RS256 and publishes its public keys at
 * /.well-known/jwks.json, so this verifies signature, issuer, audience and
 * expiry without the API ever holding a shared secret. On success the decoded
 * token lands on req.auth.payload.
 */
export const requireAuth = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: "RS256",
});

/**
 * The caller's stable Auth0 user id (the `sub` claim, e.g. "auth0|abc123").
 * Everything stored per-user is keyed on this.
 */
export function userId(req) {
  return req.auth.payload.sub;
}
