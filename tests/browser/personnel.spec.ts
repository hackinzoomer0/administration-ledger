import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
const document = JSON.parse(
  readFileSync(
    new URL("../../database/impeachments/all.json", import.meta.url),
    "utf8",
  ),
);
const latest = document.history.at(-1);

test("administration exposes personnel forecasts, evidence, history and person links", async ({
  page,
}) => {
  await page.goto("#/administration");
  await page
    .getByRole("link", { name: "View personnel & impeachment forecasts" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Personnel & impeachment", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Could one conviction make the next one easier?",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Kristi Noem ·/ }).click();
  await expect(
    page.getByRole("heading", { name: "Kristi Noem", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Inspect case evidence and defense" })
    .click();
  await expect(
    page.getByRole("link", {
      name: "Judiciary leaders refer Noem for investigation",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      document.cases.find((c: { id: string }) => c.id === "noem").defense,
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Forecast history" }).click();
  await page
    .getByRole("button", {
      name: latest.as_of.replace("T", " ").replace("Z", " UTC"),
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect linked review record" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Inspect linked review record" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Full person profile" }).click();
  await page
    .getByRole("link", { name: "View impeachment forecast & evidence" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Kristi Noem", exact: true }),
  ).toBeVisible();
});

test("mobile personnel navigation and watchlist remain usable without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("#/administration/personnel/wiles");
  await expect(
    page.getByRole("heading", { name: "Susie Wiles", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Not estimated", { exact: true })).toHaveCount(3);
  await page.getByRole("combobox", { name: "Personnel sections" }).click();
  await page.getByRole("option", { name: "Evidence & proceedings" }).click();
  await expect(page.getByText(/Office eligibility: Unresolved/)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test("a real conviction renders as an outcome and carries a sourced response to another case", async ({
  page,
}) => {
  // Synthetic browser fixture exercises the future shared-momentum path without changing research.
  await page.goto("#/administration/personnel");
  await page.evaluate(async () => {
    const modulePath = "/administration-ledger/src/lib/impeachments.ts";
    const { impeachments, latestImpeachmentReview: latest } = (await import(
      modulePath
    )) as typeof import("../../src/lib/impeachments");
    const row = latest.forecasts.noem;
    row.outcomes = {
      house: "occurred",
      conviction: "occurred",
      proceeding_ids: [],
    };
    latest.context.state = "normalization";
    latest.context.assessment =
      "Synthetic first conviction lowered the perceived cost of cross-party votes.";
    latest.context.observation_ids = ["browser-fixture"];
    impeachments.momentum_observations.push({
      id: "browser-fixture",
      date: "2026-11-10",
      kind: "conviction",
      assessment: "Synthetic first conviction.",
      countercase: "The coalition could be exceptional.",
      political_response: "No backlash observed in this test.",
      coalition: "Cross-party coalition in the fixture.",
      scope: "Unrelated cases may be affected.",
      proceeding_ids: [],
      source_ids: ["noem-referral"],
      event_ids: [],
    });
    latest.forecasts.hegseth.momentum.assessment =
      "Synthetic reassessment: the unrelated conviction makes another bipartisan vote easier.";
  });
  await page.getByRole("link", { name: /Kristi Noem ·/ }).click();
  await expect(page.getByText("Occurred", { exact: true })).toHaveCount(3);
  await expect(
    page.getByText("The coalition could be exceptional.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All impeachment cases" }).click();
  await page.getByRole("link", { name: /Pete Hegseth ·/ }).click();
  await expect(
    page.getByText(
      "Synthetic reassessment: the unrelated conviction makes another bipartisan vote easier.",
      { exact: true },
    ),
  ).toBeVisible();
});
