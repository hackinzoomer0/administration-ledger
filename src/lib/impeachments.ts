import document from "../../database/impeachments/all.json";
import type { ImpeachmentData, ImpeachmentForecast } from "./types";

// Loaded with the Administration/personnel routes, outside the global research payload.
// The Python integrity gate validates this research contract before publication.
export const impeachments = document as unknown as ImpeachmentData;
export const latestImpeachmentReview = impeachments.history.at(-1)!;
export const impeachmentPercent = (value: number | null) =>
  value === null ? "Not estimated" : `${Number(value.toFixed(1))}%`;

type Metric = "joint_pct" | "house_pct" | "conviction_given_impeachment_pct";
export function sortImpeachmentCases<T extends { id: string; name: string }>(
  cases: T[],
  forecasts: Record<string, Pick<ImpeachmentForecast, Metric>>,
  metric: Metric,
) {
  return [...cases].sort((a, b) => {
    const left = forecasts[a.id]?.[metric] ?? -1;
    const right = forecasts[b.id]?.[metric] ?? -1;
    return right - left || a.name.localeCompare(b.name);
  });
}
export function rankedImpeachmentCases(metric: Metric = "joint_pct") {
  return sortImpeachmentCases(
    impeachments.cases,
    latestImpeachmentReview.forecasts,
    metric,
  );
}
