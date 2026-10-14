import test from "node:test";
import assert from "node:assert/strict";
import {
  validateCif,
  probabilityAt,
  referenceMarker,
} from "../src/services/cif.ts";
import { createSnapshot } from "../src/services/snapshots.ts";
import { band } from "../src/utils/risk.ts";

// Isolated mathematical fixtures; never loaded by application records or prediction logic.
const context = {
  source: "competing-risk-rsf",
  patientId: 1,
  modelVersion: "UNIT-TEST-RSF",
  outcome: {
    id: "TEST-FIRST-MAJOR-CVD",
    label: "First major cardiovascular event",
    definition: "Unit-test composite endpoint only",
    kind: "first-major-cvd",
    eventCode: "CVD",
    competingEventCode: "NON-CVD-DEATH",
  },
};
const make = (overrides = {}) => ({
  patientId: 1,
  modelVersion: context.modelVersion,
  outcomeId: context.outcome.id,
  eventCode: "CVD",
  probabilityUnit: "fraction",
  timeUnit: "years",
  supportedUntil: 10,
  times: [0, 1, 5, 6, 7, 8, 10],
  probabilities: [0, 0.005, 0.033, 0.043, 0.05, 0.062, 0.081],
  ...overrides,
});
const ready = (data = make(), risk = 0.081) => {
  const result = validateCif(data, context, 1, risk);
  assert.equal(result.status, "ready");
  return result;
};

