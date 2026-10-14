import test from "node:test";
import assert from "node:assert/strict";
import {
  furtherAssessment,
  storedFurtherAssessment,
  FURTHER_ASSESSMENT_VERSION,
} from "../src/services/furtherAssessment.ts";
import { band } from "../src/utils/risk.ts";
import { generateGuidance } from "../src/services/guidance.ts";
import { createSnapshot } from "../src/services/snapshots.ts";
const approval = {
  validatedModel: true,
  clinicallyReviewedRules: true,
  modelVersion: "ISOLATED-TEST-ONLY",
};
test("all unrounded boundary values use the centralized category and correct message", () => {
  const expected = [
    [0, "Low"],
    [0.049999999, "Low"],
    [0.05, "Moderate"],
    [0.050000001, "Moderate"],
    [0.099999999, "Moderate"],
    [0.1, "High"],
    [0.100000001, "High"],
    [0.199999999, "High"],
    [0.2, "Very High"],
    [0.200000001, "Very High"],
    [1, "Very High"],
  ];
  const starts = {
    Low: "Provide general",
    Moderate: "Discuss modifiable",
    High: "Recommend a comprehensive",
    "Very High": "Prioritize review",
  };
  for (const [risk, category] of expected) {
    const result = furtherAssessment(risk, category, approval);
    assert.equal(result.status, "ready");
    assert.equal(result.guidance.category, category);
    assert.equal(result.guidance.probability, risk);
    assert.ok(result.guidance.message.startsWith(starts[category]));
    assert.equal(result.guidance.ruleVersion, FURTHER_ASSESSMENT_VERSION);
    assert.doesNotMatch(
      result.guidance.message,
      /emergency|must|medication|Year \d|appointment|PhilPEN|WHO/,
    );
  }
});
test("invalid risk, inconsistent categories, failures and unapproved outputs never produce advice", () => {
  for (const risk of [
    undefined,
    null,
    "",
    ".1",
    NaN,
    Infinity,
    -Infinity,
    -0.01,
    1.01,
  ])
    assert.equal(
      furtherAssessment(risk, "Very High", approval).status,
      "unavailable",
    );
  assert.equal(furtherAssessment(0.123, "Low", approval).status, "unavailable");
  assert.equal(furtherAssessment(0.123, "High").status, "unavailable");
  assert.equal(
    furtherAssessment(0.123, "High", {
      ...approval,
      clinicallyReviewedRules: false,
    }).status,
    "unavailable",
  );
  assert.equal(
    furtherAssessment(0.123, "High", {
      ...approval,
      modelVersion: "PROVISIONAL-500",
    }).status,
    "unavailable",
  );
  assert.equal(
    furtherAssessment(0.123, "High", approval, "failed").status,
    "unavailable",
  );
  assert.equal(
    furtherAssessment(undefined, undefined, undefined, "loading").status,
    "loading",
  );
});
test("historical messages are preserved without recomputing old rule versions", () => {
  const stored = {
    ...furtherAssessment(0.123, "High", approval).guidance,
    ruleVersion: "EARLIER-RULES",
    message: "Original recorded communication.",
  };
  const result = storedFurtherAssessment(
    stored,
    0.123,
    "High",
    approval.modelVersion,
  );
  assert.equal(result.status, "ready");
  assert.equal(result.guidance.message, stored.message);
  for (const [risk, category, model] of [
    [NaN, "High", approval.modelVersion],
    [0.123, "Low", approval.modelVersion],
    [0.13, "High", approval.modelVersion],
    [0.123, "High", "DIFFERENT"],
  ])
    assert.equal(
      storedFurtherAssessment(stored, risk, category, model).status,
      "unavailable",
    );
  assert.equal(
    storedFurtherAssessment(undefined, 0.123, "High", "ILLUSTRATIVE-0.2")
      .status,
    "unavailable",
  );
});
test("educational blood-pressure rules and illustrative snapshots remain independent", () => {
  const inputs = {
    sbp: "185",
    dbp: "120",
    bmi: "24",
    currentSmoking: "Yes",
    mode: "observed",
  };
  const education = generateGuidance(inputs, {});
  assert.ok(education.some((x) => x.id === "BP-URGENT"));
  assert.ok(education.some((x) => x.id === "TOBACCO"));
  const snapshot = createSnapshot(
    {
      pid: 1,
      risk: 0.123,
      band: band(0.123),
      bmi: 24,
      ageAtAssessment: 50,
      inputs,
      parts: [],
      saved: false,
      guidanceRules: education,
    },
    99,
    1,
  );
  assert.equal(snapshot.furtherAssessmentGuidance, undefined);
  assert.deepEqual(snapshot.guidanceRules, education);
});
