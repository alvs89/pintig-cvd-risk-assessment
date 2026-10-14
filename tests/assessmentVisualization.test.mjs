import test from "node:test";
import assert from "node:assert/strict";
import { assessmentVisualizationData } from "../src/services/assessmentVisualization.ts";

test("visualization reuses the original exact ten-year probability and band", () => {
  const sample = assessmentVisualizationData(0.17204, "High", [
    ["Age", 0.0312],
    ["Smoking", 0.034],
    ["Activity", -0.008],
    ["Ignored zero", 0],
  ]);
  assert.equal(sample.status, "ready");
  assert.equal(sample.percent, 17.204);
  assert.ok(Math.abs(sample.remainderPercent - 82.796) < 1e-9);
  assert.deepEqual(sample.factors.map((f) => f.name), ["Age", "Smoking", "Activity"]);
  assert.equal(sample.factors[1].points, 3.4000000000000004);
  assert.equal(sample.factors[1].direction, "positive");
  assert.equal(sample.factors[2].direction, "negative");
  assert.equal(sample.factors[1].widthPercent, 48);
  assert.ok(sample.factors[2].widthPercent < 48);
});

test("charts refuse invalid probabilities and mismatched categories", () => {
  for (const x of [undefined, null, NaN, Infinity, -0.1, 1.1, "0.17"])
    assert.equal(assessmentVisualizationData(x, "High", []).status, "unavailable");
  assert.equal(assessmentVisualizationData(0.172, "Low", []).status, "unavailable");
  for (const [p, band] of [
    [0.0499999, "Low"],
    [0.05, "Moderate"],
    [0.1, "High"],
    [0.2, "Very High"],
    [1, "Very High"],
  ])
    assert.equal(assessmentVisualizationData(p, band).status, "ready");
});

test("a historical record without factor snapshots does not invent them", () => {
  const result = assessmentVisualizationData(0.238, "Very High");
  assert.equal(result.status, "ready");
  assert.equal(result.factors.length, 0);
});

test("nonfinite and invalid factor terms cannot appear as charted values", () => {
  const result = assessmentVisualizationData(0.1, "High", [
    ["Good", -0.005],
    ["NaN", NaN],
    ["Infinite", Infinity],
    ["", 0.4],
    ["Zero", 0],
  ]);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.factors.map((f) => f.name), ["Good"]);
  assert.equal(result.factors[0].widthPercent, 48);
});
