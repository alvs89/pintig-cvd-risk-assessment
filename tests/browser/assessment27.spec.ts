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
    await expect(page.locator("#q27-longestOccupation")).toHaveCount(0);
    await expect(page.getByLabel("What is your current occupation? (optional)", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Step 2 of 9")).toBeVisible();
    for (const measurement of ["waist", "hip"]) {
      const group = page.getByRole("group", { name: measurement === "waist" ? "Waist measurements" : "Hip measurements", exact: true });
      await expect(group.locator("input")).toHaveCount(2);
      await expect(group.locator("select")).toHaveCount(1);
      await expect(group).toContainText("Measurement conditions only; not a risk predictor.");
      await group.locator("select").selectOption("minimal/no clothing");
      if (viewport.width >= 1000) {
        const positions = await group.locator("input, select").evaluateAll(elements => elements.map(el => el.getBoundingClientRect().top));
        expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
      }
    }
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
    await page.getByRole("radio", { name: "Currently use alcohol products", exact: true }).check();
    if (viewport.width >= 1000) {
      const alcoholChoiceTops = await page.locator("#q27-alcoholHistory .choice-list > label").evaluateAll(labels =>
        labels.map(label => label.getBoundingClientRect().top),
      );
      expect(new Set(alcoholChoiceTops).size).toBe(1);
    }
    await expect(page.getByRole("group", { name: "What forms of alcohol have you regularly used? (check all that apply)", exact: true })).toBeVisible();
    await page.locator("#q27-alc_beer").check();
    await expect(page.locator("#q27-alc_beer_quantity")).toHaveAccessibleName("Average # of drinks (drinks)");
    await page.locator("#q27-alc_beer_quantity").fill("5");
    await page.locator("#q27-alc_beer_frequency").selectOption("Monthly");
    await expect(page.getByRole("region", { name: "Alcohol consumption calculated values" })).toContainText("17.07 g/week");
    await page.getByRole("radio", { name: "Formerly used alcohol products", exact: true }).check();
    await expect(page.getByText("Past drinking history: enter the beverages and usual amounts consumed when you drank.")).toBeVisible();
    await expect(page.getByText("For the following question, answer about your current drinking, not past drinking.")).toBeVisible();
    const alcoholSummary = page.getByRole("region", { name: "Alcohol consumption calculated values" });
    await expect(alcoholSummary).toContainText("You no longer drink alcohol, so current weekly consumption is 0 g/week.");
    await expect(alcoholSummary.locator("dl > div").first()).toHaveText("Current weekly ethanol consumption0 g/week");
    await expect(page.locator("#q27-alc_beer_quantity")).toHaveValue("5");
    await page.locator(".focused-assessment").screenshot({ path: "test-results/alcohol-former-" + viewport.width + ".png" });
    await page.getByRole("radio", { name: "Currently use alcohol products", exact: true }).check();
    await expect(page.getByText("Past drinking history: enter the beverages and usual amounts consumed when you drank.")).toHaveCount(0);
    await expect(alcoholSummary).toContainText("17.07 g/week");
    await page.locator(".focused-assessment").screenshot({ path: "test-results/alcohol-" + viewport.width + ".png" });
    await page.getByRole("radio", { name: "Never used alcohol products", exact: true }).check();
    await expect(page.locator("#q27-alc_beer_quantity")).toHaveCount(0);
    await page.getByRole("radio", { name: "Currently use alcohol products", exact: true }).check();
    await expect(page.locator("#q27-alc_beer_quantity")).toHaveValue("5");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    for (let step = 1; step < 9; step++) {
      if (step === 5) {
        await page.locator("#q27-smokeEver").getByRole("radio", { name: "Yes", exact: true }).check();
        await page.locator("#q27-smokeCurrent").getByRole("radio", { name: "Yes", exact: true }).check();
        await page.locator("#q27-smokeNow").fill("10");
        await page.locator("#q27-smokeAverage").fill("10");
        await page.locator("#q27-smokeStart").fill("20");
        await page.locator("#q27-smokeBreak").getByRole("radio", { name: "No", exact: true }).check();
        await expect(page.getByRole("region", { name: "Active smoking calculated values" })).toContainText("Current");
        await expect(page.locator(".profile-age")).toContainText("From the patient profile");
        await page.locator("#q27-passiveChild").selectOption("1 = Yes");
        await expect(page.locator("#q27-childOther")).toHaveCount(0);
        await page.locator("#q27-passiveHome").selectOption("1 = Yes");
        await page.locator("#q27-passiveOutside").selectOption("1 = Yes");
      }
      if (step === 6) {
        await expect(page.getByRole("navigation", { name: "Physical activity sections" })).toBeVisible();
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await expect(page.getByRole("button", { name: "Travel", exact: true })).toHaveAttribute("aria-current", "step");
        await page.locator("#q27-ipaq10").selectOption("2");
        await page.locator("#q27-ipaq11_hours").fill("0");
        await page.locator("#q27-ipaq11_minutes").fill("30");
        await page.getByRole("button", { name: "Back", exact: true }).click();
        await expect(page.getByRole("button", { name: "Work", exact: true })).toHaveAttribute("aria-current", "step");
        await page.getByRole("button", { name: "Travel", exact: true }).click();
        await expect(page.locator("#q27-ipaq11_minutes")).toHaveValue("30");
        await expect(page.getByRole("group", { name: "Cycling for transportation", exact: true })).toContainText("Hours per day");
        await page.getByRole("group", { name: "Cycling for transportation", exact: true }).screenshot({ path: "test-results/activity-" + viewport.width + ".png" });
        await page.getByRole("button", { name: "Sitting", exact: true }).click();
      }
      if (step === 8) {
        await page.locator("#q27-sleep").fill("14");
        await expect(page.locator("#q27-sleep")).toHaveAttribute("aria-invalid", "false");
        await expect(page.locator("#typical-day-total")).toHaveCount(0);
        await expect(page.locator("#q27-sleepSedentary")).toHaveCount(0);
      }
      for (const id of ["hypertensionYears", "diabetesYears", "bpMedStartAge", "diabetesMedStartAge", "lipidMedStartAge", "diabetesMedInsulin", "diabetesMedPregnancy", "alcoholStart", "heavyTimes", "heavyQuantity", "ipaq8", "ipaq9_hours", "ipaq9_minutes"]) {
        await expect(page.locator("#q27-" + id)).toHaveCount(0);
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
      if (viewport.width > 680 && step !== 4) expect(alignment.length).toBeGreaterThan(0);
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
      if (step !== 4) expect(spacing.length).toBeGreaterThan(0);
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
    await expect(page.getByText("SES unavailable: a suitable reference population and validated scoring parameters are not yet available.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Calculate risk", exact: true })).toBeDisabled();
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
