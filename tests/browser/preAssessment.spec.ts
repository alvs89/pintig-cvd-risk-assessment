import { test, expect } from "@playwright/test";
import { completePreAssessment } from "./preAssessmentHelpers";
import {
  WARNING_SIGNS,
  SCREENING_KEYS,
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
  await expect(page.locator(".screening-checklist li")).toHaveCount(13);
  for (const [, label] of WARNING_SIGNS)
    await expect(page.locator(".screening-checklist")).toContainText(label);
  await expect(page.locator("[data-screening-key]")).toHaveCount(2);
  for (const key of SCREENING_KEYS) {
    const field = page.locator(`#screen-${key}`);
    await expect(field).toHaveAttribute("required", "");
    await expect(field).toHaveAttribute("aria-required", "true");
    await expect(
      page.locator(`label[for="screen-${key}"] .required-marker`),
    ).toHaveCount(1);
    await expect(field).toHaveValue("");
  }
  await expect(
    page.locator(".screening-checklist .required-marker"),
  ).toHaveCount(0);
  await expect(page.locator(".assessment-predictors")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Continue to Risk Assessment" }),
  ).toBeDisabled();
  for (const key of ["warningSigns"]) {
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
  for (const key of ["cardiovascularHistory"]) {
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
  await page.locator("#screen-cardiovascularHistory").selectOption("Unknown");
  await expect(
    page.getByRole("heading", { name: "Clarification required" }),
  ).toBeVisible();
  await page.locator("#screen-warningSigns").selectOption("Yes");
  await expect(
    page.getByRole("heading", { name: "Routine Risk Assessment Paused" }),
  ).toBeVisible();
  // Prefill must never replace or silently negate screening answers.
  await page
    .getByRole("button", { name: "Prefill questionnaire", exact: true })
    .click();
  await expect(page.locator("#screen-warningSigns")).toHaveValue("Yes");
  await expect(page.locator(".assessment-predictors")).toBeHidden();
  await page.locator("#screen-warningSigns").selectOption("No");
  await completePreAssessment(page);
  await expect(page.locator("#sbp")).toHaveValue("156");
  await expect(page.locator("#bmiLabel .required-marker")).toHaveCount(0);
  await expect(page.locator("label[for=waist] .required-marker")).toHaveCount(
    0,
  );
  await expect(page.locator("label[for=sbp] .required-marker")).toHaveCount(1);
  await expect(page.locator(".assessment-predictors")).toBeVisible();
  // Revoking an answer closes scoring again, retaining measurements for correction.
  await page.locator("#screen-warningSigns").selectOption("Unknown");
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
  await page.locator("#screen-warningSigns").focus();
  await expect(page.locator("#screen-warningSigns")).toBeFocused();
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
  await expect(page.locator("#screen-warningSigns")).toHaveValue("");
  await expect(page.locator(".assessment-predictors")).toBeHidden();
});

test("patient changes revoke confirmation and required markers follow editable active fields", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.locator('button[type="submit"]').click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
  await expect(page.locator("#bmiLabel .required-marker")).toHaveCount(1);
  await expect(page.locator("label[for=height] .required-marker")).toHaveCount(
    0,
  );
  await expect(page.locator("label[for=weight] .required-marker")).toHaveCount(
    0,
  );
  await expect(
    page.locator("label[for=activityDays] .required-marker"),
  ).toHaveCount(1);
  await page.locator("#mode").selectOption("observed");
  await expect(page.locator("#extraQuestionnaire")).toBeHidden();
  await expect(
    page.locator("label[for=activityDays] .required-marker"),
  ).toHaveCount(0);
  await page.locator("#pid").selectOption("2");
  if (await page.getByRole("alertdialog").count())
    await page
      .getByRole("button", { name: "Change patient", exact: true })
      .click();
  for (const key of SCREENING_KEYS)
    await expect(page.locator(`#screen-${key}`)).toHaveValue("");
  await expect(page.locator(".assessment-predictors")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Continue to Risk Assessment" }),
  ).toBeDisabled();
  await completePreAssessment(page);
  await page.locator("#screen-warningSigns").selectOption("Unknown");
  await expect(page.locator(".assessment-predictors")).toBeHidden();
  await expect(page.locator("#screen-warningSigns")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

for (const role of ["admin", "worker"]) {
  test(`${role}: missing patient prompts, highlights and focuses selection without scoring`, async ({
    page,
  }) => {
    let calls = 0;
    await page.route("http://127.0.0.1:8765/research-cif", (route) => {
      calls++;
      return route.fulfill({ status: 503, body: "unavailable" });
    });
    await page.goto("/");
    await page.locator(`[data-act="${role}Demo"]`).click();
    await page.locator('button[type="submit"]').click();
    await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
    const patient = page.locator("#pid");
    await expect(
      page.getByRole("heading", { name: "Select a patient", exact: true }),
    ).toBeVisible();
    await expect(patient).not.toHaveAttribute("aria-invalid", "true");
    await patient.focus();
    await expect(patient).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#pid-error")).toHaveText(
      "Choose a patient before continuing.",
    );
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page
        .getByRole("button", {
          name: "Select patient to continue",
          exact: true,
        })
        .click();
      await expect(patient).toBeFocused();
      await expect(patient).toHaveCSS("border-top-color", "rgb(180, 35, 53)");
      await expect(patient).toHaveAttribute("aria-describedby", "pid-error");
      await expect(page.locator(".assessment-predictors")).toBeHidden();
      await expect.poll(() => patient.evaluate((input) => {
        const box = input.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= innerHeight;
      })).toBe(true);
    }
    await page
      .locator("#assessmentForm")
      .evaluate((form) => (form as HTMLFormElement).requestSubmit());
    await expect(patient).toBeFocused();
    await expect(page.locator(".risk")).toHaveCount(0);
    expect(calls).toBe(0);
    await patient.selectOption("1");
    await expect(page.locator("#pid-error")).toHaveCount(0);
    await expect(patient).not.toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByRole("button", {
        name: "Continue to Risk Assessment",
        exact: true,
      }),
    ).toBeDisabled();
    await completePreAssessment(page);
    await expect(page.locator(".assessment-predictors")).toBeVisible();
  });
}
