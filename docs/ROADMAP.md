# Celestial Chatbot — Implementation Roadmap

An engineering plan for the proposed next-generation platform. Ordered by
value per unit of risk, not by how impressive each item sounds.

Three proposals from the original blueprint are amended rather than adopted;
each is argued below rather than quietly dropped.

---

## Phase 1 — Structured, guarded AI output

**Status: in progress.** Highest value, lowest risk, and it closes a real
weakness: today Gemini returns freeform markdown that we render as HTML.

### 1a. Response schemas (Zod + Gemini `responseSchema`)

Gemini supports native schema-constrained decoding. Verified against
`gemini-3.5-flash` before planning around it — asked for a star analysis and
got back valid JSON with a correct habitable zone (0.95–1.68 AU for the Sun).

The pipeline is belt-and-braces:

1. Gemini is constrained by `responseSchema` at decode time.
2. The response is parsed and validated with Zod server-side.
3. Failure degrades to the plain-prose path rather than erroring the request.

Step 2 matters even though step 1 exists: schema-constrained decoding governs
*shape*, not *sanity*. A model can return a syntactically perfect
`{"innerBound": -4}`.

**Payoff beyond tidiness:** structured fields can be rendered as real UI —
a habitable-zone band, an evolutionary-stage badge — instead of a wall of
markdown, and they are what the H-R diagram in Phase 3 plots.

### 1b. Scope and boundary guards (pre-flight, before spending a token)

- **Scope enforcement.** Reject off-topic prompts (coding help, financial
  advice, jailbreak attempts) with a 400 *before* invoking Gemini. This is
  cost control as much as safety: the cheapest Gemini call is the one never
  made, and it complements the rate limits already in place.
- **Astrophysical bounds.** Reject physical impossibilities — sub-absolute-zero
  temperatures, negative radii, ages beyond ~13.8 Gyr. Some of this already
  exists in `starModel.js`; this generalises it and applies it to LLM output
  too, catching a hallucinated negative habitable zone before it reaches a user.

---

## Phase 2 — Exoplanet habitability (replacing the unusable flux model)

**Status: done.** `backend/services/exoplanet.js`, `/api/exoplanet`, and the
calculator page. Verified against published values: Earth scores exactly
1.000000, Mars 0.721 against a published ~0.70, and the Sun's conservative
habitable zone comes out at 0.950–1.676 AU against Kopparapu's 0.95–1.68.

`AI-ML/exoplanet.py` asks for raw Kepler `FLUX.1`–`FLUX.5` values. No site
visitor can supply those, which is why it was never wired up. Replacing its
inputs with parameters a person can actually look up is the single best ML
change available.

**Features** (all obtainable from the NASA Exoplanet Archive): planetary
radius (R⊕), orbital period, stellar insolation flux (S⊕), equilibrium
temperature, host star effective temperature.

**One correction on the outputs.** The blueprint lists "Habitability
Probability" as a model output. There is no ground truth for habitability —
we have exactly one known inhabited planet — so a classifier trained on it
would be learning invented labels and reporting a confidence that means
nothing. Splitting the three outputs by what each honestly is:

| Output | What it actually is | How to produce it |
|---|---|---|
| Earth Similarity Index | A published **formula** (Schulze-Makuch et al., 2011) | Compute it. Deterministic, exact, no model. |
| Planet class (Sub-Earth → Jovian) | A **rule-based** taxonomy over radius/mass | Threshold table, or a tree if we want it learnt |
| "In the habitable zone" | A **derived geometric** property | Compute from insolation flux and stellar temperature |

That is not a downgrade: it produces *more* trustworthy numbers than a model
would, and it removes the need to defend a fabricated probability. Real
supervised learning still has a place here — predicting planet class from
noisy observations, or flagging disagreement between reported and derived
values — but it should be applied where labels genuinely exist.

---

## Phase 3 — Interactive Hertzsprung–Russell diagram

The best UI item in the blueprint, and the cheapest of the visual proposals.

We already hold everything needed: temperature, luminosity, and the predicted
class. Plotting the user's star against the main sequence, giant branch and
white-dwarf region turns an opaque label into an explanation — the diagram
shows *why* the classifier said what it said.

**Built with inline SVG or Canvas, not D3.** The dataset is 240 points plus
one marker; D3 would add weight for scales and axes we can write in a few
lines. Revisit if the plot grows interactive brushing or zoom.

---

## Phase 4 — Cosmic RAG with pgvector

Real value for a Q&A tool, and the largest single chunk of work here.

