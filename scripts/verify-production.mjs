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
  const currentRows = await page.locator("table tbody tr").count();
  assert.equal(
    currentRows,
    5,
    "Dashboard displays the latest five assessments",
  );
  const rowHeight = (await page.locator("table tbody tr").first().boundingBox())
    .height;
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
  const originalRows = await page.locator("table tbody tr").count();
  await page.screenshot({
    path: "test-results/reference-dashboard.png",
    fullPage: true,
  });
  for (const selector of Object.keys(current))
    for (let coordinate = 0; coordinate < 4; coordinate++) {
      // Added saved fixtures fill the existing five-row recent-assessments limit.
      if (selector === "table" && coordinate === 3) {
        assert.equal(
          current.table[3],
          original.table[3] + (currentRows - originalRows) * rowHeight,
          "Recent table height must differ only by its added record rows",
        );
        continue;
      }
      // The added distribution section increases content height and moves the
      // recent-assessment table down. Preserve all other baseline geometry checks.
      if (
        (selector === ".maincontent" && coordinate === 3) ||
        (selector === "table" && coordinate === 1)
      ) {
        assert.ok(
          current[selector][coordinate] >= original[selector][coordinate],
          `Expected added dashboard content: ${selector}`,
        );
        continue;
      }
      assert.equal(
        current[selector][coordinate],
        original[selector][coordinate],
        `Dashboard layout differs from v27: ${selector}`,
      );
    }
  await page.goto(base);
  await page.locator('[data-act="adminDemo"]').click();
  await page.locator('button[type="submit"]').click();
  await page.locator(".risk-distribution").waitFor();
  assert.equal(await page.locator(".distribution-row").count(), 4);
  const researchRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://127.0.0.1:8765/"))
      researchRequests.push(request.url());
  });
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("11");
  await page
    .getByRole("button", { name: "Prefill questionnaire", exact: true })
    .click();
  await page.locator('#assessmentForm button[type="submit"]').click();
  await page
    .getByRole("heading", { name: "Assessment Result", exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".research-cig").count(),
    0,
    "Production must not enable local research inference",
  );
  assert.deepEqual(
    researchRequests,
    [],
    "Production must not contact the private R service",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Production assets, React login/dashboard, original reference and layout geometry: passed.",
  );
} finally {
  await browser.close();
}
