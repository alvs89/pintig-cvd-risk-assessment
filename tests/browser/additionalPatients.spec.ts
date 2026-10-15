import {completePreAssessment} from "./preAssessmentHelpers";
import { test, expect } from "@playwright/test";

for (const role of ["admin", "worker"]) {
  test(`${role} can review and assess the complete fictional population`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.route("http://127.0.0.1:8765/research-cif", route => route.fulfill({status:503,body:"unavailable"}));
    await page.goto("/");
    await page.locator(`[data-act="${role}Demo"]`).click();
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(".risk-distribution")).toContainText(
      "10 saved assessments represented",
    );
    const sidebar = page.locator(".sidebar");
    await sidebar.locator('[data-act="nav:Patient Management"]').click();
    await expect(page.locator("#patientLiveResults tbody tr")).toHaveCount(11);
    await expect(page.locator(".private-name")).toHaveCount(0);
    await sidebar.locator('[data-act="nav:Assessment History"]').click();
    await expect(page.locator("#historyLiveResults tbody tr")).toHaveCount(10);
    for (const [pid, recordId] of [
      [4, 3],
      [5, 4],
      [6, 5],
      [7, 6],
      [8, 7],
      [9, 8],
      [10, 9],
      [11, 10],
    ]) {
      await sidebar.locator('[data-act="nav:Assessment History"]').click();
      await page.locator(`[data-act="record:${recordId}"]`).click();
      const risk = await page.locator(".risk").textContent();
      await expect(page.locator(".identity-context")).toContainText(
        `PNT-${String(pid).padStart(6, "0")}`,
      );
      await expect(page.locator(".history-question-group")).toHaveCount(7);
      await sidebar.locator('[data-act="nav:New Risk Assessment"]').click();
      await page.locator("#pid").selectOption(String(pid));
  await completePreAssessment(page);
      if (await page.getByRole("alertdialog").count())
        await page
          .getByRole("button", { name: "Change patient", exact: true })
          .click();
      await page
        .getByRole("button", { name: "Prefill questionnaire", exact: true })
        .click();
  await completePreAssessment(page);
      // Check the real form's numeric constraints and supported select choices.
      expect(
        await page.locator("#assessmentForm").evaluate((form) =>
          Array.from(
            form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
              'input[type="number"],select',
            ),
          )
            .filter((input) => !input.disabled)
            .every((input) => input.checkValidity()),
        ),
      ).toBe(true);
      await page.locator('#assessmentForm button[type="submit"]').click();
      await expect(page.locator(".risk")).toHaveText(risk!);
      await expect(page.locator(".research-cig")).toHaveCount(1);
      await expect(page.locator(".cif-curve")).toHaveCount(0);
      await expect(
        page.getByText(
          /Illustrative estimate; not a clinically validated prediction/,
        ),
      ).toBeVisible();
      if (pid === 11) {
        for (const width of [1440, 820, 390]) {
          await page.setViewportSize({ width, height: 900 });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
        }
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    }
    if (role === "admin") {
      await sidebar.locator('[data-act="nav:Reports"]').click();
      await expect(page.locator("tbody tr")).toHaveCount(11);
      await page.locator("#reportType").selectOption("Assessments");
      for (const [category, count] of [
        ["Low", 2],
        ["Moderate", 2],
        ["High", 3],
        ["Very High", 3],
      ] as const) {
        await page.locator("#reportCategory").selectOption(category);
        await expect(page.locator("tbody tr")).toHaveCount(count);
      }
    } else {
      await expect(sidebar.locator('[data-act="nav:Reports"]')).toHaveCount(0);
    }
    await page.reload();
    await page.locator(`[data-act="${role}Demo"]`).click();
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(".risk-distribution")).toContainText(
      "10 saved assessments represented",
    );
  });
}
