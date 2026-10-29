import {completePreAssessment} from "./preAssessmentHelpers";
import { test, expect } from "@playwright/test";

test("professional copy, responsive form alignment and keyboard confirmations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await expect(
    page.getByText(
      "For help accessing your account, contact your system administrator.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to sign in", exact: true })
    .click();
  await page.locator('[data-act="workerDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
  for (const [width, height] of [
    [1440, 900],
    [820, 1180],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator("#assessmentForm")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    // Labels bottom-align above shared control rows, preserving an 8px gap.
    for (const id of [
      "sbp",
      "dbp",
      "height",
      "weight",
      "bmi",
      "currentSmoking",
      "bpMeds",
    ]) {
      const label = await page.locator(`label[for="${id}"]`).boundingBox();
      const control = await page.locator(`#${id}`).boundingBox();
      expect(label).not.toBeNull();
      expect(control).not.toBeNull();
      expect(Math.abs(control!.y - (label!.y + label!.height) - 8)).toBeLessThanOrEqual(1);
    }
    if (width > 570) {
      for (const [left, right] of [
        ["sbp", "dbp"],
        ["currentSmoking", "bpMeds"],
      ]) {
        const a = await page.locator(`#${left}`).boundingBox();
        const b = await page.locator(`#${right}`).boundingBox();
        expect(Math.abs(a!.y - b!.y)).toBeLessThanOrEqual(1);
      }
    }
    // Capture the visible viewport; the workspace has its own scrolling region.
    await page.screenshot({ path: `test-results/assessment-${width}.png` });
  }
  await page
    .getByRole("button", { name: "Review 10-year risk result →", exact: true })
    .click();
  await expect(page.locator("#sbp")).toBeFocused();
  expect(
    await page
      .locator("#sbp")
      .evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Clear assessment", exact: true })
    .click();
  await expect(page.locator("#pintigCancel")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#pintigConfirmAction")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#pintigCancel")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#pintigConfirmAction")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Clear assessment", exact: true }),
  ).toBeFocused();
  await page.locator('.sidebar [data-act="nav:Help"]').click();
  await page.getByRole("tab", { name: "FAQs", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Frequently asked questions",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(
    /\bdemo\b|prototype|planned|version-change|GUIDE-RULES/i,
  );
  expect(errors).toEqual([]);
});
