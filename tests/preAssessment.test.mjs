import test from "node:test";
import assert from "node:assert/strict";
import {
  WARNING_SIGNS,
  EVENT_HISTORY,
  SCREENING_KEYS,
  SCREENING_VERSION,
  screeningDecision,
  validScreeningAttestation,
} from "../src/services/preAssessmentRules.mjs";
import {
  screeningForPatient,
  screeningSignature,
} from "../src/services/preAssessment.ts";
import { patients, records } from "../src/state/store.ts";
import { createSnapshot } from "../src/services/snapshots.ts";
import { simulate } from "../src/services/prediction.ts";
import { seededIntake } from "../src/state/seededIntakes.ts";
import { age } from "../src/utils/format.ts";
import { band } from "../src/utils/risk.ts";
const eligible = () =>
  Object.fromEntries(
    SCREENING_KEYS.map((key) => [key, key === "verified" ? "Yes" : "No"]),
  );
test("shared policy blocks every acute warning, every prior condition and unknown or missing answer", () => {
  assert.equal(WARNING_SIGNS.length, 13);
  assert.equal(EVENT_HISTORY.length, 4);
  for (const years of [35, 70])
    assert.equal(screeningDecision(eligible(), years).status, "eligible");
  for (const years of [34, 71, NaN, Infinity, 35.5])
    assert.equal(screeningDecision(eligible(), years).status, "age");
  for (const [key] of WARNING_SIGNS)
    assert.equal(
      screeningDecision({ ...eligible(), [key]: "Yes" }, 50).status,
      "warning",
    );
  for (const [key] of EVENT_HISTORY)
    assert.equal(
      screeningDecision({ ...eligible(), [key]: "Yes" }, 50).status,
      "history",
    );
  assert.equal(
    screeningDecision({ ...eligible(), chestPain: "Yes", stroke: "Yes" }, 80)
      .status,
    "warning",
  );
  assert.equal(
    screeningDecision({ ...eligible(), stroke: "Yes", heartFailure: "Yes" }, 50)
      .status,
    "history",
  );
  for (const key of SCREENING_KEYS) {
    assert.notEqual(
      screeningDecision({ ...eligible(), [key]: "" }, 50).status,
      "eligible",
    );
    assert.equal(
      screeningDecision({ ...eligible(), [key]: "Unknown" }, 50).status,
      "uncertain",
    );
    assert.notEqual(
      screeningDecision({ ...eligible(), [key]: "garbage" }, 50).status,
      "eligible",
    );
  }
  assert.equal(
    screeningDecision({ ...eligible(), verified: "No" }, 50).status,
    "unverified",
  );
  assert.equal(
    validScreeningAttestation(
      { version: SCREENING_VERSION, answers: eligible() },
      50,
    ),
    true,
  );
  for (const check of [
    null,
    {},
    { version: "old", answers: eligible() },
    { version: SCREENING_VERSION, answers: {} },
  ])
    assert.equal(validScreeningAttestation(check, 50), false);
});
test("continuation is bound to patient, answers and profile; old records are not backfilled", () => {
  const patient = patients[0],
    answers = eligible();
  const check = {
    pid: patient.id,
    answers,
    confirmed: screeningSignature(patient, answers),
  };
  assert.ok(screeningForPatient(check, patient));
  assert.equal(
    screeningForPatient({ ...check, confirmed: null }, patient),
    null,
  );
  assert.equal(screeningForPatient(check, patients[1]), null);
  assert.equal(
    screeningForPatient(
      { ...check, answers: { ...answers, chestPain: "Yes" } },
      patient,
    ),
    null,
  );
  assert.equal(records.length, 10);
  assert.ok(records.every((r) => !r.inputs.chestPain && !r.inputs.stroke));
  assert.ok(records.every((r) => r.preAssessmentVersion === undefined));
  const patientInputs = seededIntake(patient.id),
    prediction = simulate(patientInputs, patient);
  const snapshot = createSnapshot(
    {
      ...prediction,
      pid: patient.id,
      inputs: patientInputs,
      ageAtAssessment: age(patient.dob),
      band: band(prediction.risk),
      saved: false,
      preAssessmentVersion: SCREENING_VERSION,
    },
    11,
    2,
  );
  assert.equal(snapshot.preAssessmentVersion, SCREENING_VERSION);
  assert.equal(snapshot.inputs.chestPain, undefined);
});
