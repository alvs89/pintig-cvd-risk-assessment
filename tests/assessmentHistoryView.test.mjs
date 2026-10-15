import test from "node:test";
import assert from "node:assert/strict";
import { records } from "../src/state/store.ts";
import {
  HISTORY_QUESTION_SECTIONS,
  groupSavedQuestionnaire,
  isLimitedLegacyAssessment,
  savedEstimateSource,
} from "../src/services/assessmentHistoryView.ts";
import { seededIntake } from "../src/state/seededIntakes.ts";

test("every saved questionnaire field is displayed exactly once in source-safe groups", () => {
  const inputs = {
    ...seededIntake(1),
    ageAtAssessment: "58",
    undocumentedLegacyAnswer: "Not sure",
    sbp: "",
  };
  const groups = groupSavedQuestionnaire(inputs);
  const keys = groups.flatMap((group) => group.fields.map((x) => x.key));
  assert.equal(keys.length, Object.keys(inputs).length);
  assert.deepEqual([...keys].sort(), Object.keys(inputs).sort());
  assert.equal(groups.find((g) => g.id === "measurements").fields.find((f) => f.key === "sbp").value, "");
  assert.equal(groups.find((g) => g.id === "other").fields[0].value,"Not sure");
  assert.equal(groups[0].title,"Patient identification");
  assert.equal(groups[1].title,"Eligibility questions");
  assert.equal(groups.find((g) => g.id === "diet").title,"Diet and nutrition");
  assert.equal(HISTORY_QUESTION_SECTIONS.length,7);
  assert.equal(isLimitedLegacyAssessment(inputs),false);
  assert.equal(inputs.sbp,"");
});

test("legacy partial records are shown as-is, without invented missing answers", () => {
  for (const r of records) {
    const groups = groupSavedQuestionnaire(r.inputs);
    assert.equal(isLimitedLegacyAssessment(r.inputs),true);
    assert.equal(groups.flatMap((g) => g.fields).length,Object.keys(r.inputs).length);
    assert.equal(groups.some((g) => g.id === "eligibility"),false);
    assert.equal(groups.some((g) => g.id === "social"),false);
    assert.equal(groups.find((g) => g.id === "medical").fields.some((f) => f.key === "smoking"),true);
    assert.equal(r.cif,undefined);
  }
  assert.deepEqual(groupSavedQuestionnaire({}),[]);
});

test("illustrative record source is explicit, research RSF is not falsely attached to history", () => {
  for (const r of records) {
    const origin = savedEstimateSource(r);
    assert.equal(origin.kind,"illustrative");
    assert.equal(origin.heading,"Illustrative estimate");
    assert.equal(origin.modelVersion,r.model);
    assert.match(origin.message,/not been clinically validated/);
    assert.match(origin.message,/should not be used for clinical decisions/);
  }
  const future={...records[0],model:"FUTURE-APPROVED-COHORT-1"};
  const other=savedEstimateSource(future);
  assert.equal(other.kind,"unverified-model");
  assert.equal(other.modelVersion,future.model);
  assert.doesNotMatch(other.message,/not by a trained Random Survival Forest/);
  assert.match(other.message,/clinical validation is unverified/);
});
