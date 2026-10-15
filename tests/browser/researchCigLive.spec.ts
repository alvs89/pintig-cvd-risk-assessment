import { test, expect, type Page } from "@playwright/test";
import { patients } from "../../src/state/store";
import { seededIntake } from "../../src/state/seededIntakes";
import { simulate } from "../../src/services/prediction";
import {
  researchInputsFor,
  verifyResearchCif,
  RESEARCH_CIG_ENDPOINT,
} from "../../src/services/researchCig";
import { age } from "../../src/utils/format";
import { band } from "../../src/utils/risk";

test.skip(
  process.env.PINTIG_LIVE_RSF !== "1",
  "Requires private frozen R model service; set PINTIG_LIVE_RSF=1.",
);

async function savedRecords(page: Page) {
  return page.evaluate(async () => {
    const path = "/src/state/store.ts";
    const { records } = await import(path);
    return JSON.stringify(records);
  });
}
for (const role of ["worker", "admin"]) {
  test(`actual frozen RSF: all eleven ${role} assessments and three edited predictor vectors`, async ({
    page,
  }, info) => {
    test.setTimeout(600000);
    await page.goto("/");
    await page.locator(`[data-act="${role}Demo"]`).click();
    await page.locator('button[type="submit"]').click();
    const originalRecords = await savedRecords(page);
    const outputs: unknown[] = [];
    async function submit(patient: (typeof patients)[number], edited = false) {
      const x = seededIntake(patient.id)!;
      if (edited) {
        x.sbp = String(+x.sbp + 6);
        await page.locator("#sbp").fill(x.sbp);
      }
      const expected = researchInputsFor(patient, {
        inputs: x,
        ageAtAssessment: age(patient.dob),
      })!;
      expect(expected).not.toBeNull();
      const responsePromise = page.waitForResponse(
        (r) =>
          r.url() === RESEARCH_CIG_ENDPOINT && r.request().method() === "POST",
        { timeout: 65000 },
      );
      await page.locator('#assessmentForm button[type="submit"]').click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      expect(response.request().postDataJSON()).toEqual({
        fictionalOnly: true,
        predictors: expected,
      });
      const body = await response.json();
      const cif = verifyResearchCif(body);
      expect(cif).not.toBeNull();
      expect(body.numberOfTrees).toBe(500);
      const panel = page.locator(".research-cig");
      await expect(panel.locator(".research-cif-curve")).toBeVisible({
        timeout: 65000,
      });
      await expect(page.getByTestId("research-cig-risk")).toHaveText(
        (cif!.risk * 100).toFixed(2) + "%",
      );
      expect(cif!.annual).toHaveLength(10);
      expect(cif!.annual[9].probability).toBe(cif!.risk);
      const prediction = simulate(x, patient);
      await expect(page.locator(".risk")).toHaveText(
        (prediction.risk * 100).toFixed(1) + "%",
      );
      await expect(panel).toContainText("not clinically validated");
      await expect(panel).toContainText("PURE Philippines");
      await expect(page.locator(".cif-panel")).toHaveCount(0);
      await panel.locator("summary").click();
      await expect(panel.locator("tbody tr")).toHaveCount(10);
      await expect(panel.locator("tbody tr").last()).toContainText(
        (cif!.risk * 100).toFixed(2) + "%",
      );
      expect(await savedRecords(page)).toBe(originalRecords);
      outputs.push({
        patient: patient.record,
        name: patient.first + " " + patient.last,
        edited,
        predictors: expected,
        illustrativeRisk: prediction.risk,
        category: band(prediction.risk),
        rsfRisk: cif!.risk,
      });
      if (patient.id === 11) {
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          await expect(panel.locator(".research-cif-curve")).toBeVisible();
        }
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    }
    for (const patient of patients) {
      await page
        .locator('.sidebar [data-act="nav:New Risk Assessment"]')
        .click();
      await page.locator("#pid").selectOption(String(patient.id));
      if (await page.getByRole("alertdialog").count())
        await page
          .getByRole("button", { name: "Change patient", exact: true })
          .click();
      await page
        .getByRole("button", { name: "Prefill questionnaire", exact: true })
        .click();
      await submit(patient);
      if ([1, 6, 11].includes(patient.id)) {
        await page
          .locator('.sidebar [data-act="nav:New Risk Assessment"]')
          .click();
        await submit(patient, true);
      }
    }
    expect(outputs).toHaveLength(14);
    await info.attach("genuine-rsf-results", {
      body: JSON.stringify(outputs, null, 2),
      contentType: "application/json",
    });
    console.log(`GENUINE_RSF_${role}: ${JSON.stringify(outputs)}`);
  });
}
