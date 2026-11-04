import test from 'node:test';
import assert from 'node:assert/strict';
import { patients } from '../src/state/store.ts';
import { intakes27 } from '../src/state/intakes27.ts';
import { illustrativeQuestionnaire, measurementBmi } from '../src/services/illustrativeQuestionnaire.ts';
import { simulate } from '../src/services/prediction.ts';
import { screeningSignature } from '../src/services/preAssessment.ts';
import { SCREENING_KEYS } from '../src/services/preAssessmentRules.mjs';
import { createSnapshot } from '../src/services/snapshots.ts';
import { QUESTIONS27, isApplicable27 } from '../src/services/assessment27.ts';

const patient = patients[0];
const checks = Object.fromEntries(SCREENING_KEYS.map(k => [k, 'No']));
const screening = { pid: patient.id, answers: checks, confirmed: screeningSignature(patient, checks) };
const answers = { ...intakes27[0].rawResponses, illustrativeHeight: '170', illustrativeWeight: '83.81' };
test('every required applicable questionnaire answer blocks calculation when omitted', () => {
  for (const question of QUESTIONS27.filter(q => !q.optional && isApplicable27(q, answers))) {
    assert.throws(() => illustrativeQuestionnaire({ ...answers, [question.id]: '' }, patient, screening), undefined, question.id);
  }
  const optionalBlank = { ...answers };
  for (const question of QUESTIONS27.filter(q => q.optional)) optionalBlank[question.id] = '';
  assert.doesNotThrow(() => illustrativeQuestionnaire(optionalBlank, patient, screening));
});
test('questionnaire projection preserves the original formula and saved illustrative model identity', () => {
  const result = illustrativeQuestionnaire(answers, patient, screening);
  assert.equal(result.risk, simulate(result.inputs, patient).risk);
  assert.equal(result.inputs.bpMeds, 'Yes');
  assert.equal(result.inputs.currentSmoking, 'Yes');
  assert.equal(result.inputs.alcoholDrinks, '2.0');
  assert.equal(result.inputs.sbp, '164');
  assert.equal(result.inputs.bmi, '29');
  assert.equal(createSnapshot(result, 999, 1).model, 'ILLUSTRATIVE-0.2');
  assert.equal(result.cif, undefined);
});
test('projection rejects missing BMI, unknown core inputs and missing eligibility', () => {
  for (const illustrativeHeight of ['', 'NaN', '0', '221']) assert.throws(() => illustrativeQuestionnaire({ ...answers, illustrativeHeight }, patient, screening), /height and weight/);
  assert.throws(() => illustrativeQuestionnaire(answers, patient, null), /eligibility/);
  assert.throws(() => illustrativeQuestionnaire({ ...answers, bpMed: '9 = unk' }, patient, screening), /medication/);
});

test('BMI derives from measurements and ignores stale manually entered BMI', () => {
  assert.equal(measurementBmi({ ...answers, illustrativeBmi: '40' }), 29);
  for (const illustrativeWeight of ['', 'NaN', '0', '251']) assert.equal(measurementBmi({ ...answers, illustrativeWeight }), null);
  assert.equal(measurementBmi({ illustrativeHeight: '220', illustrativeWeight: '25' }), null);
  assert.equal(measurementBmi({ illustrativeHeight: '175', illustrativeWeight: '70' }), 22.9);
});
