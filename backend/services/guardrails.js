/**
 * Pre-flight guards, applied before Gemini is called.
 *
 * Two jobs: keep the assistant on topic, and refuse physically impossible
 * inputs. Both run before any token is spent, so a rejected request costs
 * nothing -- this is cost control as much as it is safety, and it complements
 * the rate limits rather than replacing them.
 */

/** Astronomical constants used as sanity bounds. */
export const LIMITS = {
  // Nothing has a temperature below absolute zero.
  MIN_TEMPERATURE_K: 0,
  // Comfortably above the hottest known stellar surfaces (~200,000 K for the
  // central stars of some planetary nebulae).
  MAX_TEMPERATURE_K: 250_000,
  // Age of the universe: nothing in it can be older.
  MAX_AGE_GYR: 13.8,
  // Largest known stars are ~2,000 solar radii.
  MAX_RADIUS_SOLAR: 5_000,
  // Absolute magnitude spans roughly -12 (hypergiants) to +20 (faint dwarfs).
  MIN_ABSOLUTE_MAGNITUDE: -15,
  MAX_ABSOLUTE_MAGNITUDE: 25,
};

/**
 * Phrases that indicate the prompt is trying to redirect the assistant away
 * from astronomy, or to extract its instructions.
 *
 * This is a cost and scope filter, not a security boundary: the real
 * protection is that the model has no tools, its output is sanitised before
 * rendering, and it holds no secrets worth extracting. Pattern lists like this
 * are trivially evaded and must never be relied on alone.
 */
const OFF_TOPIC_PATTERNS = [
  // Modifiers stack in practice ("ignore all previous instructions"), so allow
  // any run of them rather than exactly one.
  /\bignore\s+(?:(?:all|any|your|the|previous|prior|above|earlier)\s+)*(instructions|prompts?|rules)\b/i,
  /\b(system|initial|original) prompt\b/i,
  /\byou are now\b/i,
  /\bact as (a|an) (?!astronom|astrophysic|cosmolog)/i,
  // A language or adjective usually sits between the article and the noun
  // ("write me a Python script").
  /\b(write|generate|debug|fix)\s+(me\s+)?(some\s+)?(code|(a|an)\s+(\w+\s+)?(script|program|function|app|website))\b/i,
  /\b(investment|financial|medical|legal) advice\b/i,
  /\bwhat (stocks?|crypto|coins?) should i\b/i,
];

/** Subjects that keep a question in scope even if it trips a generic pattern. */
const ASTRONOMY_TERMS =
  /\b(star|stars|stellar|planet|exoplanet|galax|nebula|cosmic|cosmolog|astronom|astrophysic|space|orbit|comet|asteroid|meteor|moon|lunar|solar|sun|telescope|nasa|isro|esa|jwst|hubble|black hole|supernova|quasar|pulsar|constellation|milky way|universe|light[- ]year|parsec|redshift|spectrum|spectral|luminosit|magnitude|kepler|satellite|iss|eclipse|aurora)\b/i;

/**
 * Decide whether a question should reach the model.
 * Returns { allowed: true } or { allowed: false, reason }.
 */
export function checkQuestionScope(question) {
  const text = String(question ?? "");

  const offTopic = OFF_TOPIC_PATTERNS.find((pattern) => pattern.test(text));
  if (offTopic) {
    // An astronomy question that merely mentions one of these phrases is still
    // an astronomy question, so the subject check gets the final say.
    if (!ASTRONOMY_TERMS.test(text)) {
      return {
        allowed: false,
        reason:
          "This assistant only answers questions about space and astronomy.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Validate numbers the model produced before they reach a user.
 *
 * Schema-constrained decoding governs the *shape* of a response, not its
 * sanity: a model can return a structurally perfect habitable zone whose inner
 * bound is negative. Returns the list of problems found, empty when clean.
 */
export function findImpossibleValues(analysis) {
  const problems = [];

  const zone = analysis?.habitableZoneAU;
  if (zone) {
    if (zone.innerBound <= 0) {
      problems.push("habitable zone inner bound is not positive");
    }
    if (zone.outerBound <= zone.innerBound) {
      problems.push("habitable zone outer bound is not beyond the inner bound");
    }
  }

  if (typeof analysis?.estimatedAgeGyr === "number") {
    if (analysis.estimatedAgeGyr < 0) {
      problems.push("estimated age is negative");
    }
    if (analysis.estimatedAgeGyr > LIMITS.MAX_AGE_GYR) {
      problems.push(
        `estimated age exceeds the age of the universe (${LIMITS.MAX_AGE_GYR} Gyr)`
      );
    }
  }

  if (typeof analysis?.confidenceScore === "number") {
    const { confidenceScore } = analysis;
    if (confidenceScore < 0 || confidenceScore > 1) {
      problems.push("confidence score is outside 0-1");
    }
  }

  return problems;
}
