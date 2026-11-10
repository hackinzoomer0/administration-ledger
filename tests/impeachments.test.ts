import { describe, expect, it } from "vitest";
import {
  impeachmentPercent,
  sortImpeachmentCases,
} from "../src/lib/impeachments";
describe("personnel forecasts", () => {
  it("keeps unestimated cases after zero risk and distinguishes House from overall exposure", () => {
    const cases = ["unestimated", "house-leader", "joint-leader", "zero"].map(
      (id) => ({ id, name: id }),
    );
    const forecasts = {
      unestimated: {
        house_pct: null,
        joint_pct: null,
        conviction_given_impeachment_pct: null,
      },
      "house-leader": {
        house_pct: 80,
        joint_pct: 8,
        conviction_given_impeachment_pct: 10,
      },
      "joint-leader": {
        house_pct: 40,
        joint_pct: 20,
        conviction_given_impeachment_pct: 50,
      },
      zero: { house_pct: 0, joint_pct: 0, conviction_given_impeachment_pct: 0 },
    };
    expect(
      sortImpeachmentCases(cases, forecasts, "house_pct").map((c) => c.id),
    ).toEqual(["house-leader", "joint-leader", "zero", "unestimated"]);
    expect(sortImpeachmentCases(cases, forecasts, "joint_pct")[0].id).toBe(
      "joint-leader",
    );
    expect(cases[0].id).toBe("unestimated");
    expect(impeachmentPercent(null)).toBe("Not estimated");
    expect(impeachmentPercent(0)).toBe("0%");
  });
});
