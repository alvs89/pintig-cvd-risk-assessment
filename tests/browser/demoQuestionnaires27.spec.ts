import { expect, test } from "@playwright/test";
import { completePreAssessment } from "./preAssessmentHelpers";

test("fictional demonstration questionnaires prefill Patients 1–10 and preserve Patient 11", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.locator('#loginForm button[type="submit"]').click();
  await page.locator('[data-act="nav:New Risk Assessment"]').first().click();

  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);

  await expect(page.locator("#q27-gen3Education")).not.toHaveValue("");
  await expect(page.locator("#q27-familyIncomePH")).not.toHaveValue("");
  await expect(page.locator("#q27-incomeSupportedPeople")).not.toHaveValue("");
  await expect(page.locator('label[for="q27-gen3Education"] .required-marker')).toHaveText("*");
  await expect(page.getByLabel("What is your current occupation? (optional)", { exact: true })).toBeVisible();

  await page.locator("#pid").selectOption("11");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Change patient", exact: true }).click();
  await completePreAssessment(page);

  await expect(page.locator("#q27-gen3Education")).toHaveValue("");
  await expect(page.locator("#q27-familyIncomePH")).toHaveValue("");
  await expect(page.locator("#q27-incomeSupportedPeople")).toHaveValue("");
});
