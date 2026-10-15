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
async function intake(page: Page, mode = "extended") {
  await nav(page, "New Risk Assessment");
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
  await page.locator("#sbp").fill("132");
  await page.locator("#dbp").fill("82");
  await page.locator("#height").fill("168");
  await page.locator("#weight").fill("71.4");
  await page.locator("#currentSmoking").selectOption("No");
  await page.locator("#bpMeds").selectOption("No");
  await page.locator("#mode").selectOption(mode);
  if (mode === "extended") {
    await page.locator("#alcoholUse").selectOption("Yes");
    await page.locator("#alcoholDays").fill("1");
    await page.locator("#drinksPerDay").fill("2");
    await page.locator("#activityDays").fill("3");
    await page.locator("#activityPerDay").fill("60");
  }
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
  await expect(page.locator("#alcoholDrinksDisplay")).toHaveText(
    "2.0 drinks/week",
  );
  await expect(page.locator("#activityMinutesDisplay")).toHaveText(
    "180 min/week",
  );
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
  await intake(page, "observed");
  await expect(page.locator("#extraQuestionnaire")).toBeHidden();
  await expect(page.locator("#previewActivity")).toHaveText("Not included");
  await page.locator("#screen-heartAttack").selectOption("Yes");
  await expect(page.getByRole("heading",{name:"First-Event Risk Assessment Not Applicable"})).toBeVisible();
  await expect(page.locator(".assessment-predictors")).toBeHidden();
  await page.locator("#screen-heartAttack").selectOption("No");
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
  await expect(page.locator("#mode")).toHaveValue("extended");
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

test("questionnaire fields, labels, options and constraints match the original v27", async ({
  page,
  context,
}) => {
  await signIn(page, "worker");
  await nav(page, "New Risk Assessment");
  const inspect = async (target: Page) =>
    target.locator("#assessmentForm").evaluate((form) => ({
      // Only the presentation label for the input-set selector was changed.
      labels: Array.from(form.querySelectorAll("label:not([for='mode']):not([for='prior']):not([for='verified']):not([for^='screen-'])")).map(
        (label) => label.textContent?.replace(/\s*\*\s*$/, "").trim(),
      ),
      fields: Array.from(form.querySelectorAll("input:not([name=prior]):not([name=verified]),select:not([data-screening-key]):not([name=prior]):not([name=verified])")).map((node) => ({
        id: node.id,
        name: node.getAttribute("name"),
        type: node.getAttribute("type"),
        min: node.getAttribute("min"),
        max: node.getAttribute("max"),
        step: node.getAttribute("step"),
        // These existing submission-required fields now expose native required state.
        required: [
          "alcoholDays",
          "drinksPerDay",
          "activityDays",
          "activityPerDay",
        ].includes(node.id)
          ? true
          : node.hasAttribute("required"),
        options:
          node.tagName === "SELECT"
            ? Array.from(node.querySelectorAll("option")).map((option) => ({
                value: option.value,
                text: node.id === "mode" ? option.value : option.textContent,
              }))
            : undefined,
      })),
    }));
  await expect(page.locator("[data-screening-key]")).toHaveCount(18);
  const current = await inspect(page);
  const patientOptions = current.fields.find(field => field.id === "pid")!.options!;
  expect(patientOptions.slice(4)).toEqual(Array.from({length:8}, (_, index) => ({
    value: String(index + 4), text: `PNT-${String(index + 4).padStart(6, "0")}`,
  })));
  // The questionnaire is unchanged; only the explicitly added patient choices differ.
  current.fields.find(field => field.id === "pid")!.options = patientOptions.slice(0, 4);
  const reference = await context.newPage();
  await reference.goto("/legacy/PINTIG_Web_Application_v27.html");
  await reference.locator('[data-act="workerDemo"]').click();
  await reference
    .getByRole("button", { name: "Sign in →", exact: true })
    .click();
  await nav(reference, "New Risk Assessment");
  expect(current).toEqual(await inspect(reference));
  await reference.close();
});
