import express from "express";
import { fetchArchive, savePrompt, classificationStats } from "../db/archive.js";
import { requireAuth, userId } from "../middlewares/requireAuth.js";
import wrapAsync from "../utils/wrapAsync.js";
import ExpressError from "../utils/ExpressError.js";

const router = express.Router();

// Every entry the signed-in user has saved, newest first. `q` searches the
// whole archive server-side; `limit` caps the page size.
router.get(
  "/",
  requireAuth,
  wrapAsync(async (req, res) => {
    const entries = await fetchArchive(userId(req), {
      search: req.query.q ?? "",
      limit: req.query.limit,
    });
    res.json({ entries });
  })
);

// How often each star type has been predicted -- the sort of question the old
// prose-in-a-string storage made impossible.
router.get(
  "/stats",
  requireAuth,
  wrapAsync(async (req, res) => {
    res.json({ classifications: await classificationStats(userId(req)) });
  })
);

// Only used for image descriptions now: text questions and classifications are
// saved by the routes that generate them.
router.post(
  "/prompts",
  requireAuth,
  wrapAsync(async (req, res) => {
    const { text, response } = req.body;

    if (!text?.trim() || !response?.trim()) {
      throw new ExpressError(400, "Missing prompt or response");
    }

    const id = await savePrompt(userId(req), { prompt: text, response });
    res.status(201).json({ id: String(id) });
  })
);

export default router;
