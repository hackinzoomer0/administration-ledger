import { expect, test } from "@playwright/test";
test("navigation, evidence filtering and nominee record", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", {
      name: "Follow the decision. Trace the interests.",
    }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Event ledger", exact: true }).click();
  await page.getByLabel("Search events").fill("Vance");
  await expect(page.getByRole("status")).toContainText("of 641 records");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("tab", { name: "2028 nominees", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Nomination estimates" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "John McEntee", exact: true }).click();
  await page.getByRole("tab", { name: "positions", exact: true }).click();
  await expect(
    page.getByText("A historical restrictionist staffing record", {
      exact: false,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("entity profiles, direct URLs and responsive navigation", async ({
  page,
}) => {
  await page.goto("./#/people/vance");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("tab", { name: "Factions", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Factions and relationships" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#/nominees");
  await expect(
    page.getByRole("heading", { name: "The succession watch" }),
  ).toBeVisible();
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport + 1);
});
