# Deployment

Three pieces deploy independently: a static frontend, a Node API, and a
Postgres database. The Python training code is not deployed at all — it only
produces `backend/models/star_model.json`, which is committed.

---

## Where to host the database

**Recommendation: [Neon](https://neon.tech).**

The hard requirement is **Postgres with the `pgvector` extension**. Without it
the app still runs — the migration says so explicitly and answers fall back to
ungrounded — but retrieval and citations are lost.

| | Neon | Supabase | Render Postgres |
|---|---|---|---|
| pgvector on free tier | Yes | Yes | Paid plans only |
| Free storage | 0.5 GB | 0.5 GB | 1 GB |
| Idle behaviour | Scales to zero, wakes in ~1s | **Pauses after 7 days inactive**, needs manual resume | Free instance **expires after 30 days** |
| Connection pooling | Built in (pooled endpoint) | Built in (pgBouncer) | None on free |

**Why Neon over the other two.** Supabase's free tier pausing after a week of
inactivity is the wrong failure mode for a hackathon project that gets
demonstrated occasionally — you would arrive at a judging session with a dead
database. Render's free Postgres expires outright after 30 days, and pgvector
needs a paid plan there anyway, which defeats the point of colocating it with
the API.

Neon scales to zero rather than pausing: the first query after idle takes about
a second and then it is warm. Combined with Render's free tier also sleeping,
the first request after a quiet period is slow either way.

**Use Neon's pooled connection string** (the host containing `-pooler`). The
app's pool is capped at 5 connections precisely for free-tier limits, and the
pooled endpoint handles the rest.

If you later want a dashboard, table editor and storage in one place, Supabase
is the better product — just be aware of the pause, and set a weekly ping if
you go that way.

### Setting it up

1. Create a Neon project, choosing **Postgres 16** and a region near your API.
2. Copy the pooled connection string into the API's `DATABASE_URL`.
3. Enable the extension — the migration does this for you:
   ```bash
   npm run db:migrate --prefix backend
   ```
   It prints `Vector schema applied; grounded answers are available.` on
   success, or a clear warning if pgvector is missing.
4. Populate the corpus (optional but recommended):
   ```bash
   npm run ingest --prefix backend
   ```

TLS certificate verification is **on by default**. If your provider uses a
self-signed certificate, set `DATABASE_SSL_NO_VERIFY=true` — it logs a warning,
because that turns TLS into encryption without authentication.

---

## Backend (Render)

`render.yaml` describes the service. The important parts:

- **`rootDir: backend`** so Render installs and builds only the API.
- **`startCommand: npm run db:migrate && npm start`** so a deploy cannot serve
  traffic against an out-of-date schema. Every migration statement is
  idempotent, so repeated deploys are safe.
- **`TRUST_PROXY=1`** because Render terminates TLS at its proxy. Without it
  every request appears to come from the proxy address and the IP-based rate
  limits would apply to all users collectively.

Set these in the dashboard, never in the repo:

| Variable | Notes |
|---|---|
| `GEMINI_API_KEY` | From [AI Studio](https://aistudio.google.com/apikey) |
| `AUTH0_DOMAIN` | Tenant domain, no scheme |
| `AUTH0_AUDIENCE` | Must match the frontend exactly |
| `DATABASE_URL` | Neon pooled connection string |
| `ALLOWED_ORIGINS` | Your Netlify URL. `localhost:5173` is always allowed |
| `NASA_API_KEY` | Optional; raises 10/hour to 1,000/hour |

**Free tier caveat:** the service sleeps after 15 minutes idle and takes 30–60
seconds to wake. The first request after a quiet period will look broken. If
that matters for a demo, hit the health check a minute beforehand.

---

## Frontend (Netlify)

`netlify.toml` sets the base directory, the SPA fallback and cache headers.
The SPA fallback matters: without it, refreshing on `/stargazing` returns a CDN
404 instead of the app.

Set in the Netlify dashboard:

```
VITE_BACKEND_URL=https://<your-render-service>.onrender.com
VITE_AUTH0_DOMAIN=<tenant>.eu.auth0.com
VITE_AUTH0_CLIENT_ID=<client id>
VITE_AUTH0_AUDIENCE=<same string as the API>
```

Everything prefixed `VITE_` is compiled into the browser bundle, so only put
values there that are safe to be public. Auth0 client IDs are; the Gemini key
and database URL are not, and belong only on the API.

---

## Auth0

Add the deployed frontend URL to all three fields in the Auth0 application
settings, alongside the local ones:

```
https://<your-site>.netlify.app, http://localhost:5173
```

- Allowed Callback URLs
- Allowed Logout URLs
- Allowed Web Origins

The audience must be identical on both sides. A mismatch produces an opaque
token the API cannot verify, which surfaces as every request returning 401.

---

## Deployment order

1. Database first — the API's migration runs at boot and needs it reachable.
2. API second — note its URL.
3. Frontend third, with `VITE_BACKEND_URL` pointing at the API.
4. Add the frontend URL to `ALLOWED_ORIGINS` on the API and to Auth0.

Step 4 is easy to forget and produces a working-looking site whose every
request fails CORS.

---

## Verifying a deployment

```bash
curl https://<api>/                              # "Working"
curl https://<api>/api/advanced-search/options   # model metadata
curl https://<api>/api/space-weather             # live NOAA data
curl -i https://<api>/api/archive                # 401, as it should be
```

The last one matters: it confirms the auth boundary survived deployment. A 200
there would mean the API is serving user data unauthenticated.
