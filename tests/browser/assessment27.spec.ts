import { test, expect } from "@playwright/test";
import { completePreAssessment } from "./preAssessmentHelpers";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
]) {
  test(`assessment pagination and numeric validation work at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.locator('[data-act="workerDemo"]').click();
    await page.locator('#loginForm button[type="submit"]').click();
    await page.locator('[data-act="nav:New Risk Assessment"]').first().click();
    await page.locator("#pid").selectOption("1");
    await completePreAssessment(page);

    await expect(page.getByText("Step 1 of 9")).toBeVisible();
    await expect(page.locator("#q27-education")).toHaveCount(0);
    await page.locator("#q27-gen3Education").selectOption({ index: 8 });
    await page.locator("#q27-familyIncomePH").selectOption({ index: 4 });
    await page.locator("#q27-incomeSupportedPeople").fill("5");
    await expect(page.locator("#q27-employmentStatus")).toBeVisible();
    await expect(page.locator("#q27-currentOccupation")).toBeVisible();
    await expect(page.locator("#q27-longestOccupation")).toBeVisible();

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Step 2 of 9")).toBeVisible();
    const sbp = page.locator("#q27-sbp1");
    await expect(sbp).toHaveAttribute("inputmode", "decimal");
    await sbp.fill("40");
    await expect(sbp).toHaveAttribute("aria-invalid", "true");
    await sbp.fill("120");
    await expect(sbp).toHaveAttribute("aria-invalid", "false");
    await sbp.fill("120e2");
    await expect(sbp).toHaveValue("120");

    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByText("Step 1 of 9")).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.locator(".source-question-stem").getByText(
        "Have you ever been diagnosed with any of the following? (check all that apply)",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: /Hypertension\/high blood pressure/ }),
    ).toBeVisible();
    await expect(page.locator(".source-question-stem").filter({ hasText: "Health History:" })).toHaveCount(1);
    const familyLabel = page.locator('label[for="q27-family_Coronary Heart Disease_Father"]');
    const labelLayout = await familyLabel.evaluate(label => {
      const hidden = label.querySelector(".pintig-sr-only")!;
      const context = label.querySelector(".question-context")!;
      return {
        hiddenPosition: getComputedStyle(hidden).position,
        hiddenWidth: hidden.getBoundingClientRect().width,
        contextDisplay: getComputedStyle(context).display,
      };
    });
    expect(labelLayout).toEqual({ hiddenPosition: "absolute", hiddenWidth: 1, contextDisplay: "inline" });
    await expect(page.locator('[id="q27-family_Coronary Heart Disease_Father"]')).toHaveAccessibleName(/Coronary Heart Disease \u2014 Father$/);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator("#q27-alcoholHistory").selectOption("Currently use alcohol products");
    await expect(page.locator(".source-question-stem").filter({ hasText: "What forms of alcohol" })).toHaveCount(1);
    await page.locator("#q27-alc_beer").selectOption("Selected");
    await expect(page.locator("#q27-alc_beer_quantity")).toHaveAccessibleName("Beer \u2014 Average # of drinks (drinks)");
    await page.locator("#q27-alc_beer_quantity").fill("2");
    await page.locator("#q27-alcoholHistory").selectOption("Never used alcohol products");
    await expect(page.locator("#q27-alc_beer_quantity")).toHaveCount(0);
    await page.locator("#q27-alcoholHistory").selectOption("Currently use alcohol products");
    await expect(page.locator("#q27-alc_beer_quantity")).toHaveValue("2");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    for (let step = 1; step < 9; step++) {
      if (step === 5) {
        await page.locator("#q27-passiveChild").selectOption("1 = Yes");
        await page.locator("#q27-childOther").selectOption("1 = Yes");
        await page.locator("#q27-passiveHome").selectOption("1 = Yes");
        await page.locator("#q27-passiveOutside").selectOption("1 = Yes");
      }
      if (step === 8) {
        for (const [id, value] of Object.entries({ sleep: "14", sleepSedentary: "8", sleepSlight: "2", sleepModerate: "1", sleepHeavy: "1" }))
          await page.locator("#q27-" + id).fill(value);
        await expect(page.locator("#typical-day-total")).toContainText("26 / 24 hours");
        await expect(page.locator("#typical-day-total")).toContainText("Review all five entries");
        await expect(page.locator("#q27-sleep")).toHaveAttribute("aria-invalid", "false");
        await page.locator("#q27-sleepSedentary").fill("6");
        await expect(page.locator("#typical-day-total")).toContainText("The five activities total 24 hours.");
        await page.locator("#q27-sleepHeavy").fill("");
        await expect(page.locator("#typical-day-total")).toContainText("4 of 5 activities entered");
      }
      const alignment = await page.locator(".assessment27 .gridform").evaluateAll(grids =>
        grids.flatMap(grid => {
          const fields = [...grid.querySelectorAll(":scope > .field")];
          return fields.flatMap((field, i) => {
            const next = fields[i + 1];
            if (!next || Math.abs(field.getBoundingClientRect().top - next.getBoundingClientRect().top) > 1) return [];
            const a = field.querySelector("input, select")!.getBoundingClientRect();
            const b = next.querySelector("input, select")!.getBoundingClientRect();
            return [Math.abs(a.top - b.top)];
          });
        })
      );
      if (viewport.width > 680) expect(alignment.length).toBeGreaterThan(0);
      for (const offset of alignment) expect(offset).toBeLessThanOrEqual(1);
      const spacing = await page.locator(".assessment27 .gridform > .field").evaluateAll(fields =>
        fields.flatMap(field => {
          const label = field.querySelector("label");
          const control = field.querySelector("input, select");
          if (!label || !control) return [];
          const a = label.getBoundingClientRect();
          const b = control.getBoundingClientRect();
          return [{ gap: b.top - a.bottom, minHeight: getComputedStyle(label).minHeight }];
        })
      );
      expect(spacing.length).toBeGreaterThan(0);
      for (const field of spacing) {
        expect(field.minHeight).toBe("0px");
        expect(field.gap).toBeGreaterThanOrEqual(5);
        expect(field.gap).toBeLessThanOrEqual(7);
      }
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    }
    await expect(
      page.getByRole("heading", { name: "Review and save", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Save questionnaire responses",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("62.5 / 100", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save questionnaire responses", exact: true }).click();
    const toast = page.locator(".assessment-save-toast");
    await expect(toast).toContainText("Questionnaire responses saved.");
    await expect(toast).toBeVisible();
    const toastBounds = await toast.boundingBox();
    expect(toastBounds!.y).toBe(20);
    expect(Math.abs(viewport.width - toastBounds!.x - toastBounds!.width - 20)).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Dismiss save notification" }).click();
    await expect(toast).toBeHidden();
    await page.getByRole("button", { name: "Save questionnaire responses", exact: true }).click();
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 8000 });
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBeTruthy();
  });
}
