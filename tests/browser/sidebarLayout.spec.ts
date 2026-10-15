import { test, expect } from "@playwright/test";
for (const role of ["worker", "admin"]) {
  test(`${role} profile stays at the sidebar bottom and remains reachable on short screens`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto("/");
    await page.locator(`[data-act="${role}Demo"]`).click();
    await page.locator('button[type="submit"]').click();
    const sidebar = page.locator(".sidebar"),
      profile = page.locator(".sidebar .userinfo");
    const side = await sidebar.boundingBox(),
      box = await profile.boundingBox();
    const padding = await sidebar.evaluate((el) =>
      parseFloat(getComputedStyle(el).paddingBottom),
    );
    expect(
      Math.abs(side!.y + side!.height - padding - box!.y - box!.height),
    ).toBeLessThan(2);
    await page.setViewportSize({ width: 820, height: 500 });
    await page.locator('[data-act="logout"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-act="logout"]')).toBeInViewport();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(profile).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
