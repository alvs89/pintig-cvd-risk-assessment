import {completePreAssessment} from "./preAssessmentHelpers";
import { test, expect } from "@playwright/test";
test("recorded intakes load explicitly, remain editable, protect drafts and preserve history", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.locator('button[type="submit"]').click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  for (const [pid, sbp, bmi, alcohol, activity] of [
    ["1", "156", "29.1", "4.0", "50"],
    ["2", "138", "26.5", "0.0", "105"],
    ["3", "118", "23.4", "0.0", "200"],
  ]) {
    await page.locator("#pid").selectOption(pid);
  await completePreAssessment(page);
    if (pid !== "1")
      await page
        .getByRole("button", { name: "Change patient", exact: true })
        .click();
    await expect(page.locator("#sbp")).toHaveValue("");
    await page
      .getByRole("button", { name: "Prefill questionnaire", exact: true })
      .click();
  await completePreAssessment(page);
    await expect(page.locator("#sbp")).toHaveValue(sbp);
    await expect(page.locator("#bmi")).toHaveValue(bmi);
    await expect(page.locator("#alcoholDrinks")).toHaveValue(alcohol);
    await expect(page.locator("#activityMinutes")).toHaveValue(activity);
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("#sbp")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.locator("#sbp").fill("122");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('.sidebar [data-act="nav:Patient Management"]').click();
  await page.locator('[data-act="assessPatient:1"]').click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await expect(page.locator("#pid")).toHaveValue("3");
  await expect(page.locator("#sbp")).toHaveValue("122");
  await page
    .getByRole("button", { name: "Prefill questionnaire", exact: true })
    .click();
  await completePreAssessment(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#sbp")).toHaveValue("122");
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#pid")).toHaveValue("3");
  await expect(page.locator("#sbp")).toHaveValue("122");
  await page
    .getByRole("button", { name: "Prefill questionnaire", exact: true })
    .click();
  await completePreAssessment(page);
  await page.getByRole("button", { name: "Replace answers", exact: true }).click();
  await page.locator("#sbp").fill("122");
  await page.locator('#assessmentForm button[type="submit"]').click();
  await expect(
    page.getByText(
      /Illustrative estimate; not a clinically validated prediction/,
    ),
  ).toBeVisible();
  await expect(page.locator(".further-assessment")).toContainText(
    "Provide general cardiovascular health education",
  );
  await expect(page.locator(".cif-curve")).toHaveCount(0);
  await expect(page.locator('.ten-year-chart [role="img"]')).toBeVisible();
  await page.locator('[data-act="saveAssessment"]').click();
  await page.evaluate(() =>
    document
      .querySelector<HTMLElement>(
        '.sidebar [data-act="nav:Assessment History"]',
      )!
      .click(),
  );
  await expect(page.locator('[data-act^="record:"]')).toHaveCount(11);
  await page.locator('[data-act="record:1"]').click();
  await expect(page.locator(".risk")).toHaveText("23.8%");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('.sidebar [data-act="nav:Patient Management"]').click();
  await page.locator('[data-act="newPatient"]').click();
  for (const [id, v] of [
    ["first", "Fictional"],
    ["last", "Intake"],
    ["dob", "1980-01-01"],
    ["locality", "Marikina City"],
  ])
    await page.locator("#" + id).fill(v);
  await page.locator("#sex").selectOption("Female");
  await page.locator('#patientForm button[type="submit"]').click();
  await page.locator('[data-act="assessPatient:12"]').click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#sbp")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Prefill questionnaire", exact: true }),
  ).toHaveCount(0);
});
