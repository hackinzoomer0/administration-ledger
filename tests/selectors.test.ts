import { describe, expect, it } from "vitest";
import {
  emptyFilters,
  filterEvents,
  legacyNet,
  safeUrl,
} from "../src/lib/selectors";
import type { EventRecord } from "../src/lib/types";
const event: EventRecord = {
  id: "e1",
  date: "2026-11-07",
  precision: "day",
  issues: ["IRN", "SUC"],
  kind: "act",
  actor: "Vance",
  text: "Negotiating an agreement",
  source: "Example",
  tier: "reported",
  weight: 3,
  by: ["vance"],
  fx: { hawks: -1 },
};
describe("research selectors", () => {
  it("finds cross-issue episodes through any linked issue and faction effects", () => {
    expect(
      filterEvents([event], {
        ...emptyFilters,
        issue: "SUC",
        faction: "hawks",
      }),
    ).toEqual([event]);
    expect(filterEvents([event], { ...emptyFilters, issue: "FED" })).toEqual(
      [],
    );
  });
  it("combines text, evidence and dates without losing month precision", () => {
    const monthly = { ...event, id: "e2", date: "2026-10", precision: "month" };
    expect(
      filterEvents([monthly, event], {
        ...emptyFilters,
        query: "VANCE",
        tier: "reported",
        from: "2026-11-01",
      }),
    ).toEqual([event]);
  });
  it("excludes scheduled entries from legacy effects", () => {
    expect(legacyNet([event, { ...event, kind: "scheduled" }], "hawks")).toBe(
      -3,
    );
  });
  it("rejects executable and local-file source links", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("file:///private")).toBeUndefined();
    expect(safeUrl("https://example.com/evidence")).toBe(
      "https://example.com/evidence",
    );
  });
});
