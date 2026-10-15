import { test, expect } from "@playwright/test";
test("Help tabs show the selected theme style and support keyboard switching", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.locator('button[type="submit"]').click();
  await page.locator('.sidebar [data-act="nav:Help"]').click();
  const guide = page.getByRole("tab", { name: "User Guide" });
  const faq = page.getByRole("tab", { name: "FAQs" });
  await expect(guide).toHaveAttribute("aria-selected", "true");
  await expect(guide).toHaveClass(/primary/);
  await expect(faq).not.toHaveClass(/primary/);
  await expect(faq).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await faq.click();
  await expect(faq).toHaveClass(/primary/);
  await expect(guide).not.toHaveClass(/primary/);
  await expect(page.getByRole("tabpanel")).toContainText(
    "Frequently asked questions",
  );
  await faq.press("ArrowLeft");
  await expect(guide).toBeFocused();
  await expect(guide).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Assessment workflow");
});
