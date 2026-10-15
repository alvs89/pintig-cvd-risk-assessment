import { test, expect } from "@playwright/test";
test("Reports has compact counts, responsive controls and working filters", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-act="adminDemo"]').click();
  await page.locator('button[type="submit"]').click();
  await page.locator('.sidebar [data-act="nav:Reports"]').click();
  await expect(page.locator(".report-count")).toHaveText("(3 records found)");
  await expect(page.locator(".report-count")).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await expect(page.locator('[data-act="clearReport"]')).toHaveCSS(
    "background-color",
    "rgb(241, 247, 248)",
  );
  const title = await page.locator(".report-summary h2").boundingBox();
  const actions = await page.locator(".report-actions").boundingBox();
  expect(
    Math.abs(title!.y + title!.height / 2 - actions!.y - actions!.height / 2),
  ).toBeLessThan(3);
  const controls = await Promise.all(
    ["#reportType", "#reportSearch", "#reportCategory"].map((s) =>
      page.locator(s).boundingBox(),
    ),
  );
  expect(
    Math.max(...controls.map((b) => b!.y)) -
      Math.min(...controls.map((b) => b!.y)),
  ).toBeLessThan(3);
  expect(
    (await page.locator(".report-count").boundingBox())!.height,
  ).toBeLessThan(65);
  await page.locator("#reportSearch").fill("PNT-000001");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.locator('[data-act="clearReport"]').click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.locator("#reportType").selectOption("Assessments");
  await page.locator("#reportCategory").selectOption("High");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator('[data-act="exportCSV"]')).toBeVisible();
  }
});
