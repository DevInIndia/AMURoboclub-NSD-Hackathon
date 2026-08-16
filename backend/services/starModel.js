import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import ExpressError from "../utils/ExpressError.js";

const here = dirname(fileURLToPath(import.meta.url));

// Trained by AI-ML/train_star_model.py -- re-run that script to refresh this file.
const model = JSON.parse(
  readFileSync(join(here, "..", "models", "star_model.json"), "utf-8")
);

const NUMERIC_FIELDS = [
  { key: "temperature", feature: "Temperature", label: "Temperature" },
  { key: "luminosity", feature: "L", label: "Luminosity" },
  { key: "radius", feature: "R", label: "Radius" },
  { key: "absoluteMagnitude", feature: "A_M", label: "Absolute magnitude" },
];

const featureRange = (name) => model.features.find((f) => f.name === name);

const aliasKey = (value) => String(value).trim().toLowerCase().replace(/\s+/g, " ");

/** Canonical colour names the API accepts, ordered coolest to hottest. */
export const colorOptions = Object.keys(model.color_encoding);

/** Spectral classes the API accepts, ordered coolest to hottest. */
export const spectralOptions = Object.keys(model.spectral_encoding);

export const modelInfo = {
  algorithm: model.algorithm,
  trainedOn: model.source_dataset,
  sampleCount: model.sample_count,
  generatedAt: model.generated_at,
  metrics: model.metrics,
  classes: model.classes,
  features: model.features.map(({ name, label, unit, min, max }) => ({
    name,
    label,
    unit,
    min,
    max,
  })),
  colorOptions,
  spectralOptions,
  // The training catalogue as plottable points, so the UI can show the user's
  // star against the same data the classifier learnt from.
  referenceStars: model.reference_stars.map(({ t, l, type }) => ({
    temperature: t,
    luminosity: l,
    type,
  })),
};

/**
 * Turn the request body into the six-value feature vector the tree expects,
 * rejecting anything the model was never trained to read.
 */
function encodeInput(body) {
  const vector = {};

  for (const { key, feature, label } of NUMERIC_FIELDS) {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === "") {
      throw new ExpressError(400, `${label} is required.`);
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new ExpressError(400, `${label} must be a number.`);
    }
    vector[feature] = value;
  }

  if (vector.Temperature <= 0) {
    throw new ExpressError(400, "Temperature must be above absolute zero.");
  }
  if (vector.L <= 0 || vector.R <= 0) {
    throw new ExpressError(400, "Luminosity and radius must be greater than zero.");
  }

  const color = model.color_aliases[aliasKey(body.color)];
  if (!color) {
    throw new ExpressError(400, `Colour must be one of: ${colorOptions.join(", ")}.`);
  }
  vector.Color = model.color_encoding[color];

  const spectralClass = String(body.spectralClass ?? "").trim().toUpperCase();
  if (!(spectralClass in model.spectral_encoding)) {
    throw new ExpressError(
      400,
      `Spectral class must be one of: ${spectralOptions.join(", ")}.`
    );
  }
  vector.Spectral_Class = model.spectral_encoding[spectralClass];

  return { vector, color, spectralClass };
}

/**
 * The dataset only covers a slice of the real sky, so flag inputs that fall
 * outside it -- the tree will still answer, but with far less authority.
 */
function rangeWarnings(vector) {
  return NUMERIC_FIELDS.flatMap(({ feature, label }) => {
    const { min, max, unit } = featureRange(feature);
    const value = vector[feature];
    if (value < min || value > max) {
      return [
        `${label} (${value} ${unit}) lies outside the training data range ` +
          `${min}–${max} ${unit}, so this prediction is an extrapolation.`,
      ];
    }
    return [];
  });
}

/** Walk one exported tree down to a leaf and read off its class probabilities. */
function traverseTree(tree, values) {
  const { feature_index: features, threshold, left, right, proba } = tree;

  let node = 0;
  let depth = 0;
  while (features[node] !== -1) {
    node = values[features[node]] <= threshold[node] ? left[node] : right[node];
    if (++depth > proba.length) {
      throw new ExpressError(500, "Star model is malformed.");
    }
  }
  return proba[node];
}

/** Average every tree's vote, the way scikit-learn's random forest does. */
function predictProbabilities(vector) {
  const values = model.features.map((f) => vector[f.name]);
  const totals = new Array(model.classes.length).fill(0);

  for (const tree of model.trees) {
    const proba = traverseTree(tree, values);
    for (let i = 0; i < totals.length; i++) totals[i] += proba[i];
  }

  return totals.map((total) => total / model.trees.length);
}

/**
 * Classify a star from its physical parameters.
 * Returns the predicted type, the full probability distribution, and any
 * caveats about the input.
 */
export function classifyStar(body) {
  const { vector, color, spectralClass } = encodeInput(body);
  const probabilities = predictProbabilities(vector);

  const ranked = model.classes
    .map((cls) => ({ ...cls, probability: probabilities[cls.id] ?? 0 }))
    .sort((a, b) => b.probability - a.probability);

  const [best] = ranked;

  return {
    prediction: {
      type: best.id,
      label: best.label,
      description: best.description,
      confidence: Number(best.probability.toFixed(4)),
    },
    probabilities: ranked.map(({ id, label, probability }) => ({
      type: id,
      label,
      probability: Number(probability.toFixed(4)),
    })),
    input: {
      temperature: vector.Temperature,
      luminosity: vector.L,
      radius: vector.R,
      absoluteMagnitude: vector.A_M,
      color,
      spectralClass,
    },
    warnings: rangeWarnings(vector),
  };
}
