import { test, expect } from "@playwright/test";
test("isolated guidance remains independent of keyboard-operated CIF controls and responsive", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixtures/cif-harness.html");
  const panel = page.getByRole("region", {
    name: "Further Assessment Guidance",
  });
  await expect(panel).toContainText(
    "Discuss modifiable cardiovascular risk factors",
  );
  const original = await panel.textContent();
  await page.getByLabel("Cumulative probability reference").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Cumulative probability reference")).toHaveValue(
    "0.1",
  );
  await page.getByLabel("Inspect a supported year").selectOption("6");
  expect(await panel.textContent()).toBe(original);
  await expect(panel.locator('[role="status"]')).toHaveAttribute(
    "aria-live",
    "polite",
  );
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(panel).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.evaluate(() => (document.body.style.zoom = "200%"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("normal results and saved records withhold category advice and retain education", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  for (const [id, value] of [
    ["pid", "1"],
    ["prior", "No"],
    ["verified", "Yes"],
    ["currentSmoking", "Yes"],
    ["bpMeds", "No"],
    ["mode", "observed"],
  ])
    await page.locator("#" + id).selectOption(value);
  for (const [id, value] of [
    ["sbp", "145"],
    ["dbp", "92"],
    ["bmi", "24"],
  ])
    await page.locator("#" + id).fill(value);
  await page
    .getByRole("button", { name: "Review 10-year risk result →" })
    .click();
  const panel = page.getByRole("region", {
    name: "Further Assessment Guidance",
  });
  await expect(panel).toContainText("not a clinically validated prediction");
  await expect(
    page.getByRole("heading", { name: "General Educational Guidance" }),
  ).toBeVisible();
  await expect(page.getByText(/Arrange blood pressure review/)).toBeVisible();
  await page.locator('[data-act="saveAssessment"]').click();
  await page.locator('.sidebar [data-act="nav:Assessment History"]').click();
  await page.locator('[data-act^="record:"]').last().click();
  await expect(panel).toContainText(
    "No verified further assessment guidance was recorded",
  );
  await expect(
    page.getByRole("heading", { name: "General Educational Guidance" }),
  ).toBeVisible();
});
