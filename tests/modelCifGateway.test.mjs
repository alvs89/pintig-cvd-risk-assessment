import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_MODEL_RELEASE,
  acceptModelCifResponse,
} from "../src/services/modelCifGateway.ts";

const manifest = Object.freeze({
  releaseId: "RESEARCH-MOCK-RELEASE-1",
  modelVersion: "FUTURE-MOCK-RSF-V1",
  cohortId: "MOCK-TRAINING-COHORT",
  outcome: {
    id: "MOCK-COMPOSITE-1",
    label: "Mock first major CVD endpoint",
    definition: "Fictional four-component endpoint used only in isolated contract tests",
    kind: "first-major-cvd",
    eventCode: "1",
    competingEventCode: "2",
  },
  timeUnit: "years",
});
const makeResponse = () => ({
  schemaVersion: "pintig-model-cif-v1",
  patientId: 71,
  modelSource: "competing-risk-rsf",
  releaseId: manifest.releaseId,
  modelVersion: manifest.modelVersion,
  cohortId: manifest.cohortId,
  outcomeId: manifest.outcome.id,
  eventCode: "1",
  competingEventCode: "2",
  risk10: 0.1,
  cif: {
    probabilityUnit: "fraction",
    timeUnit: "years",
    supportedUntil: 10,
    times: Array.from({ length: 11 }, (_, i) => i),
    probabilities: Array.from({ length: 11 }, (_, i) => i * 0.01),
  },
});
const expectUnavailable = (data, m = manifest) => {
  const accepted = acceptModelCifResponse(data, 71, m);
  assert.equal(accepted.status, "unavailable");
  return accepted.reason;
};

test("live model integration is disabled until a trusted release is configured", () => {
  assert.equal(ACTIVE_MODEL_RELEASE, null);
  assert.equal(
    acceptModelCifResponse(makeResponse(), 71).reason,
    "not-authorized",
  );
});

test("hypothetical verified response maps to exact frontend CIG contract without inference", () => {
  const response = makeResponse();
  const result = acceptModelCifResponse(response, 71, manifest);
  assert.equal(result.status, "ready");
  const { prediction } = result;
  assert.equal(prediction.risk, 0.1);
  assert.equal(prediction.predictionContext.outcome.id, manifest.outcome.id);
  assert.equal(prediction.cif.probabilities.length, 11);
  assert.equal(prediction.cif.patientId, 71);
  assert.equal(prediction.cif.modelVersion, manifest.modelVersion);
  assert.equal(prediction.cif.supportedUntil, 10);
  response.cif.probabilities[10] = 0.25;
  assert.equal(prediction.cif.probabilities[10], 0.1);
  assert.equal(prediction.predictionContext.outcome.kind, "first-major-cvd");
});

test("identity and pinned release must match the expected assessment patient", () => {
  const altered = makeResponse();
  altered.patientId = 72;
  assert.equal(expectUnavailable(altered), "invalid-identity");
  assert.equal(
    acceptModelCifResponse(makeResponse(), 72, manifest).reason,
    "invalid-identity",
  );
  const mismatched = makeResponse();
  mismatched.modelVersion = "ANOTHER-MODEL-V2";
  assert.equal(expectUnavailable(mismatched), "invalid-release");
  mismatched.modelVersion = manifest.modelVersion;
  mismatched.releaseId = "RELEASE-B";
  assert.equal(expectUnavailable(mismatched), "invalid-release");
  mismatched.releaseId = manifest.releaseId;
  mismatched.cohortId = "FRAMINGHAM";
  assert.equal(expectUnavailable(mismatched), "invalid-release");
  assert.equal(
    expectUnavailable(makeResponse(), { ...manifest, modelVersion: "PROVISIONAL-RSF-500" }),
    "invalid-release",
  );
});

test("event and competing-event codes require an exact pinned outcome match", () => {
  const altered = makeResponse();
  altered.eventCode = "2";
  assert.equal(expectUnavailable(altered), "invalid-outcome");
  altered.eventCode = "1";
  altered.outcomeId = "OTHER-OUTCOME";
  assert.equal(expectUnavailable(altered), "invalid-outcome");
  altered.outcomeId = manifest.outcome.id;
  altered.competingEventCode = "4";
  assert.equal(expectUnavailable(altered), "invalid-outcome");
  assert.equal(
    expectUnavailable(
      makeResponse(),
      { ...manifest, outcome: { ...manifest.outcome, eventCode: "1", competingEventCode: "1" } },
    ),
    "invalid-release",
  );
});

test("invalid risks and model curves are rejected rather than filled or smoothed", () => {
  for (const risk of [NaN, -0.1, 1.1, Infinity]) {
    const broken = makeResponse();
    broken.risk10 = risk;
    assert.equal(expectUnavailable(broken), "invalid-values");
  }
  const wrongHorizon = makeResponse();
  wrongHorizon.cif.supportedUntil = 9;
  assert.equal(expectUnavailable(wrongHorizon), "incompatible-cif");
  const shortGrid = makeResponse();
  shortGrid.cif.times[10] = 9.9;
  assert.equal(expectUnavailable(shortGrid), "incompatible-cif");
  const wrongRisk = makeResponse();
  wrongRisk.risk10 = 0.1000000001;
  assert.equal(expectUnavailable(wrongRisk), "incompatible-cif");
  const descending = makeResponse();
  descending.cif.probabilities[4] = 0.005;
  assert.equal(expectUnavailable(descending), "incompatible-cif");
  const wrongUnit = makeResponse();
  wrongUnit.cif.probabilityUnit = "percent";
  assert.equal(expectUnavailable(wrongUnit), "invalid-values");
});

test("R event grid ending at day 3646 is rejected as unsupported by normal CIG contract", () => {
  const daysManifest = { ...manifest, timeUnit: "days", daysPerYear: 365.25 };
  const response = makeResponse();
  response.cif.timeUnit = "days";
  response.cif.daysPerYear = 365.25;
  response.cif.supportedUntil = 3652.5;
  response.cif.times = Array.from({ length: 11 }, (_, i) => i * 365.25);
  assert.equal(acceptModelCifResponse(response, 71, daysManifest).status, "ready");

  response.cif.times[10] = 3646;
  assert.equal(expectUnavailable(response, daysManifest), "incompatible-cif");
  // A future approved backend must supply a defensible explicit 3652.5-day
  // point; this frontend bridge must never patch or extend a model time grid.
});
