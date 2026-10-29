import test from "node:test";
import assert from "node:assert/strict";
import { selectionError } from "../src/utils/assessmentValidation.ts";
test("required answers and uncertain medication responses receive specific inline errors", () => {
  assert.match(selectionError("pid", "", true), /Choose a patient/);
  for (const answer of ["", "Unknown"])
    assert.match(
      selectionError("bpMeds", answer, true),
      /hypertension-medication/i,
    );
  assert.equal(selectionError("bpMeds", "No", true), "");
  assert.equal(selectionError("bpMeds", "Yes", true), "");
  assert.equal(selectionError("bpMeds", "Past", true), "");
  assert.equal(selectionError("education", "", false), "");
  assert.equal(selectionError("prior", "Yes", true), "");
  for (const field of ["bpMeds", "currentSmoking"]) {
    assert.match(selectionError(field, "", true), /Choose an answer/);
    assert.match(selectionError(field, "Unknown", true), /not confirmed.*Verify/);
    assert.doesNotMatch(selectionError(field, "Unknown", true), /Choose Yes or No/);
  }
});
