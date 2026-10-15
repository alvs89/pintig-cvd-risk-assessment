import test from "node:test";
import assert from "node:assert/strict";
import { numericError } from "../src/utils/numericValidation.ts";
test("numeric errors preserve existing ranges and reject characters without coercion", () => {
  const rules = { min: 70, max: 260, step: 1, required: true };
  for (const value of ["70", "180", "260"])
    assert.equal(numericError(value, rules), "");
  for (const value of ["69", "261"])
    assert.equal(
      numericError(value, rules),
      "Value must be between 70 and 260.",
    );
  for (const value of ["abc", "1e2", "--2", "NaN", "Infinity", "1,2"])
    assert.match(numericError(value, rules), /valid number/);
  assert.match(numericError("", rules, true), /valid number/);
  assert.equal(numericError("", rules), "Enter a value.");
  assert.equal(numericError("", { min: 0, max: 7 }), "");
  assert.equal(numericError("1.5", { min: 0, max: 25, step: 0.5 }), "");
  assert.match(
    numericError("1.2", { min: 0, max: 7, step: 1 }),
    /increments of 1/,
  );
});
