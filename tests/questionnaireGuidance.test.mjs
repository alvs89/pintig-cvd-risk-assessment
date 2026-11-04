import test from 'node:test';
import assert from 'node:assert/strict';
import { patients } from '../src/state/store.ts';
import { intakes27 } from '../src/state/intakes27.ts';
import { questionnaireGuidance } from '../src/services/illustrativeQuestionnaire.ts';

test('latest BP values replace cards, supporting values and priority without mutating earlier guidance', () => {
  const a = { ...intakes27[1].rawResponses };
  const before = questionnaireGuidance(a, patients[1]);
  assert.equal(before.find(r => r.id === 'BP-REVIEW').priority, 'priority');
  assert.match(before.find(r => r.id === 'BP-REVIEW').trigger, /142\/86/);
  a.sbp1 = a.sbp2 = '132'; a.dbp1 = a.dbp2 = '78';
  const monitor = questionnaireGuidance(a, patients[1]);
  assert.equal(monitor.some(r => r.id === 'BP-REVIEW'), false);
  assert.equal(monitor.find(r => r.id === 'BP-MONITOR').priority, 'standard');
  assert.match(monitor.find(r => r.id === 'BP-MONITOR').trigger, /132\/78/);
  a.sbp1 = a.sbp2 = '120';
  assert.equal(questionnaireGuidance(a, patients[1]).some(r => r.id.startsWith('BP-')), false);
  a.sbp1 = a.sbp2 = '185';
  assert.equal(questionnaireGuidance(a, patients[1]).find(r => r.id === 'BP-URGENT').priority, 'priority');
  assert.match(before.find(r => r.id === 'BP-REVIEW').trigger, /142\/86/);
});

test('removed smoking, medication, alcohol and weight triggers disappear; unknowns do not invent advice', () => {
  const a = { ...intakes27[0].rawResponses };
  const initial = questionnaireGuidance(a, patients[0]);
  for (const id of ['TOBACCO', 'MED-REVIEW', 'BMI', 'ALCOHOL']) assert.ok(initial.some(r => r.id === id));
  Object.assign(a, { smokeEver: '0 = No', bpMed: '0 = no', alcoholHistory: 'Never used alcohol products', illustrativeHeight: '170', illustrativeWeight: '65' });
  const updated = questionnaireGuidance(a, patients[0]);
  for (const id of ['TOBACCO', 'MED-REVIEW', 'BMI', 'ALCOHOL']) assert.equal(updated.some(r => r.id === id), false);
  assert.deepEqual(questionnaireGuidance({}, patients[0]), []);
  a.sbp1 = '999';
  assert.deepEqual(questionnaireGuidance(a, patients[0]), []);
});
