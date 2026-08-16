import express from "express";
import { classifyStar, modelInfo } from "../services/starModel.js";
import { explainStarPrediction } from "../services/gemini.js";
import { saveClassification } from "../db/archive.js";
import { requireAuth, userId } from "../middlewares/requireAuth.js";
import wrapAsync from "../utils/wrapAsync.js";

const router = express.Router();

// Describes the model and the exact values the form may submit, so the
// frontend never has to hard-code an encoding that could drift from training.
router.get("/options", (req, res) => {
  res.json(modelInfo);
});

router.post(
  "/",
  requireAuth,
  wrapAsync(async (req, res) => {
    const result = classifyStar(req.body);

    // The classification is the answer; the write-up is a bonus. If Gemini is
    // rate-limited or down, still return the prediction rather than failing.
    let explanation = null;
    let explanationError = null;
    try {
      explanation = await explainStarPrediction(result);
    } catch (error) {
      console.error("Gemini explanation failed:", error);
      explanationError = "The AI write-up is unavailable right now.";
    }

    // Archived here rather than by the browser, so the measurements are stored
    // as real columns instead of being re-flattened into a sentence.
    let archiveError = null;
    try {
      await saveClassification(userId(req), { ...result, explanation });
    } catch (error) {
      console.error("Could not archive classification:", error);
      archiveError = "This classification could not be saved to your archive.";
    }

    res.json({
      ...result,
      explanation,
      explanationError,
      archiveError,
      model: {
        algorithm: modelInfo.algorithm,
        trainedOn: modelInfo.trainedOn,
        sampleCount: modelInfo.sampleCount,
        metrics: modelInfo.metrics,
      },
    });
  })
);

export default router;
