import test from "node:test";
import assert from "node:assert/strict";
import { questionnaireOptionLabel } from "../src/utils/questionnaireOptionLabel.ts";
import { QUESTIONS27, isApplicable27 } from "../src/services/assessment27.ts";

test("coded answer labels are readable without altering source values", () => {
  for (const [value, label] of [["0 = no", "No"], ["1 = yes, now", "Yes, now"], ["2 = yes, not now", "Yes, not now"], ["9 = unk", "Unknown"], ["1 = Yes", "Yes"], ["1-3 per month", "1-3 per month"]]) {
    assert.equal(questionnaireOptionLabel(value), label);
  }
});

test("retired sibling count cannot hide current family questions", () => {
  const q = QUESTIONS27.find(q => q.id === "family_Stroke_Siblings");
  assert.equal(isApplicable27(q, { siblings: "0" }), true);
  assert.ok(!QUESTIONS27.some(q => q.id === "siblings"));
});
