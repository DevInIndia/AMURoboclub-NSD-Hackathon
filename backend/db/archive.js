import { query } from "./pool.js";

const MAX_LIMIT = 100;

/** Save one question and its answer. */
export async function savePrompt(userId, { prompt, response }) {
  const { rows } = await query(
    `INSERT INTO prompts (user_id, prompt, response)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, prompt, response]
  );
  return rows[0].id;
}

/**
 * Save one star classification with its measurements intact.
 * Storing real columns instead of a prose summary is what makes questions like
 * "which types come up most" answerable later.
 */
export async function saveClassification(userId, { input, prediction, explanation }) {
  const { rows } = await query(
    `INSERT INTO classifications (
       user_id, temperature, luminosity, radius, absolute_magnitude,
       color, spectral_class, predicted_type, predicted_label, confidence,
       explanation
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      userId,
      input.temperature,
      input.luminosity,
      input.radius,
      input.absoluteMagnitude,
      input.color,
      input.spectralClass,
      prediction.type,
      prediction.label,
      prediction.confidence,
      explanation,
    ]
  );
  return rows[0].id;
}

/**
 * One reverse-chronological archive combining both kinds of entry.
 *
 * `search` matches server-side across the full archive. The old Firestore
 * version could only filter the rows already downloaded, so anything past the
 * first page was invisible to the search box.
 */
export async function fetchArchive(userId, { search = "", limit = 50 } = {}) {
  const capped = Math.min(Math.max(Number(limit) || 50, 1), MAX_LIMIT);
  const term = search.trim();
  // ILIKE needs the wildcards in the value, and any literal %/_ the user typed
  // must be escaped or they would act as wildcards.
  const pattern = term ? `%${term.replace(/[%_\\]/g, "\\$&")}%` : null;

  const { rows } = await query(
    `WITH combined AS (
       SELECT
         'prompt'::text AS kind,
         id, created_at, prompt AS title, response AS body,
         NULL::jsonb AS details
       FROM prompts
       WHERE user_id = $1
         AND ($2::text IS NULL OR prompt ILIKE $2 OR response ILIKE $2)

       UNION ALL

       SELECT
         'classification'::text AS kind,
         id, created_at,
         predicted_label AS title,
         explanation AS body,
         jsonb_build_object(
           'temperature', temperature,
           'luminosity', luminosity,
           'radius', radius,
           'absoluteMagnitude', absolute_magnitude,
           'color', color,
           'spectralClass', spectral_class,
           'predictedType', predicted_type,
           'confidence', confidence
         ) AS details
       FROM classifications
       WHERE user_id = $1
         AND ($2::text IS NULL
              OR predicted_label ILIKE $2
              OR explanation ILIKE $2
              OR color ILIKE $2
              OR spectral_class ILIKE $2)
     )
     SELECT * FROM combined
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, pattern, capped]
  );

  return rows.map((row) => ({
    // ids are only unique within their own table, so qualify them for React keys.
    id: `${row.kind}-${row.id}`,
    kind: row.kind,
    title: row.title,
    body: row.body ?? "",
    details: row.details,
    createdAt: row.created_at.toISOString(),
  }));
}

/** How often each star type has been predicted for this user. */
export async function classificationStats(userId) {
  const { rows } = await query(
    `SELECT predicted_label AS label,
            COUNT(*)::int    AS count,
            ROUND(AVG(confidence)::numeric, 3)::float AS average_confidence
     FROM classifications
     WHERE user_id = $1
     GROUP BY predicted_label
     ORDER BY count DESC`,
    [userId]
  );
  return rows;
}
