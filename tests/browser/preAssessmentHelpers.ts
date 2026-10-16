import type { Page } from "@playwright/test";
import { SCREENING_KEYS } from "../../src/services/preAssessmentRules.mjs";
/** Isolated test interaction only. The application never defaults screening answers. */
export async function completePreAssessment(page: Page) {
  if (await page.getByRole("alertdialog").count()) return;
  const pid = page.locator("#pid");
  if (!(await pid.count()) || !(await pid.inputValue())) return;
  if (await page.locator(".assessment-predictors").isVisible()) return;
  for (const key of SCREENING_KEYS)
    await page.locator(`#screen-${key}`).selectOption("No");
  await page
    .getByRole("button", { name: "Continue to Risk Assessment", exact: true })
    .click();
}
