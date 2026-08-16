---
description: Adversarial security and production-hardening audit of this application
---

# Adversarial Security & Production Hardening Audit

You are acting as a senior application security engineer, penetration tester, and production code reviewer.

This application may have been substantially generated with AI/vibe coding. Assume that some code is superficially convincing but insecure, incomplete, over-permissive, or based on incorrect assumptions.

Your job is not to tell me that the application looks secure.
Your job is to find ways an attacker could compromise it, explain exactly why those attacks work, and then fix the problems you find.

Treat this as a pre-production security audit for a real application exposed to the public internet.

## Rules

1. Do not trust comments, variable names, UI restrictions, or developer claims as security controls.
2. Trace security decisions to the actual server-side enforcement.
3. Never assume that hiding a button or route from the UI provides authorization.
4. Never assume an authenticated user is authorized to access a resource.
5. Treat every client-supplied value as attacker-controlled.
6. Treat every uploaded file, URL, webhook, OAuth callback, API request, cookie, header, query parameter, form field, and database identifier as potentially malicious.
7. Look for security flaws that are especially common in AI-generated code:
   - placeholder security logic
   - TODO security checks
   - "temporary" bypasses
   - hardcoded admin/user IDs
   - trusting `user_id` from the client
   - fake authentication middleware
   - incomplete authorization
   - permissive database policies
   - secrets accidentally exposed to the browser
   - debug endpoints
   - test accounts
   - development-only bypasses left enabled
   - unsafe defaults
   - overly broad CORS
   - missing rate limits
   - swallowed exceptions
   - verbose errors
   - insecure generated dependencies
   - duplicated security logic that has drifted
8. Do not stop after finding the first vulnerability.
9. Do not make speculative findings without explaining the evidence.
10. Distinguish clearly between: confirmed vulnerability / likely vulnerability requiring runtime verification / security weakness / hardening recommendation.
11. Do not merely recommend a security tool. Inspect the actual application.
12. Do not declare the application secure just because tests pass.
13. Do not weaken functionality merely to make a finding disappear. Preserve intended behavior while fixing the underlying security issue.

## PHASE 1 — Understand the Application

Map the application before changing anything. Identify: framework and runtime, frontend architecture, backend architecture, API routes, server actions, serverless functions, middleware, authentication provider, authorization model, database, database policies/RLS, storage/file-upload system, external APIs, payment integrations, email integrations, OAuth integrations, AI/LLM integrations, background jobs, cron jobs, webhooks, admin functionality, privileged operations, deployment platform, environment variables, build configuration, CI/CD configuration, third-party dependencies.

Create a concise architecture/security map, then identify the application's trust boundaries.

## PHASE 2 — Attack Surface Enumeration

Enumerate every externally reachable attack surface: every API endpoint, HTTP method, route, server action, mutation, form, query parameter, path parameter, request body, cookie, authentication flow, authorization check, file upload, URL fetch, webhook, OAuth callback, admin endpoint, internal endpoint that could accidentally be public, client-side API call, and database operation.

For each endpoint determine: Is authentication required? Is authorization required? How is the current user identified? Can the user manipulate the resource ID? Is ownership actually verified server-side? Is input validated? Is there rate limiting? Is CSRF relevant? Can the endpoint be called directly without using the UI? What happens when malformed or unexpected data is supplied? What sensitive information can it return? Can it be abused repeatedly? Can it cause expensive operations?

Pay particular attention to IDOR/BOLA vulnerabilities: determine whether changing `/users/123` to `/users/124`, or `{"userId":"123"}` to another user's ID, could expose or modify another user's data.

## PHASE 3 — Authentication

Perform a hostile review of authentication: password hashing, password reset, email verification, session creation, session expiration, session invalidation, logout, session rotation, privilege changes, account takeover paths, brute-force protection, credential stuffing protection, login enumeration, MFA, OAuth state validation, OAuth redirect validation, JWT verification, JWT expiration, JWT algorithm handling, cookie security (`HttpOnly`, `Secure`, `SameSite`), session fixation, password reset token entropy/expiration/reuse, account recovery.

Look specifically for authentication code that appears secure but can be bypassed through another route.

## PHASE 4 — Authorization

Assume authentication works perfectly, then attempt to bypass authorization. For every privileged operation determine who is allowed to perform it, then find where that rule is enforced.

Check: horizontal privilege escalation, vertical privilege escalation, admin route bypass, user-to-user access, organization/tenant isolation, ownership checks, role checks, subscription/plan checks, feature flags treated as authorization, client-side-only authorization, hidden UI controls, predictable resource IDs, mass assignment, privilege escalation through request parameters.

