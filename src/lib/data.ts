import type {
  CurrentAssessment,
  IssueAssessment,
  Donor,
  EventRecord,
  Faction,
  Issue,
  Json,
  LedgerData,
  Nomination,
  Person,
} from "./types";

// Vite resolves the database at build time; components never parse HTML or mutate research.
const documents = import.meta.glob("../../database/*/*.json", {
  eager: true,
  import: "default",
});
export function collection<T>(name: string): Record<string, T> {
  return Object.fromEntries(
    Object.entries(documents)
      .filter(([path]) => path.includes(`/database/${name}/`))
      .map(([path, value]) => [
        path
          .split("/")
          .at(-1)!
          .replace(/\.json$/, ""),
        value as T,
      ]),
  );
}
export const data: LedgerData = {
  issueAssessments:
    collection<Record<string, IssueAssessment>>("assessments").issues,
  assessment: collection<CurrentAssessment>("assessments").current,
  events: Object.values(collection<{ items: EventRecord[] }>("events")).flatMap(
    (group) => group.items ?? [],
  ),
  issues: Object.values(collection<Issue>("issues")),
  factions: Object.values(collection<Faction>("factions")),
  people: collection<{ list: Person[] }>("people").all.list,
  donors: collection<{ list: Donor[] }>("donors").all.list,
  nomination: collection<Nomination>("nominations").republican_2028,
  meta: collection<Json>("meta"),
  report: collection<Json>("report"),
  runs: collection<Json>("runs"),
};
export const issueNames = Object.fromEntries(
  data.issues.map((issue) => [issue.code, issue.name]),
);
export const factionNames = Object.fromEntries(
  data.factions.map((faction) => [faction.id, faction.short]),
);
export const activeFactions = data.factions.filter(
  (faction) => !faction.dissolved,
);
