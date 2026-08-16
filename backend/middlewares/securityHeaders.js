/**
 * Response hardening headers.
 *
 * This service returns JSON and never renders HTML, so the header set is
 * deliberately small and targeted rather than a blanket copy of a helmet
 * default -- each one below has a reason to exist here.
 */
export function securityHeaders(req, res, next) {
  // Stops a browser from re-interpreting a JSON response as HTML or script,
  // which is the basis of content-sniffing XSS against API responses.
  res.setHeader("X-Content-Type-Options", "nosniff");

  // No page here is meant to be framed; this kills clickjacking against any
  // endpoint that ever returns markup (e.g. an error page).
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("X-Frame-Options", "DENY");

  // Do not spill the full API URL (including any query) to third-party sites.
  res.setHeader("Referrer-Policy", "no-referrer");

  // This API needs none of these capabilities.
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");

  // HSTS is only meaningful over TLS, and asserting it on plain-HTTP local
  // development would pin localhost to https for the developer's browser.
  if (req.secure || req.get("x-forwarded-proto") === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}
