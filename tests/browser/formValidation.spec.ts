import {completePreAssessment} from "./preAssessmentHelpers";
import { test, expect } from "@playwright/test";
test("required labels and real-time numeric errors are accessible and clear on correction", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator('label[for="email"] .required-marker'),
  ).toBeVisible();
  await page.locator('[data-act="workerDemo"]').click();
  await page.locator('button[type="submit"]').click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
  await expect(page.locator('label[for="sbp"] .required-marker')).toBeVisible();
  await expect(page.locator('label[for="pid"] .required-marker')).toBeVisible();
  const sbp = page.locator("#sbp");
  await sbp.fill("300");
  await expect(sbp).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#sbp-error")).toHaveText(
    "Value must be between 70 and 260.",
  );
  await expect(sbp).toHaveCSS("border-top-color", "rgb(180, 35, 53)");
  await sbp.fill("120");
  await expect(page.locator("#sbp-error")).toHaveCount(0);
  await page.locator("#dbp").fill("130");
  await expect(page.locator("#dbp-error")).toContainText("lower than systolic");
  await sbp.fill("140");
  await expect(page.locator("#dbp-error")).toHaveCount(0);
  await sbp.fill("");
  await sbp.pressSequentially("e");
  await expect(page.locator("#sbp-error")).toContainText("valid number");
  await sbp.fill("140");
  await expect(page.locator("#sbp-error")).toHaveCount(0);
  await sbp.press("a");
  await expect(page.locator("#sbp-error")).toContainText("valid number");
  await expect(sbp).toHaveValue("140");
  await sbp.fill("141");
  await expect(page.locator("#sbp-error")).toHaveCount(0);
  await page.locator("#activityDays").fill("8");
  await expect(page.locator("#activityDays-error")).toContainText(
    "between 0 and 7",
  );
  await page.locator("#activityDays").fill("3");
  await expect(page.locator("#activityDays-error")).toHaveCount(0);
  await page.locator("#activityPerDay").fill("35");
  await expect(page.locator("#activityMinutes")).toHaveValue("105");
  await page.locator("#height").fill("159");
  await page.locator("#weight").fill("67");
  await expect(page.locator("#bmi")).toHaveValue("26.5");
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await sbp.fill("300");
    const control = await sbp.boundingBox();
    const error = await page.locator("#sbp-error").boundingBox();
    expect(error!.y).toBeGreaterThanOrEqual(control!.y + control!.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
