import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { requiredLabel } from "../src/components/shared.tsx";
import assert from "node:assert/strict";
import {
  WARNING_SIGNS,
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
  Object.fromEntries(SCREENING_KEYS.map((key) => [key, "No"]));
test("aggregate policy preserves checklist, blocks positive/unknown/missing and enforces age and exact versioned contract", () => {
  assert.equal(WARNING_SIGNS.length, 13);
  assert.deepEqual(SCREENING_KEYS, ["warningSigns", "cardiovascularHistory"]);
  for (const years of [35, 70])
    assert.equal(screeningDecision(eligible(), years).status, "eligible");
  for (const years of [34, 71, NaN, Infinity, 35.5])
    assert.equal(screeningDecision(eligible(), years).status, "age");
  assert.equal(
    screeningDecision({ warningSigns: "Yes", cardiovascularHistory: "Yes" }, 80)
      .status,
    "warning",
  );
  assert.equal(
    screeningDecision({ warningSigns: "No", cardiovascularHistory: "Yes" }, 50)
      .status,
    "history",
  );
  for (const key of SCREENING_KEYS) {
    for (const value of ["", "garbage", undefined, null])
      assert.notEqual(
        screeningDecision({ ...eligible(), [key]: value }, 50).status,
        "eligible",
      );
    assert.equal(
      screeningDecision({ ...eligible(), [key]: "Unknown" }, 50).status,
      "uncertain",
    );
  }
  const good = {
    version: SCREENING_VERSION,
    ageYears: 50,
    answers: eligible(),
  };
  assert.equal(validScreeningAttestation(good, 50), true);
  for (const check of [
    null,
    {},
    [],
    { ...good, version: "PINTIG-PREASSESSMENT-PHILPEN2022-1" },
    { ...good, ageYears: 49 },
    { ...good, ageYears: "50" },
    { ...good, answers: {} },
    { ...good, answers: { ...eligible(), chestPain: "No" } },
    { ...good, extra: true },
    ...SCREENING_KEYS.flatMap((key) =>
      ["Yes", "Unknown", ""].map((value) => ({
        ...good,
        answers: { ...eligible(), [key]: value },
      })),
    ),
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
    screeningForPatient(check, { ...patient, dob: "2010-01-01" }),
    null,
  );
  assert.equal(screeningForPatient(check, { ...patient, sex: "Female" }), null);
  assert.equal(
    screeningForPatient(
      { ...check, answers: { ...answers, warningSigns: "Yes" } },
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

test("required labels render one marker even with duplicate legacy suffixes", () => {
  for (const text of [
    "Required field",
    "Required field *",
    "Required field * *",
  ])
    assert.equal(
      (
        renderToStaticMarkup(
          React.createElement("label", null, requiredLabel(text, true)),
        ).match(/required-marker/g) ?? []
      ).length,
      1,
    );
  assert.doesNotMatch(
    renderToStaticMarkup(
      React.createElement(
        "label",
        null,
        requiredLabel("Calculated field *", false),
      ),
    ),
    /required-marker|\*/,
  );
});
