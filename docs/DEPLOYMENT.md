# Deployment

Three pieces deploy independently: a static frontend, a Node API, and a
Postgres database. The Python training code is not deployed at all — it only
produces `backend/models/star_model.json`, which is committed.

---

## Running the whole thing on $0

Every component has a free tier that covers this project. Nothing here needs a
card on file except Render, which asks for one to verify the account but does
not charge the free instance type.

| Component | Provider | Free allowance | The binding constraint |
|---|---|---|---|
| Frontend | Netlify | 100 GB bandwidth, 300 build min/mo | None. The whole `dist` is under 1 MB. |
| API | Render | **750 instance-hours / workspace / month** | Hours, not requests. See below. |
| Database + vectors | Neon | 100 CU-hours/project/mo, 0.5 GB storage | Compute hours, not storage. |
| Auth | Auth0 | 25,000 monthly active users | Not reachable for this project. |
| LLM + embeddings | Google AI Studio | Free tier covers `gemini-3.5-flash` and `gemini-embedding-001` | Requests/day, shared with ingestion. |
| Space weather | NOAA SWPC | Unlimited, no key | None. |
| Asteroids | NASA API | `DEMO_KEY` 10/hr, or 1,000/hr with a free key | Get the free key; it takes a minute. |

Storage is not a concern. A 768-dimension embedding is about 3 KB, so Neon's
0.5 GB holds roughly 150,000 passages. The corpus is a few hundred.

### The keep-alive trap

The obvious fix for Render's 15-minute spin-down is an uptime pinger. Done
naively it *breaks* the free tier rather than saving it:

- Render gives **750 instance-hours per month across the whole workspace**, and
  spun-down time does not count against them. A 31-day month is **744 hours**.
  Pinging every 10 minutes around the clock therefore consumes essentially the
  entire allowance, leaves 6 hours of margin, and permits no second free
  service. Exceeding it **suspends free services until the next calendar
  month** — the worst possible failure the day before a demo.
- Neon's 100 CU-hours is roughly 400 hours at the smallest compute size, and it
  autoscales up to 2 CU, which burns the budget eight times faster.

So ping on a **window, not a loop**. Twelve hours a day is about 372 hours —
comfortably inside both budgets, with the API awake through every plausible
demo or judging slot:

```
*/10 6-22 * * *     https://<your-api>.onrender.com/
```

### Ping `/`, never an API route

This matters more than it looks. `GET /` returns the string `Working` and
touches nothing else:

```js
// backend/app.js:70
app.get("/", (req, res) => {
  res.send("Working");
});
```

Because it issues no query, the pinger keeps Render awake while Neon stays
scaled to zero, and Neon's 100 CU-hours are spent only on real user traffic.
Point the pinger at `/api/space-weather` or any authenticated route instead and
you wake Postgres every ten minutes, draining both budgets at once for no
benefit.

This repository ships that pinger:
[`.github/workflows/keep-api-awake.yml`](../.github/workflows/keep-api-awake.yml).
It runs every ten minutes between 04:00 and 16:00 UTC (09:30-21:30 IST), about
400 instance-hours a month against the 750 allowance, and has a
`workflow_dispatch` trigger so the service can be warmed by hand a minute
before a demo. GitHub Actions is free without limit on public repositories.

Two things to know about it. Scheduled workflows are **disabled automatically
after 60 days without repository activity**, so if the project goes quiet the
keep-alive quietly stops -- re-enable it from the Actions tab. And GitHub makes
no punctuality guarantee for `schedule`; runs are frequently late by several
minutes under load, which is harmless here but means the ping is not a
heartbeat you should measure anything against.

