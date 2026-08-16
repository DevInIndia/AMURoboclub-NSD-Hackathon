import "../loadEnv.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  StarAnalysisSchema,
  GEMINI_STAR_ANALYSIS_SCHEMA,
} from "../schemas/starAnalysis.js";
import { findImpossibleValues } from "./guardrails.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Google retires model versions, and the app broke once already because it was
// pinned to gemini-2.0-flash-exp. If answers start failing with a 404, list the
// current models and update this default (or set GEMINI_MODEL):
//   curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
});

const RETRY_STATUSES = new Set([429, 500, 503]);
const MAX_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call Gemini, retrying the transient failures that free-tier keys run into
 * (rate limits and "model is experiencing high demand") with a short backoff.
 */
async function generate(request, generationConfig) {
  // Callers pass either a bare prompt string or a full request object. Spread
  // only works on the latter, so normalise before attaching any config.
  const payload =
    typeof request === "string"
      ? { contents: [{ role: "user", parts: [{ text: request }] }] }
      : request;

  for (let attempt = 1; ; attempt++) {
    try {
      const result = await model.generateContent(
        generationConfig ? { ...payload, generationConfig } : payload
      );
      return result.response.text();
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !RETRY_STATUSES.has(error.status)) throw error;
      console.warn(
        `Gemini returned ${error.status}, retrying (${attempt}/${MAX_ATTEMPTS - 1})`
      );
      await sleep(500 * 2 ** (attempt - 1));
    }
  }
}

/** Answer a free-text question about space. */
export async function askAstronomy(question) {
  return generate(
    `You are an enthusiastic astronomy guide. Answer the following question in ` +
      `terms of astronomy and space, using markdown. If the question is not about ` +
      `space or astronomy, say so briefly and steer the reader back to the cosmos.\n\n` +
      `Question: ${question}`
  );
}

/** Describe the astronomical content of an uploaded image. */
export async function describeImage(buffer, mimeType) {
  return generate({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: buffer.toString("base64"), mimeType } },
          {
            text:
              "Describe the astronomical objects or scene in this image. " +
              "If it is not a photograph of the sky or of space, say so plainly.",
          },
        ],
      },
    ],
  });
}

const starPrompt = ({ input, prediction, probabilities }) => {
  const runnerUp = probabilities[1];

  return (
    `A machine-learning classifier trained on stellar data has classified a star ` +
    `as a ${prediction.label} with ${(prediction.confidence * 100).toFixed(1)}% confidence, ` +
    `based on these measurements:\n` +
    `- Surface temperature: ${input.temperature} K\n` +
    `- Luminosity: ${input.luminosity} times the Sun\n` +
    `- Radius: ${input.radius} solar radii\n` +
    `- Absolute magnitude: ${input.absoluteMagnitude}\n` +
    `- Colour: ${input.color}\n` +
    `- Spectral class: ${input.spectralClass}\n` +
    (runnerUp ? `The next most likely type was ${runnerUp.label}.\n` : "") +
    `\nExplain to a curious beginner why a star with these properties is a ` +
    `${prediction.label}. The summary should be under 200 words. Point to the ` +
    `specific measurements that give it away, estimate the habitable zone in AU ` +
    `from the luminosity, and name a real star that resembles it. Do not ` +
    `contradict the classification and do not invent measurements that were ` +
    `not given.`
  );
};

/**
 * Explain a star classification as validated, structured data.
 *
 * The type is decided by the trained model, not by Gemini -- this only turns
 * that result into an explanation, so the wording must not contradict it.
 *
 * Returns { analysis, summary } where `analysis` is null if the model's output
 * failed validation. The caller keeps the prediction either way: a bad
 * write-up must never take the classification down with it.
 */
export async function explainStarPrediction(result) {
  const raw = await generate(starPrompt(result), {
    responseMimeType: "application/json",
    responseSchema: GEMINI_STAR_ANALYSIS_SCHEMA,
  });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error("Gemini returned unparseable JSON:", error.message);
    return { analysis: null, summary: null };
  }

  const validated = StarAnalysisSchema.safeParse(parsed);
  if (!validated.success) {
    console.error(
      "Gemini response failed schema validation:",
      validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    );
    // The prose is still usable even when a structured field is malformed.
    return { analysis: null, summary: typeof parsed.summary === "string" ? parsed.summary : null };
  }

  // Shape was right; now check the physics.
  const impossible = findImpossibleValues(validated.data);
  if (impossible.length) {
    console.error("Gemini response contained impossible values:", impossible.join("; "));
    return { analysis: null, summary: validated.data.summary };
  }

  return { analysis: validated.data, summary: validated.data.summary };
}
