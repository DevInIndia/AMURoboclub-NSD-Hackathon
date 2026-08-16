import "../loadEnv.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
async function generate(request) {
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await model.generateContent(request);
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

/**
 * Explain a star classification in plain language.
 * The type is decided by the trained model, not by Gemini -- this only turns
 * that result into prose, so the wording must not contradict it.
 */
export async function explainStarPrediction({ input, prediction, probabilities }) {
  const runnerUp = probabilities[1];

  return generate(
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
      `\nIn under 200 words of markdown, explain to a curious beginner why a star ` +
      `with these properties is a ${prediction.label}: point to the specific ` +
      `measurements that give it away, place it on the Hertzsprung-Russell diagram, ` +
      `and name a real star that resembles it. Do not contradict the classification ` +
      `and do not invent measurements that were not given.`
  );
}