Never accept "the frontend doesn't expose this" as a security control.

## PHASE 5 — Database Security

Audit every database interaction: SQL injection, unsafe query construction, ORM escape/bypass mistakes, raw SQL, dynamic table/column names, unsafe filters, mass assignment, over-broad queries, missing tenant isolation, missing ownership checks, insecure database policies, disabled RLS, RLS policies that effectively allow everyone, service-role credentials reaching the client, privileged database connections used unnecessarily, database credentials in source code, database credentials in client bundles, excessive data returned from queries.

If using row-level security, inspect the actual policies, not merely whether RLS is enabled. Test whether an ordinary authenticated or anonymous user can access another user's records.

## PHASE 6 — Secrets & Sensitive Data

Search the entire repository and build output for API keys, private keys, database credentials, JWT secrets, service-role keys, OAuth secrets, payment secrets, webhook secrets, SMTP credentials, cloud credentials, tokens, passwords, and connection strings.

Check source code, `.env` files, `.env.example`, git history, build output, source maps, client JavaScript, public directories, logs, error responses, and API responses.

Anything shipped to the browser must be considered public. If a secret has previously been committed to git, treat it as compromised and recommend rotation rather than merely deleting it from the current file.

## PHASE 7 — Injection

Audit for SQL injection, NoSQL injection, command injection, XSS (stored, reflected, DOM), template injection, HTML injection, CSS injection, LDAP injection, path traversal, malicious file names, and unsafe URL handling.

Trace user-controlled input all the way from entry point to dangerous sink. Do not assume framework defaults protect code that bypasses those defaults.

## PHASE 8 — SSRF & Server-Side Fetching

Find every place the server fetches a URL supplied directly or indirectly by a user. Test the design against localhost, private IP ranges, cloud metadata endpoints, internal hostnames, alternate IP representations, redirects, DNS rebinding, and non-HTTP protocols.

Verify that SSRF protections happen after URL parsing and throughout redirects, not merely through a naive string comparison.

## PHASE 9 — File Uploads

If uploads exist, audit MIME validation, extension validation, content validation, file size limits, filename handling, path traversal, executable uploads, SVG/HTML uploads, malicious archives, image processing, storage permissions, public/private bucket configuration, signed URLs, and authorization when downloading files.

Determine whether one user can access another user's uploaded files.

## PHASE 10 — Webhooks & Payments

For every webhook: verify signatures cryptographically, reject unsigned requests, validate timestamps, prevent replay attacks, verify event types, verify resource ownership, make processing idempotent, and do not trust client-supplied payment status.

Never accept `paymentStatus = "paid"` from the client as proof of payment.

## PHASE 11 — Rate Limiting & Abuse

Identify expensive or abuse-prone operations: login, signup, password reset, email sending, OTP, search, scraping endpoints, AI/LLM calls, image generation, file processing, exports, expensive database queries, payment operations, invitation systems, public API endpoints.

Check for IP-based limits, account-based limits, concurrency limits, request body limits, file-size limits, pagination limits, maximum query complexity, maximum token/output usage, and abuse of free resources. Do not rely exclusively on frontend throttling.

## PHASE 12 — Security Headers & Browser Security

Inspect production responses for appropriate Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors/clickjacking protection, and CORS configuration.

Do not blindly add headers that break legitimate functionality.

## PHASE 13 — Error Handling & Information Leakage

Try malformed requests and unexpected failures. Look for exposure of stack traces, source paths, SQL errors, database schemas, internal hostnames, environment variables, API keys, framework versions, dependency versions, internal IDs, and debugging information.

## PHASE 14 — Dependency & Supply Chain Security

Inspect package manifests, lock files, dependency versions, abandoned packages, suspicious packages, typosquatting risks, unnecessary dependencies, install/build scripts, postinstall scripts, and compromised or untrusted dependencies.

Run the ecosystem's dependency vulnerability audit. Do not automatically upgrade everything — identify security-relevant upgrades and compatibility risks.

## PHASE 15 — AI / LLM Security

If the application uses an LLM, audit for prompt injection, indirect prompt injection, system prompt leakage, sensitive information disclosure, insecure tool use, excessive agent permissions, untrusted content treated as instructions, arbitrary URL fetching, arbitrary code/tool execution, unsafe function calling, cross-user conversation leakage, cross-tenant context leakage, secrets included in prompts, user-controlled prompts influencing privileged operations, model output trusted as authorization, and model output inserted into HTML/SQL/commands without validation.

