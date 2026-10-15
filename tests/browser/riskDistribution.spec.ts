import { test, expect } from "@playwright/test";
for (const role of ["admin", "worker"])
  test(`${role} distribution has accurate shared scope, interaction and responsive bars`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(`[data-act="${role}Demo"]`).click();
    await page.locator('button[type="submit"]').click();
    const panel = page.getByRole("region", {
      name: "Cardiovascular Risk Distribution",
    });
    await expect(panel).toContainText("2 saved assessments represented");
    await expect(panel).toContainText(
      role === "admin" ? "Overall accessible" : "Shared assessment records",
    );
    for (const category of ["Low", "Moderate", "High", "Very High"])
      await expect(
        panel.getByRole("button", { name: new RegExp("^" + category + " ") }),
      ).toBeVisible();
    await expect(
      panel.getByRole("button", {
        name: "High 1 assessment 50.0%",
        exact: true,
      }),
    ).toBeVisible();
    await panel
      .getByRole("button", { name: "High 1 assessment 50.0%", exact: true })
      .press("Enter");
    await expect(panel.locator(".distribution-detail")).toContainText(
      "High: 1 saved assessment",
    );
    if (role === "worker")
      for (const name of [
        "Reports",
        "User Accounts",
        "Audit Logs",
        "Maintenance",
      ])
        await expect(
          page.locator(`.sidebar [data-act="nav:${name}"]`),
        ).toHaveCount(0);
    for (const width of [1440, 820, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
test("saving an assessment updates dashboard totals without refresh", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:8765/research-cif", (r) => r.abort());
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.locator('button[type="submit"]').click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await page
    .getByRole("button", { name: "Prefill questionnaire", exact: true })
    .click();
  await page.locator('#assessmentForm button[type="submit"]').click();
  await page.locator('[data-act="saveAssessment"]').click();
  await page.locator('.sidebar [data-act="nav:Dashboard"]').click();
  await expect(page.locator(".risk-distribution")).toContainText(
    "3 saved assessments represented",
  );
  await expect(
    page
      .locator(".risk-distribution")
      .getByRole("button", { name: "High 2 assessments 66.7%", exact: true }),
  ).toBeVisible();
});
