import { expect, test } from "@playwright/test";
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
  await expect(page.getByText("641")).toHaveCount(0);
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
  await expect(page.getByRole("status")).toContainText("of 641 records");
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
    .getByText("Vance leads; the coalition is not settled.", { exact: true })
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
    page.getByText("Conditional post-handover scenario", { exact: false }),
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
      "Favor commercial chip exports and investment deals over durable export restrictions.",
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

test("all five candidates expose real base, history and source details", async ({
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
