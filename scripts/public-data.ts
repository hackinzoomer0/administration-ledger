import type { Nomination } from "../src/lib/types.ts";

/** Historical calculations remain in the lazy archive, not every current-view payload. */
export function currentNomination(input: Nomination): Nomination {
  const result = structuredClone(input);
  const fullId = [...result.tracking.history]
    .reverse()
    .find((row) => row.wargame)?.id;
  result.tracking.history = result.tracking.history.map((row) => {
    if (row.id === fullId) return row;
    return {
      id: row.id,
      date: row.date,
      type: row.type,
      probabilities_pct: row.probabilities_pct,
      assessments: row.assessments,
      summary: row.summary,
      gaps: row.gaps,
      wargame_ref: row.wargame_ref,
      monitoring: row.monitoring,
      comparison: row.comparison,
    };
  });
  return result;
}