test("reference example uses full-precision supplied CIF and independent levels", () => {
  const data = ready();
  assert.equal(referenceMarker(data.annual, 0.05).year, 7);
  assert.equal(referenceMarker(data.annual, 0.1), undefined);
  assert.equal(referenceMarker(data.annual, 0.2), undefined);
});
test("exact 5%, 10%, 20% equality and final-year crossings are included", () => {
  for (const reference of [0.05, 0.1, 0.2]) {
    const data = ready(
      make({
        times: [0, 9, 10],
        probabilities: [0, reference - 0.01, reference],
      }),
      reference,
    );
    assert.equal(referenceMarker(data.annual, reference).year, 10);
  }
});
test("irregular grids evaluate the right-continuous step without interpolation", () => {
  const data = ready(
    make({
      times: [0, 5.3, 6.4, 10.2],
      probabilities: [0, 0.049, 0.055, 0.081],
      supportedUntil: 10.2,
    }),
    0.055,
  );
  assert.equal(referenceMarker(data.annual, 0.05).year, 7);
  assert.equal(probabilityAt(data.points, 6), 0.049);
  assert.equal(probabilityAt(data.points, 6.4), 0.055);
  assert.equal(probabilityAt(data.points, 10), 0.055);
  assert.equal(probabilityAt(data.points, -1), undefined);
  assert.equal(probabilityAt(data.points, 11), undefined);
});
test("display rounding cannot make a reference level reached", () => {
  const data = ready(
    make({ times: [0, 10], probabilities: [0, 0.0499999] }),
    0.0499999,
  );
  assert.equal(referenceMarker(data.annual, 0.05), undefined);
  assert.equal(band(0.0499999), "Low");
});
test("months and explicitly defined day units preserve annual evaluations", () => {
  for (const [timeUnit, factor, extra] of [
    ["months", 12, {}],
    ["days", 365.25, { daysPerYear: 365.25 }],
  ]) {
    const base = make();
    const data = ready({
      ...base,
      timeUnit,
      times: base.times.map((t) => t * factor),
      supportedUntil: 10 * factor,
      ...extra,
    });
    assert.equal(referenceMarker(data.annual, 0.05).year, 7);
  }
  assert.equal(
    validateCif(make({ timeUnit: "days" }), context, 1, 0.081).reason,
    "units",
  );
});
test("invalid values, ordering, decreases, units and horizon are rejected safely", () => {
  for (const override of [
    { probabilities: [0, NaN, 0.033, 0.043, 0.05, 0.062, 0.081] },
    { probabilities: [0, Infinity, 0.033, 0.043, 0.05, 0.062, 0.081] },
    { probabilities: [0, -0.01, 0.033, 0.043, 0.05, 0.062, 0.081] },
    { probabilities: [0, 0.01, 0.033, 0.043, 0.05, 0.062, 1.1] },
    { probabilities: [] },
    { times: [] },
    { times: [0, 1, 5, 4, 7, 8, 10] },
    { times: [0, 1, 5, 5, 7, 8, 10] },
    { times: [0, 1, 5, 6, 7, 8, Infinity] },
    { probabilities: [0, 0.01, 0.009, 0.043, 0.05, 0.062, 0.081] },
    { probabilityUnit: "percent" },
    { timeUnit: "weeks" },
    { supportedUntil: 9 },
    { times: [0, 1, 5, 6, 7, 8, 9] },
  ])
    assert.equal(
      validateCif(make(override), context, 1, 0.081).status,
      "unavailable",
    );
  for (const raw of [undefined, null, {}, [], { times: "bad" }, "bad"])
    assert.equal(validateCif(raw, context, 1, 0.081).status, "unavailable");
});
test("patient/model/outcome/event identities cannot be mixed or guessed", () => {
  for (const override of [
    { patientId: 2 },
    { modelVersion: "different" },
    { outcomeId: "FRAMINGHAM" },
    { eventCode: "NON-CVD-DEATH" },
  ])
    assert.equal(
      validateCif(make(override), context, 1, 0.081).status,
      "unavailable",
    );
  assert.equal(validateCif(make(), undefined, 1, 0.081).status, "unavailable");
  assert.equal(
    validateCif(
      make(),
      { ...context, outcome: { ...context.outcome, kind: "other" } },
      1,
      0.081,
    ).status,
    "unavailable",
  );
  assert.equal(
    validateCif(make(), context, 1, 0.081, "different-history-model").status,
    "unavailable",
  );
  assert.equal(
    validateCif(
      make({ modelVersion: "ILLUSTRATIVE-0.2" }),
      { ...context, modelVersion: "ILLUSTRATIVE-0.2" },
      1,
      0.081,
    ).status,
    "unavailable",
  );
});
test("ten-year mismatches and band-changing numerical discrepancies are rejected", () => {
  assert.equal(validateCif(make(), context, 1, 0.09).reason, "risk-mismatch");
  assert.equal(
    validateCif(
      make({ times: [0, 10], probabilities: [0, 0.05] }),
      context,
      1,
      0.05 - 5e-13,
    ).reason,
    "risk-mismatch",
  );
  const data = ready();
  for (const ref of [0.05, 0.1, 0.2]) {
    referenceMarker(data.annual, ref);
    assert.equal(band(0.081), "Moderate");
  }
});
test("unsupported starting times are not filled with invented annual points", () => {
  const data = ready(
    make({ times: [1.5, 7, 10], probabilities: [0.01, 0.05, 0.081] }),
  );
  assert.equal(data.annual[0].year, 2);
  assert.equal(data.points[0].year, 1.5);
});
test("snapshots copy compatible original CIF and retain model provenance", () => {
  const result = {
    pid: 1,
    ageAtAssessment: 58,
    inputs: { bmi: "25" },
    risk: 0.081,
    bmi: 25,
    parts: [],
    band: "Moderate",
    saved: false,
    predictionContext: structuredClone(context),
    cif: make(),
  };
  const snapshot = createSnapshot(result, 4, 2);
  assert.equal(snapshot.model, context.modelVersion);
  result.cif.probabilities[0] = 0.9;
  result.cif.times[0] = 9;
  result.predictionContext.outcome.id = "mutated";
  assert.equal(snapshot.cif.probabilities[0], 0);
  assert.equal(snapshot.cif.times[0], 0);
  assert.equal(snapshot.predictionContext.outcome.id, context.outcome.id);
  const old = createSnapshot(
    { ...result, predictionContext: undefined, cif: undefined },
    5,
    2,
  );
  assert.equal(old.cif, undefined);
  assert.equal(old.model, "ILLUSTRATIVE-0.2");
  const invalid = createSnapshot(
    { ...result, cif: { ...make(), times: undefined } },
    6,
    2,
  );
  assert.equal(invalid.cif, undefined);
  assert.equal(invalid.model, context.modelVersion);
});