Treat model output as untrusted data, not trusted code or policy. If the LLM can call tools, determine the maximum damage an attacker could cause through prompt injection.

## PHASE 16 — "Vibe-Coded Giveaway" Audit

Search specifically for signs of rapid AI generation with security shortcuts: `TODO: implement auth`, `TODO: security`, `FIXME`, `temporary`, `for now`, `development only`, `skip auth`, `bypass`, `mock`, `fake`, `test user`, hardcoded user/admin IDs, hardcoded passwords, placeholder authorization, suspicious `return true`/`return false` in security functions, swallowed exceptions, empty catch blocks, `console.log` containing sensitive data, commented-out security checks, duplicated auth logic, inconsistent validation, inconsistent error handling, enormous catch-all API handlers, client-side authorization, secrets prefixed as public/client environment variables, exposed source maps, debug routes, test endpoints, unlinked admin endpoints, undocumented API routes, CORS wildcards, `dangerouslySetInnerHTML`, raw SQL, shell execution, arbitrary URL fetching, insecure redirects, permissive database policies, and security checks that exist only in UI code.

Do not remove harmless code merely because it looks "AI generated". The goal is to find security consequences, not stylistic differences.

## PHASE 17 — Production Configuration

Review production configuration separately from application code: HTTPS enforcement, TLS configuration, environment variables, production debug mode, CORS, cookies, headers, database exposure, storage bucket exposure, DNS security, logging, monitoring, backups, deployment permissions, CI/CD secrets, preview deployments, staging environments, test environments, publicly accessible admin tools.

Check whether staging/preview environments accidentally contain production credentials or production data.

## PHASE 18 — Adversarial Attack Paths

Do not only identify individual vulnerabilities — chain them together. For example: find an unauthenticated endpoint, determine whether it reveals an internal ID, whether that ID can access another endpoint, whether that endpoint lacks ownership validation, and whether the resulting data enables privilege escalation.

Prioritize vulnerabilities leading to account takeover, arbitrary data access, cross-user or cross-tenant data access, admin access, arbitrary code execution, secret theft, payment fraud, database destruction, significant financial/API-cost abuse, persistent XSS, or mass data extraction.

## PHASE 19 — Fix The Problems

Produce the findings first; do not immediately rewrite the application. Then fix in severity order: Critical, High, Medium, Low.

For every fix: make the smallest safe change, preserve existing functionality, use framework-native security mechanisms, avoid unnecessary dependencies, add regression tests, verify the fix, and check for equivalent vulnerabilities elsewhere.

Never "fix" a vulnerability by hiding the affected UI. The server/database must enforce the security boundary.

## PHASE 20 — Verification

Re-audit the affected attack paths. For each Critical/High finding, demonstrate Before (why the attack was possible) and After (why it is now blocked).

Run existing tests, type checking, linting, build, dependency audit, and relevant security tests. Do not claim a test passed unless you actually ran it.

## FINAL REPORT

**Executive Summary** — overall security posture, whether the application is production-ready, number of Critical/High/Medium/Low findings, most dangerous attack path, biggest "vibe-coded" security smell.

**Critical / High / Medium / Low Findings** — for each: Title, Severity, Confidence, Affected files/routes, Vulnerability, Attack scenario, Why existing protection fails, Impact, Exact remediation, Verification performed.

**Security Strengths** — protections genuinely present and verified.

**Remaining Unknowns** — anything unverifiable due to missing runtime access, credentials, or infrastructure.

**Production Readiness** — choose exactly one: SAFE TO SHIP / SHIP ONLY AFTER HIGH/CRITICAL FIXES / NOT SAFE TO SHIP. Do not choose "SAFE TO SHIP" merely because no vulnerability was found; state what was actually tested and what remains unknown.

## IMPORTANT

Be adversarial. Assume the attacker is technically competent and can inspect JavaScript bundles, call APIs directly, modify every request and client-side value, skip the UI, create multiple accounts, replay requests, manipulate IDs, send malformed requests, inspect public source maps, inspect network traffic, fuzz inputs, read publicly accessible files, attempt prompt injection, and abuse expensive endpoints.

Do not optimize this audit for making the developer feel comfortable. Optimize it for preventing a real breach.

Remember:
- A polished UI is not evidence of a secure application.
- An authenticated request is not evidence of authorization.
- A hidden route is not a protected route.
- A client-side check is not a security boundary.
- An enabled RLS feature is not evidence that the RLS policies are correct.
- A secret in an environment variable is not secret if the variable is exposed to the browser.
- A successful test suite is not a security audit.
