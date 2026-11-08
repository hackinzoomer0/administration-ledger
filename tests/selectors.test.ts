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

import { substantiveSnapshots } from "../src/lib/selectors";
it("selects political research while retaining technical history outside the current assessment", () => {
  const history = [
    { id: "import", type: "imported_baseline" },
    { id: "review", type: "faction_consistency_review" },
    { id: "migration", type: "workflow_migration" },
  ];
  expect(substantiveSnapshots(history).at(-1)?.id).toBe("review");
});

import { latestWargame } from "../src/lib/selectors";
import forecastRecord from "../database/nominations/republican_2028.json";
import type { Snapshot } from "../src/lib/types";
it("keeps the full review date while applying a compact daily test update", () => {
  const full = structuredClone(
    [...forecastRecord.tracking.history].reverse().find((row) => row.wargame),
  ) as unknown as Snapshot;
  const test = full.wargame!.predictions[0];
  const originalStatus = test.status;
  const daily = {
    ...full,
    id: "daily-monitor",
    date: "2026-11-08",
    wargame: undefined,
    wargame_ref: full.id,
    monitoring: {
      summary: "Light monitor",
      prediction_updates: [
        {
          id: test.id,
          status: "unresolved",
          resolution: "Outcome not verified.",
          source_ids: [],
          event_ids: [],
        },
      ],
    },
  };
  const result = latestWargame([full, daily])!;
  expect(result.reviewedAt).toBe(full.date);
  expect(result.snapshotId).toBe(full.id);
  expect(result.game.predictions[0].status).toBe("unresolved");
  expect(test.status).toBe(originalStatus);
});

describe("current nomination projection", () => {
  it("preserves every historical probability while loading old full games only in the archive", async () => {
    const { currentNomination } = await import("../scripts/public-data");
    const { default: original } =
      await import("../database/nominations/republican_2028.json");
    const { latestWargame } = await import("../src/lib/selectors");
    const input = original as unknown as import("../src/lib/types").Nomination;
    const projected = currentNomination(input);
    expect(
      projected.tracking.history.map((row) => row.probabilities_pct),
    ).toEqual(input.tracking.history.map((row) => row.probabilities_pct));
    expect(
      projected.tracking.history.filter((row) => row.wargame),
    ).toHaveLength(1);
    expect(latestWargame(projected.tracking.history)).toEqual(
      latestWargame(input.tracking.history),
    );
    expect(
      input.tracking.history.filter((row) => row.wargame).length,
    ).toBeGreaterThan(1);
  });
});
