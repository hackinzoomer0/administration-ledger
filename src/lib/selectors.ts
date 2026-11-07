import type { EventRecord } from "./types";
export interface EventFilters {
  query: string;
  issue: string;
  faction: string;
  kind: string;
  tier: string;
  from: string;
  to: string;
}
export const emptyFilters: EventFilters = {
  query: "",
  issue: "",
  faction: "",
  kind: "",
  tier: "",
  from: "",
  to: "",
};
export function filterEvents(
  events: EventRecord[],
  filters: EventFilters,
): EventRecord[] {
  const query = filters.query.toLowerCase().trim();
  return events
    .filter(
      (event) =>
        (!query ||
          `${event.actor} ${event.text} ${event.context ?? ""} ${event.source}`
            .toLowerCase()
            .includes(query)) &&
        (!filters.issue || event.issues.includes(filters.issue)) &&
        (!filters.faction ||
          event.by?.includes(filters.faction) ||
          Object.hasOwn(event.fx ?? {}, filters.faction)) &&
        (!filters.kind || event.kind === filters.kind) &&
        (!filters.tier || event.tier === filters.tier) &&
        (!filters.from || event.date >= filters.from) &&
        (!filters.to || event.date <= filters.to),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.weight - a.weight ||
        a.id.localeCompare(b.id),
    );
}
/** Legacy weighted net effects; these are not measures of authority or nomination odds. */
export function legacyNet(events: EventRecord[], faction: string): number {
  return events
    .filter((event) => event.kind !== "scheduled")
    .reduce(
      (total, event) => total + (event.fx?.[faction] ?? 0) * event.weight,
      0,
    );
}
export function safeUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function label(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

export function substantiveSnapshots<T extends { type?: string }>(
  history: T[],
): T[] {
  return history.filter((snapshot) =>
    ["daily_review", "weekly_review", "faction_consistency_review"].includes(
      snapshot.type ?? "",
    ),
  );
}
