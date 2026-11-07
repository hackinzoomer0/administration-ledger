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
    page.getByRole("heading", { name: "The path and the obstacle" }),
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
