import {completePreAssessment} from "./preAssessmentHelpers";
import { test, expect } from "@playwright/test";
test("isolated guidance remains independent of keyboard-operated CIF controls and responsive", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixtures/cif-harness.html");
  const panel = page.getByRole("region", {
    name: "Further Assessment Guidance",
  });
  await expect(panel).toContainText(
    "Discuss modifiable cardiovascular risk factors",
  );
  const original = await panel.textContent();
  await page.getByLabel("Cumulative probability reference").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Cumulative probability reference")).toHaveValue(
    "0.1",
  );
  await page.getByLabel("Inspect a supported year").selectOption("6");
  expect(await panel.textContent()).toBe(original);
  await expect(panel.locator('[role="status"]')).toHaveAttribute(
    "aria-live",
    "polite",
  );
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(panel).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.evaluate(() => (document.body.style.zoom = "200%"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("illustrative results show proposed factor-specific rules without clinical approval; saved rules remain frozen", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
  for (const [id, value] of [
    ["currentSmoking", "Yes"],
    ["bpMeds", "No"],
    ["mode", "observed"],
  ])
    await page.locator("#" + id).selectOption(value);
  for (const [id, value] of [
    ["sbp", "145"],
    ["dbp", "92"],
    ["bmi", "24"],
  ])
    await page.locator("#" + id).fill(value);
  await page
    .getByRole("button", { name: "Review 10-year risk result →" })
    .click();
  const panel = page.getByRole("region", {
    name: "Further Assessment Guidance",
  });
  await expect(panel).toContainText("Educational follow-up considerations");
  await expect(panel).toContainText("High risk grouping");
  await expect(panel).toContainText("Recorded BP: 145/92 mmHg");
  await expect(panel).toContainText("smoking-cessation support");
  await expect(panel).toContainText("not a validated referral threshold");
  await expect(
    page.getByRole("heading", { name: "General Educational Guidance" }),
  ).toBeVisible();
  await expect(page.getByText(/Arrange blood pressure review/)).toBeVisible();
  await page.locator('[data-act="saveAssessment"]').click();
  await page.locator('.sidebar [data-act="nav:Assessment History"]').click();
  await page.locator('[data-act^="record:"]').last().click();
  await expect(panel).toContainText("Educational follow-up considerations");
  await expect(panel).toContainText("Recorded BP: 145/92 mmHg");
  await expect(panel).toContainText("smoking-cessation support");
  await expect(
    page.getByRole("heading", { name: "General Educational Guidance" }),
  ).toBeVisible();
});

test("moderate illustrative results do not receive risk-category follow-up despite factor-based education", async ({page}) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("2");
  await completePreAssessment(page);
  await page.getByRole("button", { name: "Prefill questionnaire" }).click();
  await completePreAssessment(page);
  await page.getByRole("button", { name: "Review 10-year risk result →" }).click();
  const panel = page.getByRole("region", { name: "Further Assessment Guidance" });
  await expect(panel).toContainText("Continue risk-factor education");
  await expect(panel.locator(".further-assessment-rule")).toHaveCount(0);
  await expect(page.getByRole("heading", {name: "General Educational Guidance"})).toBeVisible();
});

test("very-high illustration prioritizes review of actual recorded factors and works on mobile", async ({page}) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
  await page.getByRole("button", { name: "Prefill questionnaire" }).click();
  await completePreAssessment(page);
  await page.locator("#sbp").fill("175");
  await page.locator("#weight").fill("105");
  await page.locator("#alcoholDays").fill("5");
  await page.locator("#drinksPerDay").fill("4");
  await page.getByRole("button", { name: "Review 10-year risk result →" }).click();
  const panel = page.getByRole("region", { name: "Further Assessment Guidance" });
  await expect(panel).toContainText("Very High risk grouping");
  await expect(panel).toContainText("Recorded BP: 175/94 mmHg");
  await expect(panel).toContainText("smoking-cessation support");
  await expect(panel).toContainText("comprehensive clinician-led cardiovascular risk review");
  await expect(panel).toContainText("not a validated referral threshold");
  await page.setViewportSize({width:390,height:850});
  await expect(panel).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
