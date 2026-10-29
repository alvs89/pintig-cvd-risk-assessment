import {completePreAssessment} from "./preAssessmentHelpers";
import { test, expect } from "@playwright/test";
for (const width of [1440, 820, 390])
  test(`missing fields scroll into view in questionnaire order at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("http://127.0.0.1:8765/research-cif", (r) => r.abort());
    await page.goto("/");
    await page.locator('[data-act="workerDemo"]').click();
    await page.locator('button[type="submit"]').click();
    await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
    await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
    await page
      .getByRole("button", { name: "Prefill questionnaire", exact: true })
      .click();
  await completePreAssessment(page);
    await page.locator("#bpMeds").selectOption("");
    await page.locator("#currentSmoking").selectOption("");
    const submit = page.locator('#assessmentForm button[type="submit"]');
    await submit.click();
    await expect(page.locator("#currentSmoking")).toBeFocused();
    await expect(page.locator("#currentSmoking-error")).toBeVisible();
    await expect(page.locator("#bpMeds")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.locator("#currentSmoking").selectOption("Yes");
    await expect(page.locator("#currentSmoking-error")).toHaveCount(0);
    await submit.click();
    await expect(page.locator("#bpMeds")).toBeFocused();
    await expect(page.locator("#bpMeds")).toBeInViewport();
    await expect(page.locator("#bpMeds-error")).toContainText(
      "hypertension-medication",
    );
    const box = await page.locator("#bpMeds").boundingBox();
    expect(box!.y).toBeGreaterThan(80);
    expect(box!.y + box!.height).toBeLessThan(800);
    await expect(page.locator("#sbp")).toHaveValue("156");
    await page.locator("#bpMeds").selectOption("Yes");
    await expect(page.locator("#bpMeds-error")).toHaveCount(0);
    await submit.click();
    await expect(
      page.getByRole("heading", { name: "Assessment Result", exact: true }),
    ).toBeVisible();
  });
