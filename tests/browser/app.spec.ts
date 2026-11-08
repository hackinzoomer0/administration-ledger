import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";

const nomination = JSON.parse(
  readFileSync(
    new URL("../../database/nominations/republican_2028.json", import.meta.url),
    "utf8",
  ),
);
const assessment = JSON.parse(
  readFileSync(
    new URL("../../database/assessments/current.json", import.meta.url),
    "utf8",
  ),
);
const fullReview = [...nomination.tracking.history]
  .reverse()
  .find((row) => row.wargame);
function scenarioTitle(scenario: { id: string; name: string }) {
  const labels = assessment.nomination.scenario_labels;
  return labels?.wargame_ref === fullReview.id
    ? (labels.scenarios[scenario.id]?.title ?? scenario.name)
    : scenario.name;
}
const eventsDirectory = new URL("../../database/events/", import.meta.url);
const eventCount = readdirSync(eventsDirectory)
  .filter((name) => name.endsWith(".json"))
  .reduce(
    (total, name) =>
      total +
      JSON.parse(readFileSync(new URL(name, eventsDirectory), "utf8")).items
        .length,
    0,
  );
test("current assessment leads with power and nomination judgments", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Current assessment", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Administration power", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "2028 Republican nomination",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(String(eventCount), { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "View basis", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: /Trump named Miller/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close evidence" }).click();
  await expect(
    page.getByRole("heading", { name: "Current assessment", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("nominee page shows substantive assessment and readable policy evidence", async ({
  page,
}) => {
  await page.goto("./#/nominees");
  await expect(
    page.getByRole("heading", { name: "The nomination assessment" }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    "Storage and interface migration",
  );
  for (const name of ["Rand Paul", "Brian Kemp", "Thomas Massie"])
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Tucker Carlson", exact: true }),
  ).toHaveCount(0);
  const snapshot = nomination.tracking.history.at(-1);
  const labels = new Map<string, number>();
  for (const candidate of nomination.candidates) {
    const delta = snapshot.assessments[candidate.id].delta_pp;
    const label =
      delta === null
        ? "Roster baseline"
        : delta === 0
          ? "Estimate held"
          : `${delta > 0 ? "+" : ""}${delta.toFixed(2)} pp`;
    labels.set(label, (labels.get(label) ?? 0) + 1);
  }
  for (const [label, count] of labels)
    await expect(page.getByText(label, { exact: true })).toHaveCount(count);
  await page
    .getByRole("button", { name: "View basis", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).not.toContainText(
    "Major players, factions, goals & backers",
  );
  await expect(
    page.getByRole("dialog").getByRole("link").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close evidence" }).click();
  await page.getByRole("link", { name: "John McEntee", exact: true }).click();
  await page.getByRole("tab", { name: "Positions", exact: true }).click();
  await expect(
    page.getByText("A historical restrictionist staffing record", {
      exact: false,
    }),
  ).toBeVisible();
});
test("research is accessible and processing history is separated", async ({
  page,
}) => {
  await page.goto("./#/research");
  await expect(
    page.getByRole("heading", { name: "Research & review history" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Event ledger", exact: true }).click();
  await page.getByLabel("Search events").fill("Vance");
  await expect(page.getByRole("status")).toContainText(
    `of ${eventCount} records`,
  );
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.goto("./#/research?section=operations");
  await expect(
    page.getByRole("heading", { name: "Processing history", exact: true }),
  ).toBeVisible();
});
test("political profile prioritizes meaning over raw identifiers", async ({
  page,
}) => {
  await page.goto("./#/people/vance");
  await expect(
    page.getByRole("heading", { name: "JD Vance", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Why this person matters" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("peter-thiel");
  await page.getByRole("link", { name: "View the 2028 assessment" }).click();
  await expect(
    page.getByRole("heading", { name: "The nomination case" }),
  ).toBeVisible();
});
test("mobile has compact navigation and both assessment summaries near the top", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Current assessment", exact: true }),
  ).toBeVisible();
  const header = await page.locator("header").boundingBox();
  expect(header!.height).toBeLessThan(90);
  const race = await page
    .getByText(assessment.nomination.headline, { exact: true })
    .first()
    .boundingBox();
  expect(race!.y).toBeLessThan(500);
  await expect(
    page.getByRole("link", { name: "Administration", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "2028 nomination", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "2028 nomination", exact: true })
    .click();
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport + 1);
});

test("all issue pages have policy, players and faction disputes", async ({
  page,
}) => {
  for (const code of [
    "AI",
    "EPS",
    "FED",
    "IMM",
    "IRN",
    "MID",
    "RUS",
    "SUC",
    "TAR",
    "VEN",
  ]) {
    await page.goto(`./#/issues/${code}`);
    await expect(
      page.getByRole("heading", {
        name: "Current policy and the contest over it",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Who is pushing which direction" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Players & interests" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Major players, goals and financial relationships",
      }),
    ).toBeVisible();
    await expect(page.locator("main")).not.toContainText(
      "A current synthesis for this issue has not been established",
    );
  }
});
test("power changes expose numeric assumptions and topic players", async ({
  page,
}) => {
  await page.goto("./#/administration");
  await expect(
    page.getByRole("table", { name: "Projected agenda access changes" }),
  ).toBeVisible();
  await expect(
    page.getByText(assessment.power_method.status, { exact: true }),
  ).toBeVisible();
  await page.goto("./#/administration/white-house-access");
  await expect(
    page.getByRole("heading", {
      name: "Major players, goals and financial relationships",
    }),
  ).toBeVisible();
  await page.goto("./#/nominees/jd_vance");
  await page.getByRole("tab", { name: "Strengths & weaknesses" }).click();
  await expect(
    page.getByRole("heading", { name: "Strengths and weaknesses" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Base & backers" }).click();
  await expect(
    page.getByRole("heading", { name: "Expected base and coalition limits" }),
  ).toBeVisible();
});
test("faction positions have explicit position and structured evidence", async ({
  page,
}) => {
  await page.goto("./#/factions/deal-capital");
  await page.getByRole("tab", { name: "Positions & record" }).click();
  await page.getByRole("button", { name: "AI policy", exact: true }).click();
  await expect(
    page.getByText(
      JSON.parse(
        readFileSync(
          new URL("../../database/assessments/issues.json", import.meta.url),
          "utf8",
        ),
      ).AI.factions.find(
        (row: { faction_id: string }) => row.faction_id === "deal-capital",
      ).position,
    ),
  ).toBeVisible();
  await expect(
    page
      .getByText("Actions supporting that position", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
});

test("issue players use the issue record rather than unrelated biographies and donors", async ({
  page,
}) => {
  await page.goto("./#/issues/AI?section=players");
  await expect(
    page.getByRole("link", { name: "Elizabeth Warren", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("Held $310M of Nvidia");
  await expect(page.locator("main")).not.toContainText("Epstein");
  await expect(page.locator("main")).not.toContainText("Open Society");
  await page.getByRole("tab", { name: "Timeline & sources" }).click();
  await page
    .getByRole("button", { name: "Read context & sources" })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("all eight candidates expose real base, history and source details", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const id of [
    "jd_vance",
    "marco_rubio",
    "ron_desantis",
    "ted_cruz",
    "john_mcentee",
    "rand_paul",
    "brian_kemp",
    "thomas_massie",
  ]) {
    await page.goto(`./#/nominees/${id}?section=base`);
    await expect(
      page.getByText("Potential constituencies", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Barriers to consolidation", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("main")).not.toContainText(
      "likely_constituencies",
    );
    await page
      .getByRole("button", { name: "View supporting sources" })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close evidence" }).click();
    await page.getByRole("tab", { name: "History", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Political and policy history" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "View supporting sources" }).first(),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("mobile detail sections remain reachable without clipped tabs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./#/nominees/john_mcentee");
  await page.getByRole("combobox", { name: "Candidate sections" }).click();
  await page.getByRole("option", { name: "Base & backers" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Paid clients · separate from political backing",
    }),
  ).toBeVisible();
  await page.goto("./#/issues/AI");
  await page.getByRole("combobox", { name: "Issue sections" }).click();
  await page.getByRole("option", { name: "Players & interests" }).click();
  await expect(
    page.getByRole("link", { name: "Howard Lutnick", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("nomination forecast exposes scenario inputs, countercases and dated tests", async ({
  page,
}) => {
  await page.goto("./#/nominees");
  await expect(
    page.getByRole("heading", {
      name: "How events could change the nomination",
    }),
  ).toBeVisible();
  const scenario = fullReview.wargame.scenarios[0];
  await page
    .getByRole("button", {
      name: `${scenario.weight_pct}% chance · ${scenarioTitle(scenario)}`,
      exact: true,
    })
    .click();
  await expect(
    page
      .getByText("Each candidate’s chance of winning in this scenario", {
        exact: true,
      })
      .filter({ visible: true }),
  ).toBeVisible();
  for (const candidate of nomination.candidates)
    await expect(
      page
        .getByText(
          `${candidate.name} · ${scenario.shares_pct[candidate.id]}%`,
          { exact: true },
        )
        .filter({ visible: true }),
    ).toBeVisible();
  await page
    .getByRole("button", {
      name: "How the forecast is calculated",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("What if one scenario became more likely?", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(fullReview.wargame.predictions[0].claim, { exact: true }),
  ).toBeVisible();
});

test("candidate wargame presents a rebuttal and likely moves on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./#/nominees/jd_vance");
  await page.getByRole("combobox", { name: "Candidate sections" }).click();
  await page.getByRole("option", { name: "Wargame", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "How this candidate could win or lose",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("What could upset this assessment", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("What the candidate is likely to do next", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("How rivals could attack them", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Inspect supporting evidence", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toContainText(
    "Major players, factions, goals & backers",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("candidate basis leads with the forecast and explains the causal scenario on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#/nominees");
  const candidate = nomination.candidates.find(
    (row: { id: string }) => row.id === "john_mcentee",
  );
  const link = page.getByRole("link", { name: candidate.name, exact: true });
  const card = link.locator("xpath=../..");
  await card.getByRole("button", { name: "View basis", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await expect(
    drawer.getByText(`${candidate.nomination_likelihood_pct.toFixed(2)}%`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    drawer.getByText(`Full wargame reviewed ${fullReview.date}`, {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    drawer.getByText("How this candidate could win", { exact: true }),
  ).toBeVisible();
  await expect(
    drawer.getByText(
      fullReview.wargame.candidate_debates[candidate.id].best_case,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    drawer.getByText("What could stop them", { exact: true }),
  ).toBeVisible();
  await expect(
    drawer.getByText("What would change the estimate", { exact: true }),
  ).toBeVisible();
  await expect(drawer).not.toContainText(
    "Major players, factions, goals & backers",
  );
  const scenario = fullReview.wargame.scenarios[0];
  const scenarioButton = drawer
    .getByRole("button")
    .filter({ hasText: scenarioTitle(scenario) });
  await scenarioButton.click();
  const path =
    fullReview.wargame.projection_review.scenarios[scenario.id].candidate_paths[
      candidate.id
    ];
  for (const text of [
    path.candidate_response,
    path.voter_response,
    path.donor_media_response,
    path.organization_coalition,
  ])
    await expect(
      scenarioButton
        .locator("xpath=ancestor::*[contains(@class, 'MuiAccordion-root')][1]")
        .getByText(text, { exact: true }),
    ).toBeVisible();
  await expect(
    scenarioButton.getByText(
      `Chance of this scenario: ${scenario.weight_pct}%`,
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(
    scenarioButton.getByText(
      `Chance of winning in this scenario: ${scenario.shares_pct[candidate.id]}%`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(drawer).not.toContainText("comparison_review");
  await expect(
    drawer.getByText("Supporting evidence", { exact: true }),
  ).toBeVisible();
  expect(
    await drawer.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  await drawer.getByRole("button", { name: "Close evidence" }).click();
  await page.getByRole("link", { name: candidate.name, exact: true }).click();
  await page
    .getByRole("button", { name: "Inspect the basis", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Wargame result", { exact: true }),
  ).toBeVisible();
});

test("nomination explanations describe politics rather than numerical repair instructions", async ({
  page,
}) => {
  const audit =
    /inherited.{0,30}(ceiling|floor)|automatic national floor|projection_review|comparison_review|numerical_alternative|recovery\/backlash shares|systemic insulation|model correction|candidate conversion assumptions/i;
  for (const candidate of nomination.candidates) {
    await page.goto(`./#/nominees/${candidate.id}`);
    const read = assessment.nomination.candidates.find(
      (row: { candidate_id: string }) => row.candidate_id === candidate.id,
    );
    await expect(
      page.locator("main").getByText(read.path, { exact: true }),
    ).toBeVisible();
    await expect(page.locator("main")).not.toContainText(audit);
    await page.getByRole("tab", { name: "Wargame", exact: true }).click();
    await expect(page.locator("main")).not.toContainText(audit);
  }
  await page.goto("./#/nominees/john_mcentee");
  await page
    .getByRole("button", { name: "Inspect the basis", exact: true })
    .click();
  const drawer = page.getByRole("dialog");
  await drawer
    .getByRole("button", {
      name:
        fullReview.assessments.john_mcentee.delta_pp === 0
          ? "Why this estimate held"
          : "Why this estimate changed",
      exact: true,
    })
    .click();
  await expect(drawer).not.toContainText(audit);
  for (const scenario of fullReview.wargame.scenarios.filter(
    (row: { weight_pct: number }) => row.weight_pct > 0,
  )) {
    await drawer
      .getByRole("button")
      .filter({ hasText: scenarioTitle(scenario) })
      .click();
    await expect(drawer).not.toContainText(audit);
  }
  await drawer.getByRole("button", { name: "Close evidence" }).click();
  await page.goto("./#/nominees");
  await expect(page.locator("main")).not.toContainText(audit);
});

test("review archive loads after navigation and retains historical forecast access", async ({
  page,
}) => {
  const archiveRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/database/runs/"))
      archiveRequests.push(request.url());
  });
  await page.goto("#/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(archiveRequests).toHaveLength(0);
  await page.goto("#/research");
  await expect(page.getByText("Review archive", { exact: true })).toBeVisible();
  await expect.poll(() => archiveRequests.length).toBeGreaterThan(0);
  await page.goto("#/research?section=methods");
  await page.getByText("Historical forecast records", { exact: true }).click();
  await expect(
    page.getByText("Forecast rationale", { exact: true }).first(),
  ).toBeVisible();
});
