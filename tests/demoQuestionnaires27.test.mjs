import test from "node:test";
import assert from "node:assert/strict";
import { patients, users } from "../src/state/store.ts";
import { intakes27, fictionalDemoAnswers } from "../src/state/intakes27.ts";
import { derive27 } from "../src/services/assessment27.ts";
import { measurementBmi } from "../src/services/illustrativeQuestionnaire.ts";
import { seededIntake } from "../src/state/seededIntakes.ts";

test("fictional complete questionnaire seeds cover Patients 1-10 and preserve Patient 11 for manual entry", () => {
  assert.equal(patients.length, 11);
  assert.deepEqual(intakes27.map((record) => record.patientId), [1,2,3,4,5,6,7,8,9,10]);
  assert.ok(intakes27.every((record) => record.demonstration));
  assert.ok(intakes27.every((record) => record.incomplete.length === 0));
  assert.ok(intakes27.every((record) => record.issues.length === 0));
  assert.ok(intakes27.every((record) => !("risk" in record)));
  assert.equal(intakes27.some((record) => record.patientId === 11), false);
  for (const patient of patients.slice(0, 10)) {
    const derived = derive27(fictionalDemoAnswers(patient), patient);
    assert.equal(derived.issues.length, 0, patient.record);
    assert.equal(derived.incomplete.length, 0, patient.record);
  }
  assert.equal(users[0].active, true);
});

test("seeded questionnaires vary lifestyle and clinical-response paths", () => {
  const answers = intakes27.map((record) => record.rawResponses);
  assert.ok(new Set(answers.map((response) => response.alcoholHistory)).size >= 3);
  assert.ok(new Set(answers.map((response) => response.smokeEver)).size >= 2);
  assert.ok(new Set(answers.map((response) => response.hypertension)).size >= 2);
  assert.ok(new Set(answers.map((response) => response.ffq_raisins)).size >= 3);
  assert.notEqual(answers[0].sbp1, answers[9].sbp1);
});

test('height and weight prefill uses existing fictional measurements with ten distinct BMIs', () => {
  const bmis = intakes27.map(record => {
    const original = seededIntake(record.patientId);
    assert.equal(record.rawResponses.illustrativeHeight, original.height);
    assert.equal(record.rawResponses.illustrativeWeight, original.weight);
    const bmi = measurementBmi(record.rawResponses);
    assert.ok(bmi !== null && bmi >= 12 && bmi <= 65);
    return bmi;
  });
  assert.equal(new Set(bmis).size, 10);
  assert.deepEqual(fictionalDemoAnswers(patients.find(p => p.id === 11)), {});
});
