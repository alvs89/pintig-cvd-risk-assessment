import { test, expect } from "@playwright/test";

for (const width of [1440, 820, 390]) {
  test(`assessment submission opens results at the top at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("http://127.0.0.1:8765/research-cif", (route) =>
      route.abort(),
    );
    await page.goto("/");
    await page.locator('[data-act="workerDemo"]').click();
    await page.locator('button[type="submit"]').click();
    await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
    await page.locator("#pid").selectOption("1");
    await page
      .getByRole("button", { name: "Load recorded intake", exact: true })
      .click();
    const submit = page.locator('#assessmentForm button[type="submit"]');
    await submit.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(() =>
        Math.max(window.scrollY, document.querySelector(".appmain")!.scrollTop),
      ),
    ).toBeGreaterThan(100);
    await submit.click();
    const heading = page.getByRole("heading", {
      name: "Assessment Result",
      exact: true,
    });
    await expect(heading).toBeFocused();
    await expect
      .poll(() => page.locator(".appmain").evaluate((el) => el.scrollTop))
      .toBe(0);
    const bounds = await heading.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeLessThan(220);
    await expect(page.locator(".risk")).toBeVisible();
  });
}
