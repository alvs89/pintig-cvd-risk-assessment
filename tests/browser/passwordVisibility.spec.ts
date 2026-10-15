import { test, expect } from "@playwright/test";

test("sign-in password toggle preserves input and supports keyboard and responsive layouts", async ({
  page,
}) => {
  await page.goto("/");
  const password = page.locator("#password");
  await expect(password).toHaveAttribute("type", "password");
  await page.locator('[data-act="adminDemo"]').click();
  // Compare in memory without logging credentials or capturing revealed screenshots.
  const before = await password.inputValue();
  const show = page.getByRole("button", { name: "Show password", exact: true });
  await show.hover();
  await expect(show).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(show).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  await expect(show).toHaveCSS("color", "rgb(23, 52, 74)");
  await show.focus();
  await show.press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue(before);
  await expect(page.locator("#loginForm")).toBeVisible();
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .press("Space");
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue(before);
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const input = await password.boundingBox();
    const toggle = await show.boundingBox();
    expect(toggle!.x).toBeGreaterThan(input!.x);
    expect(toggle!.x + toggle!.width).toBeLessThanOrEqual(
      input!.x + input!.width,
    );
    expect(
      Math.abs(toggle!.y + toggle!.height / 2 - input!.y - input!.height / 2),
    ).toBeLessThan(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(
    page.getByRole("heading", { name: "Administrator Dashboard", exact: true }),
  ).toBeVisible();
});
