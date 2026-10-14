import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TenYearProbabilityChart } from "../src/components/TenYearProbabilityChart.tsx";
test("scalar probability chart preserves the supplied estimate and rejects invalid data", () => {
  for (const risk of [0, 0.172, 1]) {
    const html = renderToStaticMarkup(
      createElement(TenYearProbabilityChart, { risk }),
    );
    assert.ok(
      html.includes(
        `${(risk * 100).toFixed(1)}% estimated ten-year probability`,
      ),
    );
    assert.ok(html.includes("0–100%"));
    assert.ok(html.includes('role="img"'));
  }
  for (const risk of [NaN, Infinity, -0.1, 1.1])
    assert.equal(
      renderToStaticMarkup(createElement(TenYearProbabilityChart, { risk })),
      "",
    );
});