[cron-job.org](https://cron-job.org) and [UptimeRobot](https://uptimerobot.com)
are alternatives if you would rather not depend on Actions.

### What is still slow, and what to do about it

Outside the ping window the first request chains three wakeups: Render boots
the instance, `startCommand` runs `db:migrate`, which connects to a suspended
Neon and wakes it, and only then does the server listen. Budget a full minute.

The migration is idempotent so this is safe, just slow. If a cold demo is
unavoidable, hit the health check a minute beforehand and it will be warm.

---

## Where to host the database

**Recommendation: [Neon](https://neon.tech).**

The hard requirement is **Postgres with the `pgvector` extension**. Without it
the app still runs — the migration says so explicitly and answers fall back to
ungrounded — but retrieval and citations are lost.

| Provider | pgvector on free | Idle behaviour | Pooling |
|---|---|---|---|
| **Neon** | Yes | Scales to zero, wakes in ~1s **automatically** | Built in (pooled endpoint) |
| Supabase | Yes | **Pauses after 7 days idle**, manual resume, ~30s wake | Built in (pgBouncer) |
| Aiven | Not documented | **Powers off inactive free services**, manual reactivation | **None on free** |
| Koyeb | Yes | Auto-sleeps after 5 min, but only **50 active hours/month** | Not documented |
| Render Postgres | Paid plans only | Free instance **expires after 30 days** | None on free |

Neon is not a Postgres-alike: it is stock Postgres speaking the normal wire
protocol, so `pg`, `CREATE EXTENSION vector` and the HNSW queries in
`db/knowledge.js` run unmodified. Nothing in the app knows it is Neon --
`db/pool.js` reads a connection string and only special-cases localhost for
TLS -- so switching provider later is `pg_dump`, `pg_restore` and a new
`DATABASE_URL`.

**Why Neon over the others.** Supabase's free tier pausing after a week of
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

1. Create a Neon project. Take the default Postgres version (Neon currently
   provisions 18.x) and **the same region as the
   Render service** — the API makes several round trips per request (vector
   search, archive write, and `db:migrate` at boot), so a split across
   continents is multiplied on every call. Colocating the two matters more
   than either being near your users.

   Render runs in only four regions: Oregon, Ohio, Frankfurt and Singapore.
   Neither Render nor Neon has an India region, so **for users in India pick
   AWS Asia Pacific 1 (Singapore) on both** — roughly 100-150 ms, against
   250-300 ms for the N. Virginia default that Neon preselects.

   Neon fixes the region when the project is created; changing it later means
   a new project and a dump/restore, so get it right the first time.

   Your Auth0 tenant region is not a factor: the JWKS used to verify tokens is
   cached by `express-oauth2-jwt-bearer`, so it is not a per-request cost.
2. Copy the **pooled** connection string (the host contains `-pooler`). The
   app's pool is capped at 5 connections precisely for free-tier limits, and
   the pooled endpoint absorbs the rest.
3. Put it in `backend/.env` as `DATABASE_URL`, or keep your local Docker URL
   there and aim one-off commands at Neon instead (see below).
4. Apply the schema. This creates the extension, tables and the HNSW index:
   ```bash
   npm run db:migrate --prefix backend
   ```
   Look for `Vector schema applied; grounded answers are available.` If it
   warns instead, pgvector did not install and answers will be ungrounded.
5. Populate the corpus. **This is not optional in practice** — without it
   retrieval returns nothing and every answer is ungrounded with no citations,
   which looks like working RAG but is not:
   ```bash
   npm run ingest --prefix backend
   ```
   It needs `GEMINI_API_KEY` and embeds in batches of 5 with a pause, because
   the free tier is rate limited. Confirm afterwards with:
   ```bash
   npm run ingest --prefix backend -- --stats
   ```

**Leave TLS verification on.** Neon presents a normal publicly-trusted
certificate, so `DATABASE_SSL_NO_VERIFY` is not needed and should stay unset.

#### Running a one-off command against Neon

`dotenv` does not overwrite variables that are already set in the shell, so an
environment variable set for a single command wins over `backend/.env`. This
lets you migrate and seed the hosted database without disturbing local Docker
development.

PowerShell has no inline `VAR=value cmd` syntax, so set and clear it:

```powershell
$env:DATABASE_URL = "<neon pooled connection string>"
npm run db:migrate --prefix backend
npm run ingest --prefix backend
Remove-Item Env:\DATABASE_URL
```

Bash equivalent:

```bash
DATABASE_URL="<neon pooled connection string>" npm run db:migrate --prefix backend
```

If a migration ever fails oddly against the pooled endpoint, rerun it against
the **direct** (non-pooled) connection string. Ordinary application traffic
should always use the pooled one.

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

**Free tier caveat:** the service sleeps after 15 minutes idle and takes 30-60
seconds to wake. The first request after a quiet period will look broken.
See [Running the whole thing on $0](#running-the-whole-thing-on-0) for the
keep-alive window that avoids this without spending the 750-hour allowance.

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
