# Celestial Chatbot

An astronomy companion built for the AMURoboclub NSD Hackathon by **Code Clusters**.
Ask it anything about space, show it a photograph of the night sky, or hand it a
star's measurements and have a machine-learning model tell you what kind of star
it is.

## What it does

| Feature | How it works |
| --- | --- |
| **Cosmic Q&A** | Free-text questions about space are answered by Gemini and rendered as markdown. |
| **Image analysis** | Upload a photo of the sky and Gemini describes the objects in it. |
| **Star classifier** | Six physical parameters go to a random forest trained on a stellar catalogue, which predicts the star's type and shows its confidence across all six classes. Gemini then explains the result in plain language. |
| **Archive** | Every question and classification is saved to Postgres under your account. Search runs in the database across everything you have ever saved, not just the rows already on screen. |
| **Stargazing guide** | A live ISS position readout, an interactive star map, and links to trusted public astronomy resources. |

Sign-in is handled by **Auth0**, with both log in and sign up. The classifier
and the archive are only available once you are signed in.

## Architecture

```
frontend/   React + Vite + Tailwind, styled as dark neumorphism via the
            tailwindcss-neumorphism plugin. Signs in with Auth0 and calls the
            backend with the resulting access token.
backend/    Express API. Verifies Auth0 tokens, owns the Gemini calls, reads
            and writes the archive in Postgres, and runs the star classifier.
AI-ML/      Python training code and datasets. Not deployed -- it exports a
            trained model to backend/models/star_model.json, which the
            Express server loads at startup.
```

Only the backend holds database credentials. The browser never talks to
Postgres directly, so the data is reachable only through routes that have
already verified an Auth0 token.

Classifications are stored as **columns, not prose** — temperature, luminosity,
radius, magnitude, colour, spectral class, predicted type and confidence each
get their own field. That is what makes questions like "which types come up
most often" or "show me everything above 10,000 K" answerable, rather than
requiring a sentence to be parsed back apart.

The classifier deliberately needs **no Python at runtime**. `train_star_model.py`
fits a random forest with scikit-learn and serialises every tree to JSON;
`backend/services/starModel.js` walks those trees and averages their votes,
reproducing scikit-learn's own `predict_proba`. One service to deploy, no second
runtime to keep alive.

## Setting up Auth0

