import { test, expect } from "@playwright/test";
import { completePreAssessment } from "./preAssessmentHelpers";
import {
  WARNING_SIGNS,
  EVENT_HISTORY,
} from "../../src/services/preAssessmentRules.mjs";

test("screening is mandatory, immediate, correctable, patient-bound and responsive", async ({
  page,
}) => {
  let calls = 0;
  await page.route("http://127.0.0.1:8765/research-cif", (route) => {
    calls++;
    return route.fulfill({ status: 503, body: "unavailable" });
  });
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.locator('button[type="submit"]').click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await page.locator("#screen-chestPain").selectOption("Unknown");
  const left=await page.locator("#screen-chestPain").boundingBox();
  const right=await page.locator("#screen-breathing").boundingBox();
  expect(Math.abs(left!.y-right!.y)).toBeLessThanOrEqual(1);
  await page.locator("#screen-chestPain").selectOption("");
  await expect(page.locator(".assessment-predictors")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Continue to Risk Assessment" }),
  ).toBeDisabled();
  for (const [key] of WARNING_SIGNS) {
    await expect(page.locator(`#screen-${key}`)).toHaveValue("");
    await page.locator(`#screen-${key}`).selectOption("Yes");
    await expect(
      page.getByRole("heading", { name: "Routine Risk Assessment Paused" }),
    ).toBeVisible();
    await expect(page.locator(".risk")).toHaveCount(0);
    await page
      .locator("#assessmentForm")
      .evaluate((form) => (form as HTMLFormElement).requestSubmit());
    expect(calls).toBe(0);
    await page.locator(`#screen-${key}`).selectOption("No");
  }
  for (const [key] of EVENT_HISTORY) {
    await page.locator(`#screen-${key}`).selectOption("Yes");
    await expect(
      page.getByRole("heading", {
        name: "First-Event Risk Assessment Not Applicable",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue to Risk Assessment" }),
    ).toBeDisabled();
    await page.locator(`#screen-${key}`).selectOption("No");
  }
  await page.locator("#screen-stroke").selectOption("Unknown");
  await expect(
    page.getByRole("heading", { name: "Clarification required" }),
  ).toBeVisible();
  await page.locator("#screen-chestPain").selectOption("Yes");
  await expect(
    page.getByRole("heading", { name: "Routine Risk Assessment Paused" }),
  ).toBeVisible();
  // Prefill must never replace or silently negate screening answers.
  await page
    .getByRole("button", { name: "Prefill questionnaire", exact: true })
    .click();
  await expect(page.locator("#screen-chestPain")).toHaveValue("Yes");
  await expect(page.locator(".assessment-predictors")).toBeHidden();
  await page.locator("#screen-chestPain").selectOption("No");
  await completePreAssessment(page);
  await expect(page.locator("#sbp")).toHaveValue("156");
  await expect(page.locator(".assessment-predictors")).toBeVisible();
  // Revoking an answer closes scoring again, retaining measurements for correction.
  await page.locator("#screen-speech").selectOption("Unknown");
  await expect(page.locator(".assessment-predictors")).toBeHidden();
  await completePreAssessment(page);
  await expect(page.locator("#sbp")).toHaveValue("156");
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.locator("#screen-speech").focus();
  await expect(page.locator("#screen-speech")).toBeFocused();
  await page.locator('#assessmentForm button[type="submit"]').click();
  await expect(
    page.getByRole("heading", { name: "Assessment Result", exact: true }),
  ).toBeVisible();
  await expect.poll(() => calls).toBe(1);
  await page.reload();
  await page.locator('[data-act="workerDemo"]').click();
  await page.locator('button[type="submit"]').click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await expect(page.locator("#screen-chestPain")).toHaveValue("");
  await expect(page.locator(".assessment-predictors")).toBeHidden();
});
