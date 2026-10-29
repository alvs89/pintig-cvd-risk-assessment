import {completePreAssessment} from "./preAssessmentHelpers";
import { test, expect } from "@playwright/test";

test("live results display automatic probability and signed-factor graphs without fabricated CIF", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
  await page.getByRole("button", { name: "Prefill questionnaire" }).click();
  await completePreAssessment(page);
  await page.getByRole("button", { name: "Review 10-year risk result →" }).click();
  await expect(page.getByRole("figure", { name: /Ten-year probability overview/i })).toBeVisible();
  await expect(page.getByRole("group", { name: "Contribution chart" })).toBeVisible();
  const displayedRisk = await page.locator(".risk").textContent();
  expect(displayedRisk).toMatch(/^\d+\.\d%$/);
  await expect(page.getByText(displayedRisk!, { exact: true }).first()).toBeVisible();
  await expect(page.locator(".assessment-factor-bar.positive").first()).toBeVisible();
  await expect(page.getByText("Cumulative probability curve unavailable")).toHaveCount(0);
  await expect(page.locator(".cif-curve")).toHaveCount(0);
  await page.getByText("View numerical contributions").click();
  await expect(page.getByRole("table", { name: "Calculation contributions" })).toBeVisible();
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 860 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("historical results show saved probability only without reconstructing factors", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.locator('.sidebar [data-act="nav:Assessment History"]').click();
  await page.locator('[data-act="record:1"]').click();
  await expect(page.getByRole("figure", { name: /Ten-year probability overview/i })).toBeVisible();
  await expect(page.getByText("23.8%", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("group", { name: "Contribution chart" })).toHaveCount(0);
  await expect(page.getByText("Cumulative probability curve unavailable")).toHaveCount(0);
});
