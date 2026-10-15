import {completePreAssessment} from "./preAssessmentHelpers";
import { test, expect, type Page } from "@playwright/test";

async function openHarness(page: Page, scenario = "ready") {
  await page.goto("/tests/browser/fixtures/cif-harness.html?case=" + scenario);
}
test("compatible-only mode omits whole invalid panels and retains valid recorded curves", async ({
  page,
}) => {
  for (const scenario of ["missing", "invalid", "wrong-event", "loading"]) {
    await page.goto(
      "/tests/browser/fixtures/cif-harness.html?compatibleOnly&case=" +
        scenario,
    );
    await expect(page.locator(".cif-panel")).toHaveCount(0);
    await expect(page.locator(".cif-svg")).toHaveCount(0);
  }
  await page.goto("/tests/browser/fixtures/cif-harness.html?compatibleOnly");
  await expect(page.locator(".cif-panel")).toHaveCount(1);
  await expect(page.locator(".cif-svg")).toBeVisible();
  await page.getByLabel("Cumulative probability reference").selectOption("0.1");
  await expect(page.locator(".cif-marker-status")).toContainText(
    "Reference level not reached",
  );
  await page.goto('/tests/browser/fixtures/cif-harness.html?compatibleOnly&historical');
  await expect(page.locator('.cif-svg')).toBeVisible();
  await expect(page.locator('.cif-readouts')).toContainText('8.1%');
});
test("reference and inspection controls update immediately without changing ten-year grouping", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openHarness(page);
  const reference = page.getByLabel("Cumulative probability reference"),
    inspection = page.getByLabel("Inspect a supported year");
  await expect(reference).toHaveValue("0.05");
  await expect(page.locator(".cif-marker-status strong")).toHaveText(
    "5% cumulative probability first reached by Year 7.",
  );
  await expect(page.locator("[data-cif-marker-year]")).toHaveAttribute(
    "data-cif-marker-year",
    "7",
  );
  const curve = await page.locator(".cif-curve").getAttribute("d");
  expect(curve).toContain("H ");
  expect(curve).not.toContain(" L ");
  await reference.focus();
  await page.keyboard.press("ArrowDown");
  await expect(reference).toHaveValue("0.1");
  await expect(page.locator(".cif-marker-status strong")).toHaveText(
    "Reference level not reached within the 10-year prediction horizon.",
  );
  await expect(page.locator("[data-cif-marker-year]")).toHaveCount(0);
  expect(await page.locator(".cif-curve").getAttribute("d")).toBe(curve);
  await reference.selectOption("0.2");
  await expect(page.locator("[data-cif-marker-year]")).toHaveCount(0);
  await reference.selectOption("0.05");
  await inspection.selectOption("6");
  await expect(page.locator("output")).toHaveText(
    "Year 64.3% cumulative probability",
  );
  await expect(page.getByTestId("risk-category")).toHaveText("Moderate");
  await expect(page.locator(".cif-readouts p")).toHaveText(
    "Ten-year estimate8.1%",
  );
  await expect(
    page.getByRole("img", { name: /Ten-year cumulative probability curve/ }),
  ).toBeVisible();
  await page.locator(".cif-details summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("table", {
      name: "Supported annual cumulative probabilities",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "Year 7 5%", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("missing, invalid, mismatched and loading data never produce fabricated curves", async ({
  page,
}) => {
  for (const scenario of ["missing", "invalid", "wrong-event"]) {
    await openHarness(page, scenario);
    await expect(
      page.getByText("Cumulative probability curve unavailable", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".cif-svg")).toHaveCount(0);
    await expect(
      page.getByLabel("Cumulative probability reference"),
    ).toHaveCount(0);
  }
  await openHarness(page, "loading");
  await expect(
    page.getByText("Loading cumulative probability…", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".cif-svg")).toHaveCount(0);
  await page.getByRole("button", { name: "Complete loading" }).click();
  await expect(page.locator(".cif-svg")).toBeVisible();
});
test("chart remains readable on desktop, tablet, mobile and 200% zoom-equivalent widths", async ({
  page,
}) => {
  await openHarness(page);
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByLabel("Cumulative probability reference"),
    ).toBeVisible();
    const box = await page
      .getByLabel("Cumulative probability reference")
      .boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page
        .locator(".cif-x-scale span")
        .evaluateAll((nodes) =>
          nodes.every(
            (node, index) =>
              index === 0 ||
              nodes[index - 1].getBoundingClientRect().right <=
                node.getBoundingClientRect().left,
          ),
        ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/cif-${width}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByLabel("Cumulative probability reference").selectOption("0.1");
  await expect(page.locator("[data-cif-marker-year]")).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByLabel("Cumulative probability reference"),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/cif-200-percent.png",
    fullPage: true,
  });
});
test("existing live and historical assessments omit unavailable CIF panels", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.locator('.sidebar [data-act="nav:Assessment History"]').click();
  await page.getByRole("button", { name: "View", exact: true }).first().click();
  await expect(
    page.getByText("Cumulative probability curve unavailable", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".cif-svg")).toHaveCount(0);
  await expect(page.locator(".cif-panel")).toHaveCount(0);
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await completePreAssessment(page);
  for (const [key, value] of [
    ["currentSmoking", "No"],
    ["bpMeds", "No"],
    ["mode", "observed"],
  ])
    await page.locator("#" + key).selectOption(value);
  for (const [key, value] of [
    ["sbp", "132"],
    ["dbp", "82"],
    ["bmi", "25"],
  ])
    await page.locator("#" + key).fill(value);
  await page
    .getByRole("button", { name: "Review 10-year risk result →", exact: true })
    .click();
  await expect(
    page.getByText("Cumulative probability curve unavailable", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".cif-svg")).toHaveCount(0);
  await expect(page.locator(".cif-panel")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  await expect(
    page.getByText("Saved assessment", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/cif-live-unavailable.png",
    fullPage: true,
  });
});
