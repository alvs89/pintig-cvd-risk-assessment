import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const base = process.env.PINTIG_PREVIEW_URL ?? "http://127.0.0.1:5174";
const html = await (await fetch(base)).text();
const assets = Array.from(
  html.matchAll(/(?:src|href)="([^"]+)"/g),
  (match) => match[1],
);
for (const asset of assets) {
  const response = await fetch(new URL(asset, base));
  assert.equal(response.status, 200, `Production asset unavailable: ${asset}`);
}
assert.equal((await fetch(base + "/src/main.tsx")).status, 404);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(base);
  await page.locator('[data-act="adminDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page
    .getByRole("heading", { name: "Administrator Dashboard", exact: true })
    .waitFor();
  const boxes = () =>
    page.evaluate(() =>
      Object.fromEntries(
        [".sidebar", ".maincontent", ".cards", ".metric", "table"].map(
          (selector) => {
            const rect = document
              .querySelector(selector)
              .getBoundingClientRect();
            return [selector, [rect.x, rect.y, rect.width, rect.height]];
          },
        ),
      ),
    );
  const current = await boxes();
  await page.screenshot({
    path: "test-results/production-dashboard.png",
    fullPage: true,
  });
  await page.goto(base + "/legacy/PINTIG_Web_Application_v27.html");
  await page.locator('[data-act="adminDemo"]').click();
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page
    .getByRole("heading", { name: "Administrator Dashboard", exact: true })
    .waitFor();
  const original = await boxes();
  await page.screenshot({
    path: "test-results/reference-dashboard.png",
    fullPage: true,
  });
  for (const selector of Object.keys(current))
    for (let coordinate = 0; coordinate < 4; coordinate++) {
      assert.equal(
        current[selector][coordinate],
        original[selector][coordinate],
        `Dashboard layout differs from v27: ${selector}`,
      );
    }
  assert.deepEqual(errors, []);
  console.log(
    "Production assets, React login/dashboard, original reference and layout geometry: passed.",
  );
} finally {
  await browser.close();
}
