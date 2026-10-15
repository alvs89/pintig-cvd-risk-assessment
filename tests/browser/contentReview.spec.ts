import {completePreAssessment} from "./preAssessmentHelpers";
import { test, expect } from "@playwright/test";

for (const role of ["admin", "worker"]) {
  test(`${role} screens use accurate practice, account and clinical terminology`, async ({
    page,
  }) => {
    await page.route("http://127.0.0.1:8765/research-cif", (route) =>
      route.fulfill({
        status: 503,
        body: "{}",
        contentType: "application/json",
      }),
    );
    await page.goto("/");
    await expect(
      page.getByText(
        "Practice sign-in shortcuts fill a fictional account. They do not verify your identity.",
      ),
    ).toBeVisible();
    await page.locator(`[data-act="${role}Demo"]`).click();
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByRole("button", { name: "Switch account", exact: true }),
    ).toBeVisible();
    await page.locator('.sidebar [data-act="nav:Patient Management"]').click();
    await expect(
      page.getByRole("columnheader", { name: "Record status", exact: true }),
    ).toHaveCount(0);
    await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
    await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
    await expect(
      page.getByText(
        "Practice responses for this fictional patient. Review before submitting.",
      ),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Prefill questionnaire", exact: true })
      .click();
  await completePreAssessment(page);
    await page.locator('#assessmentForm button[type="submit"]').click();
    await expect(
      page.getByText(
        /Illustrative estimate; not a clinically validated prediction/,
      ),
    ).toBeVisible();
    const research = page.locator(".research-cig");
    await expect(research).toContainText("Research use only");
    await expect(research).toContainText("not clinically validated");
    await expect(research).toContainText("PURE Philippines");
    await expect(research).toContainText(
      "Do not use this graph to make care, medication, or referral decisions.",
    );
    await expect(research).toContainText("Research graph unavailable");
    await expect(research).not.toContainText("questionnaire_model");
    await expect(research).not.toContainText("local development build");
    await expect(page.locator(".further-assessment")).toContainText(
      "not a validated referral threshold",
    );
    await page
      .getByRole("button", { name: "Switch account", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toContainText(
      "returned to the sign-in page",
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
