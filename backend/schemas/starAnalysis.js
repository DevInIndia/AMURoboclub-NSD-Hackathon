import { SchemaType } from "@google/generative-ai";
import { z } from "zod";

/**
 * The shape of a star write-up.
 *
 * Two representations of one contract, kept side by side so drift between them
 * is obvious in review:
 *
 *  - GEMINI_STAR_ANALYSIS_SCHEMA constrains decoding, so the model is unlikely
 *    to produce anything else in the first place.
 *  - StarAnalysisSchema (Zod) validates what actually arrived.
 *
 * Both are needed. Constrained decoding governs shape, not sanity -- it will
 * happily emit a structurally perfect habitable zone with a negative inner
 * bound. Zod catches the shape violations; guardrails.js catches the physics.
 */

export const EVOLUTIONARY_STAGES = [
  "Protostar",
  "Main Sequence",
  "Subgiant",
  "Red Giant",
  "Supergiant",
  "Hypergiant",
  "White Dwarf",
  "Brown Dwarf",
];

export const StarAnalysisSchema = z.object({
  evolutionaryStage: z.enum(EVOLUTIONARY_STAGES),

  // Orbital distances where liquid water could persist, in AU.
  habitableZoneAU: z.object({
    innerBound: z.number().positive(),
    outerBound: z.number().positive(),
  }),

  // Prose for the reader. Markdown is allowed; it is sanitised before render.
  summary: z.string().min(1).max(2000),

  // The specific measurements that justify the classification. This is the
  // part that makes the answer checkable rather than merely fluent.
  keyEvidence: z.array(z.string().min(1)).min(1).max(5),

  // A real star with comparable properties, to anchor the numbers.
  similarStar: z.string().min(1).max(120),

  // Caveats the reader should know: extrapolation, unusual combinations.
  caveats: z.array(z.string().min(1)).max(5),
});

/**
 * Deliberately absent: a model-reported confidence score.
 *
 * The classifier already produces a real probability from its own votes. A
 * number the language model invents about its own certainty is not measuring
 * anything, and printing the two side by side would imply they are comparable.
 */
export const GEMINI_STAR_ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    evolutionaryStage: {
      type: SchemaType.STRING,
      format: "enum",
      enum: EVOLUTIONARY_STAGES,
    },
    habitableZoneAU: {
      type: SchemaType.OBJECT,
      properties: {
        innerBound: { type: SchemaType.NUMBER },
        outerBound: { type: SchemaType.NUMBER },
      },
      required: ["innerBound", "outerBound"],
    },
    summary: { type: SchemaType.STRING },
    keyEvidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    similarStar: { type: SchemaType.STRING },
    caveats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: [
    "evolutionaryStage",
    "habitableZoneAU",
    "summary",
    "keyEvidence",
    "similarStar",
    "caveats",
  ],
};