Sign-in will not work until an Auth0 tenant is configured. In the
[Auth0 dashboard](https://manage.auth0.com):

1. **Applications → Create Application** → *Single Page Web Application*.
   Note the **Domain** and **Client ID**.
2. In that application's **Settings**, add these and save:
   - Allowed Callback URLs: `http://localhost:5173, https://<your-netlify-site>`
   - Allowed Logout URLs: `http://localhost:5173, https://<your-netlify-site>`
   - Allowed Web Origins: `http://localhost:5173, https://<your-netlify-site>`
3. **Applications → APIs → Create API**. Give it any identifier, for example
   `https://celestial-chatbot/api`. This value is the **audience**.
4. **Authentication → Database** — make sure sign-ups are enabled if you want
   new users to be able to register.

The audience matters more than it looks: without it Auth0 returns an opaque
access token that the backend cannot verify. Frontend and backend must use the
exact same audience string.

## Running it locally

You need Node 18+, and Python 3.9+ only if you want to retrain the model.

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env   # then fill in the values
npm run server
```

`.env` needs a [Gemini API key](https://aistudio.google.com/apikey), your Auth0
domain and audience, and a `DATABASE_URL`. The server refuses to start with a
clear message if any of them are missing.

**Postgres.** Start one locally with Docker:

```bash
docker run -d --name celestial-postgres -e POSTGRES_USER=celestial -e POSTGRES_PASSWORD=celestial_dev -e POSTGRES_DB=celestial -p 5433:5432 -v celestial-pgdata:/var/lib/postgresql/data postgres:16-alpine
```

That maps to host port **5433** to avoid clashing with any Postgres you already
run, and keeps data in a named volume across restarts. The matching URL is:

```
DATABASE_URL=postgresql://celestial:celestial_dev@localhost:5433/celestial
```

Then create the tables (safe to re-run; every statement is idempotent):

```bash
npm run db:migrate --prefix backend
```

Any hosted Postgres works instead — paste its URL and TLS is enabled
automatically for anything that is not localhost.

**2. Frontend**

```bash
cd frontend
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

`.env` needs your Auth0 domain, client ID and audience, plus
`VITE_BACKEND_URL=http://localhost:8080`. The backend allows `localhost:5173`
by default, so no CORS setup is needed for local development. If the Auth0
values are missing the app says exactly which ones, rather than failing
obscurely.

## Retraining the star model

```bash
cd AI-ML
pip install -r requirements.txt
python train_star_model.py            # trains and exports the model
python train_star_model.py --compare  # also scores alternative classifiers
```

This rewrites `backend/models/star_model.json`, which is committed to the repo so
the backend can be deployed without a Python step. Restart the backend to pick up
a new model.

## API

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | – | Health check. |
| `GET` | `/api/advanced-search/options` | – | Model metadata plus the exact colour and spectral-class values the classifier accepts. The frontend builds its dropdowns from this, so the form can never submit a value the model wasn't trained on. |
| `POST` | `/api/advanced-search` | Auth0 token | Classify a star from `temperature`, `luminosity`, `radius`, `absoluteMagnitude`, `color`, `spectralClass`. Returns the predicted type, the probability of every class, any range warnings, and a Gemini explanation. |
| `POST` | `/search` | Auth0 token | Answer a free-text astronomy question. |
| `POST` | `/upload` | Auth0 token | Describe an uploaded image (max 5 MB, images only). |
| `GET` | `/api/archive` | Auth0 token | The user's questions and classifications interleaved, newest first. `?q=` searches the whole archive in the database; `?limit=` caps the page (max 100). |
| `GET` | `/api/archive/stats` | Auth0 token | Count and mean confidence per predicted star type. |
| `POST` | `/api/archive/prompts` | Auth0 token | Save a prompt/response pair. Only used for image descriptions — `/search` and `/api/advanced-search` archive their own output. |

## Known limitations

- **The classifier's 100% cross-validated accuracy is not as impressive as it
  looks.** `stars.csv` holds 240 rows across six cleanly separated classes, so
  the problem is easy by construction. Real observational data is messier, and
  the API flags inputs that fall outside the ranges it was trained on.
- **The star types are coarse.** Six categories cannot capture the full stellar
  zoo, and objects near a boundary (a dim red dwarf against a brown dwarf, say)
  can land on either side. The confidence bars are there to make that visible.
- **The exoplanet model is an experiment, not a feature.** `AI-ML/exoplanet.py`
  classifies Kepler light curves, but raw flux readings are not something a site
  visitor can supply, so it is not wired into the app. Its dataset is also
  heavily imbalanced — read the per-class report, not the accuracy.
- **Gemini model versions get retired.** The default is set in
  `backend/services/gemini.js` and can be overridden with `GEMINI_MODEL`.
- **History saved before the Auth0 and Postgres migrations is gone from the
  app.** Old entries live in Firestore under `users/{firebase-uid}/prompts`,
  keyed by Firebase uids that do not match Auth0 `sub` values. Nothing reads
  them; delete that Firestore project when you are sure you want to.
- **Search is `ILIKE`, not ranked full-text.** Fine at this size, and it finds
  substrings anywhere in a question or answer. If the archive grows large,
  move to `tsvector` with a GIN index, or add `pg_trgm` for fuzzy matching.

## Deployment

The frontend is a static Vite build (Netlify); the backend is a Node service
(Render). Set `ALLOWED_ORIGINS` on the backend to your deployed frontend URL, and
set the frontend's `VITE_BACKEND_URL` to your deployed backend URL. Everything in
the frontend `.env` is bundled into the browser build, so it must contain only
values that are safe to be public.
