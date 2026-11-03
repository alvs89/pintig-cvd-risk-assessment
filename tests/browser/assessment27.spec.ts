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
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBeTruthy();
  });
}
