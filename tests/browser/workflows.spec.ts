import {completePreAssessment} from "./preAssessmentHelpers";
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";

async function signIn(page: Page, role = "admin") {
  await page.goto("/");
  await page
    .locator(`[data-act="${role === "admin" ? "adminDemo" : "workerDemo"}"]`)
    .click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name:
        role === "admin" ? "Administrator Dashboard" : "Healthcare Dashboard",
      exact: true,
    }),
  ).toBeVisible();
}
async function nav(page: Page, name: string) {
  await page.locator(`.sidebar [data-act="nav:${name}"]`).click();
}
async function intake(page: Page) {
  await nav(page, "New Risk Assessment");
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
  await page.locator("#sbp").fill("132");
  await page.locator("#dbp").fill("82");
  await page.locator("#height").fill("168");
  await page.locator("#weight").fill("71.4");
  await page.locator("#currentSmoking").selectOption("No");
  await page.locator("#bpMeds").selectOption("No");
}

test("worker registers, edits, assesses and reviews an immutable saved snapshot", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page, "worker");
  await expect(page.locator('.sidebar [data-act="nav:Reports"]')).toHaveCount(
    0,
  );
  await nav(page, "Patient Management");
  await page
    .getByRole("button", { name: "+ Register Patient", exact: true })
    .click();
  await page.locator("#first").fill("Fictional");
  await page.locator("#last").fill("Demo");
  await page.locator("#dob").fill("1980-01-01");
  await page.locator("#sex").selectOption("Female");
  await expect(page.locator("#sex")).toHaveValue("Female");
  await page.locator("#locality").fill("Fictional locality");
  await page.locator("#facility").fill("Demo facility");
  await page
    .getByRole("button", { name: "Register patient", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Patient PNT-000012", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Fictional Demo", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Reveal name for PNT-000012", exact: true })
    .click();
  await expect(page.getByText("Fictional Demo", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.locator("#first").fill("Updated Fictional");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText("Updated Fictional Demo", { exact: true }),
  ).toBeVisible();
  await nav(page, "Patient Management");
  await page.locator("#patientQuery").fill("000012");
  await expect(page.locator("#patientLiveResults tbody tr")).toHaveCount(1);
  await expect(page.locator("#patientQuery")).toBeFocused();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator("#patientQuery")).toHaveValue("");
  await expect(page.locator("#patientLiveResults tbody tr")).toHaveCount(12);
  await intake(page);
  await expect(page.locator("#bmiDisplay")).toHaveText("25.3 kg/m²");
  await expect(page.locator("#previewSmoking")).toHaveText("No");
  await expect(page.locator("#previewBpMeds")).toHaveText("No");
  await page
    .getByRole("button", { name: "Reveal name for PNT-000001", exact: true })
    .click();
  await expect(page.locator("#sbp")).toHaveValue("132");
  await page
    .getByRole("button", { name: "Clear assessment", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#sbp")).toHaveValue("132");
  await page
    .getByRole("button", { name: "Review 10-year risk result →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Assessment Result", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Illustrative estimate; not a clinically validated prediction/,
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  await expect(
    page.getByText("Saved assessment", { exact: true }),
  ).toBeVisible();
  await nav(page, "Assessment History");
  await page.locator("#historySearch").fill("AST-11");
  await expect(page.locator("#historyLiveResults tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "View", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Assessment AST-0011", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Illustrative estimate; not a clinically validated prediction/,
    ),
  ).toBeVisible();
  await expect(
    page.locator(".history-question-value").filter({
      has: page.locator("dt", { hasText: /^Systolic blood pressure$/ }),
    }),
  ).toHaveText("Systolic blood pressure132 mmHg");
  await expect(page.locator(".private-name")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reveal name for PNT-000001", exact: true })
    .click();
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printRevealedCount = String(
        document.querySelectorAll(".private-name").length,
      );
    };
  });
  await page.getByRole("button", { name: "Print record", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-print-revealed-count",
    "0",
  );
  expect(errors).toEqual([]);
});

test("administrator manages accounts, filters and exports de-identified reports", async ({
  page,
}) => {
  await signIn(page);
  await nav(page, "User Accounts");
  await page
    .getByRole("button", { name: "+ Add healthcare worker", exact: true })
    .click();
  await page.locator("#name").fill("Fictional Demo Worker");
  await page.locator("#email").fill("fictional@pintig.demo");
  await page.locator("#pass").fill("DemoPass123!");
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await page.locator("#userSearch").fill("fictional@pintig.demo");
  await expect(page.locator("#userLiveResults tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#userLiveResults .tag")).toHaveText("Active");
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  await page.locator("#pintigConfirmAction").click();
  await page.locator("#userStatus").selectOption("Inactive");
  await expect(page.locator("#userLiveResults tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Activate", exact: true }).click();
  await expect(page.locator("#userLiveResults tbody tr")).toHaveCount(0);
  await nav(page, "Reports");
  await expect(page.locator("#reportCategory")).toBeDisabled();
  await page.locator("#reportType").selectOption("Assessments");
  await page.locator("#reportCategory").selectOption("High");
  await expect(page.locator("#reportLiveResults tbody tr")).toHaveCount(3);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const csv = await fs.readFile((await (await downloaded).path())!, "utf8");
  expect(csv).toContain("PNT-000002");
  expect(csv).not.toMatch(/Elena|Reyes|PhilHealth/);
  await nav(page, "Audit Logs");
  await page.locator("#auditSearch").fill("fictional@pintig.demo");
  await expect(page.locator("#auditLiveResults tbody tr")).toHaveCount(3);
  await nav(page, "Maintenance");
  const backupPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export records", exact: true })
    .click();
  const backup = JSON.parse(
    await fs.readFile((await (await backupPromise).path())!, "utf8"),
  );
  expect(backup.users[0]).not.toHaveProperty("pass");
  expect(backup.patients[0]).not.toHaveProperty("first");
  await page.getByRole("button", { name: "Switch account", exact: true }).click();
  await page.locator("#pintigConfirmAction").click();
  await expect(
    page.getByRole("heading", { name: "Welcome back", exact: true }),
  ).toBeVisible();
  await page.locator("#email").fill("fictional@pintig.demo");
  await page.locator("#password").fill("DemoPass123!");
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Healthcare Dashboard", exact: true }),
  ).toBeVisible();
});

test("core input mode, eligibility, invalid pressure and clear confirmation", async ({
  page,
}) => {
  await signIn(page, "worker");
  await intake(page);
  await expect(page.locator("#extraQuestionnaire")).toHaveCount(0);
  await expect(page.locator("#waist")).toHaveCount(0);
  await expect(page.locator("#alcoholUse")).toHaveCount(0);
  await expect(page.locator("#activityDays")).toHaveCount(0);
  await page.locator("#screen-cardiovascularHistory").selectOption("Yes");
  await expect(page.getByRole("heading",{name:"First-Event Risk Assessment Not Applicable"})).toBeVisible();
  await expect(page.locator(".assessment-predictors")).toBeHidden();
  await page.locator("#screen-cardiovascularHistory").selectOption("No");
  await completePreAssessment(page);
  await expect(page.locator("#sbp")).toHaveValue("132");
  await page.locator("#dbp").fill("140");
  await page
    .getByRole("button", { name: "Review 10-year risk result →", exact: true })
    .click();
  await expect(page.locator("#dbp-error")).toBeVisible();
  await page.locator("#dbp").fill("82");
  await page
    .getByRole("button", { name: "Review 10-year risk result →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Assessment Result", exact: true }),
  ).toBeVisible();
  await nav(page, "New Risk Assessment");
  await page
    .getByRole("button", { name: "Clear assessment", exact: true })
    .click();
  await page.locator("#pintigConfirmAction").click();
  await expect(page.locator("#sbp")).toHaveValue("");
  await expect(page.locator("#mode")).toHaveCount(0);
});

test("every route and the v27 reference remain readable on desktop and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await signIn(page);
  for (const route of [
    "Dashboard",
    "Patient Management",
    "New Risk Assessment",
    "Assessment History",
    "Reports",
    "User Accounts",
    "Audit Logs",
    "Maintenance",
    "Help",
    "About",
    "My Account",
  ]) {
    await nav(page, route);
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nav(page, "Patient Management");
  await expect(page.locator("#patientQuery")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-patients.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await nav(page, "Dashboard");
  await page.screenshot({
    path: "test-results/react-dashboard.png",
    fullPage: true,
  });
  await page.goto("/legacy/PINTIG_Web_Application_v27.html");
  await page.locator('[data-act="adminDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Administrator Dashboard", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/v27-dashboard.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("questionnaire uses the verified Framingham core wording and removes non-core custom items", async ({
  page,
}) => {
  await signIn(page, "worker");
  await nav(page, "New Risk Assessment");
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);

  await expect(
    page.getByRole("heading", { name: "Framingham-aligned risk questions" }),
  ).toBeVisible();
  await expect(
    page.getByText("Do you now smoke cigarettes (as of 1 month ago)?", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator("#currentSmoking option")).toHaveText([
    "Choose an answer",
    "No",
    "Yes",
    "Unknown",
  ]);

  await expect(
    page.getByText(
      "Have you ever taken medication for hypertension/high blood pressure?",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(page.locator("#bpMeds option")).toHaveText([
    "Choose an answer",
    "No",
    "Yes, now",
    "Yes, not now",
    "Unknown",
  ]);
  await page.locator("#bpMeds").selectOption("Past");
  await expect(page.locator("#previewBpMeds")).toHaveText("Yes, not now");
  await page.locator("#bpMeds").selectOption("No");

  for (const id of [
    "waist",
    "mode",
    "extraQuestionnaire",
    "diabetesHistory",
    "pastBpMeds",
    "alcoholUse",
    "alcoholDays",
    "drinksPerDay",
    "activityDays",
    "activityPerDay",
    "walkingPace",
    "fruitVeg",
    "wholeGrain",
    "saltFrequency",
    "processedFood",
    "family",
    "education",
    "employment",
  ])
    await expect(page.locator("#" + id)).toHaveCount(0);

  for (const id of [
    "sbp",
    "dbp",
    "height",
    "weight",
    "bmi",
    "currentSmoking",
    "bpMeds",
  ])
    await expect(page.locator("#" + id)).toHaveCount(1);
});
