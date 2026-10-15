import test from "node:test";
import assert from "node:assert/strict";
import { riskDistribution } from "../src/services/riskDistribution.ts";
import { RISK_BAND_VERSION } from "../src/utils/risk.ts";
const record = (risk, band, extra = {}) => ({ risk, band, pid: 1, ...extra });
test("distribution counts saved assessments including repeat patients and exact boundaries", () => {
  const rows = [
    record(0.049999, "Low"),
    record(0.05, "Moderate"),
    record(0.1, "High"),
    record(0.2, "Very High"),
    record(0.3, "Very High", { riskBandVersion: RISK_BAND_VERSION }),
  ];
  const original = JSON.stringify(rows);
  const d = riskDistribution(rows);
  assert.deepEqual(
    d.categories.map((x) => x.count),
    [1, 1, 1, 2],
  );
  assert.deepEqual(
    d.categories.map((x) => x.percentage),
    [20, 20, 20, 40],
  );
  assert.equal(d.total, 5);
  assert.equal(d.excluded, 0);
  assert.equal(JSON.stringify(rows), original);
});
test("empty and single records preserve zero categories", () => {
  const empty = riskDistribution([]);
  assert.equal(empty.total, 0);
  assert.equal(empty.categories.length, 4);
  assert.ok(empty.categories.every((x) => x.percentage === 0 && x.count === 0));
  assert.deepEqual(
    riskDistribution([record(0.15, "High")]).categories.map(
      (x) => x.percentage,
    ),
    [0, 0, 100, 0],
  );
});
test("invalid, inconsistent and unknown-version records are excluded without reclassification", () => {
  const d = riskDistribution([
    record(NaN, "Very High"),
    record(Infinity, "High"),
    record(-0.1, "Low"),
    record(1.1, "Very High"),
    record(undefined, "Low"),
    record("0.1", "High"),
    record(0.1, "Moderate"),
    record(0.1, "Other"),
    record(0.1, "High", { riskBandVersion: "FUTURE-BANDS" }),
    null,
    record(0.1, "High"),
  ]);
  assert.equal(d.total, 1);
  assert.equal(d.excluded, 10);
  assert.equal(
    d.categories.reduce((n, x) => n + x.count, 0),
    d.total,
  );
});