**One correction:** the blueprint claims this yields "zero hallucinations".
It does not. Retrieval grounds the model and *reduces* fabrication, but a
model can still misread, over-generalise, or cite a retrieved passage that
does not support its claim. Presenting a RAG system as hallucination-free is
exactly the overconfidence this feature is meant to fix — so the UI must show
retrieved sources and let readers check them.

**Work involved:**

1. Swap the Postgres image for `pgvector/pgvector:pg16` and enable the
   extension (the current `postgres:16-alpine` does not ship it).
2. Embeddings via Gemini's embedding model; store as `vector(768)`.
3. Ingestion: chunking, embedding, upsert, and re-ingestion on change.
4. Retrieval: cosine similarity with an HNSW index, feeding top-k into the
   prompt with citations carried through to the response.

**The real cost is corpus curation, not code.** Sourcing, licensing and
chunking NASA/ADS/arXiv content is most of the effort. Start narrow — APOD
captions and a fixed set of IAU constants — and prove the retrieval path end
to end before scaling the corpus.

---

## Phase 5 — Space weather and near-Earth objects (as data, not models)

**Status: done.** `backend/services/spaceWeather.js`, `nearEarthObjects.js`,
`cache.js`, and the watchboard on the Stargazing page. Verified against the
live feeds; the cache demonstrably serves 20 requests on zero NASA quota.

Both blueprint items are better served without machine learning.

- **Torino Scale is a defined function**, not a prediction: it is computed
  from impact probability and kinetic energy. NASA's NeoWs API also returns
  the PHA flag directly. Modelling it would be approximating arithmetic we
  can just do — and doing it worse.
- **Solar flare prediction is a live research problem.** A hackathon-grade
  model asserting "24-hour X-class probability" would look authoritative and
  be untrustworthy. The honest version displays **live NOAA SWPC data** —
  current Kp index, active regions, real flare alerts — which is more useful
  and cannot be wrong in the way a bad model can.

Deferred, then reframed: both are API integrations plus deterministic maths.

---

## Phase 6 — Galaxy morphology classifier (and the sidecar question)

The only proposal that genuinely needs a Python runtime, and therefore the
only one that justifies the FastAPI sidecar.

### On the FastAPI + ONNX microservice

**Recommendation: do not build this yet.** It reverses a deliberate decision.

The star classifier is exported to JSON and evaluated in Node precisely so the
project has *one* deployable service and no Python at runtime. It answers in
microseconds from a 236 KB file. Introducing a sidecar to serve it would add a
second deploy target, a second runtime, a network hop, cold starts on free
tiers, and a new failure mode the frontend must handle — to make a fast thing
marginally faster. "Sub-millisecond ONNX inference" solves a problem this
application does not have.

That calculus changes for a CNN. A convolutional model cannot be flattened
into a tree walk, so if the galaxy classifier is built, the sidecar becomes
justified — with the CV model as its reason for existing, not the random
forest.

**Cheaper alternatives to evaluate first:** `onnxruntime-node` in the existing
Express process, or ONNX Runtime Web / TF.js in the browser (inference on the
user's machine, zero server cost).

---

## Phase 7 — 3D visualisation (Three.js / CesiumJS)

Deliberately last. The bundle is already ~600 KB and we have flagged that as a
real issue; Three.js adds roughly 150 KB gzipped before any scene code, and
CesiumJS is far heavier.

The H-R diagram in Phase 3 delivers most of the visual impact at a fraction of
the weight. If 3D goes ahead, it must be **route-level code-split** so only
visitors who open that page pay for it.

---

## Sequencing summary

| Phase | Item | Effort | Risk | Verdict |
|---|---|---|---|---|
| 1 | Zod/Gemini structured output + guards | Low | Low | **Done** |
| 2 | Exoplanet ESI + planet class | Medium | Low | **Done** |
| 3 | H-R diagram | Medium | Low | **Done** |
| 4 | pgvector RAG | High | Medium | Prove narrow, then scale |
| 5 | NeoWs + NOAA space weather | Low | Low | **Done** |
| 6 | Galaxy CV + sidecar | High | High | Only together, and only if wanted |
| 7 | Three.js / Cesium | High | Medium | Last, and code-split |

## Principles carried through

- Compute what is deterministic; model only what genuinely must be learnt.
- Never report a confidence for a quantity with no ground truth.
- Treat model output as untrusted data: validate it before rendering it.
- Every dependency must justify its bundle or deployment cost.
