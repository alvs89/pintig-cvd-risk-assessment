import { test, expect, type Locator } from "@playwright/test";
async function checkHover(button: Locator) {
  await button.hover();
  await expect(button).toHaveCSS("color", "rgb(23, 52, 74)");
  await expect(button).toHaveCSS("background-color", "rgb(237, 246, 246)");
}
test("button variants use readable navy text on a light hover background", async ({
  page,
}) => {
  await page.goto("/");
  await checkHover(page.locator('[data-act="adminDemo"]'));
  await page.locator('[data-act="adminDemo"]').click();
  await checkHover(page.locator('button[type="submit"]'));
  await page.locator('button[type="submit"]').click();
  await checkHover(page.locator('.sidebar [data-act="nav:Reports"]'));
  await page.locator('.sidebar [data-act="nav:Reports"]').click();
  await checkHover(page.locator('[data-act="exportCSV"]'));
  await checkHover(page.locator('[data-act="clearReport"]'));
  await checkHover(page.locator('[data-act="revealIdentity:1"]'));
  await checkHover(page.locator('[data-act="logout"]'));
  await page.locator('[data-act="logout"]').click();
  await checkHover(page.locator(".pintig-confirm__danger"));
  await checkHover(page.getByRole("button", { name: "Cancel", exact: true }));
});
