import test from "node:test";
import assert from "node:assert/strict";
import { seededIntake } from "../src/state/seededIntakes.ts";
import { band } from "../src/utils/risk.ts";
import {
  PROTOTYPE_FOLLOWUP_VERSION,
  prototypeFollowUp,
  storedPrototypeFollowUp,
} from "../src/services/prototypeFollowUp.ts";
import { createSnapshot } from "../src/services/snapshots.ts";

const inputs = () => seededIntake(1);

test("full precision >=10% threshold and category boundaries control illustration only", () => {
  for (const risk of [0, 0.049999, 0.05, 0.099999999]) {
    const response = prototypeFollowUp(risk, band(risk), inputs());
    assert.equal(response.status, "below-threshold");
  }
  for (const [risk, category] of [
    [0.1, "High"],
    [0.100000001, "High"],
    [0.199999999, "High"],
    [0.2, "Very High"],
    [0.999, "Very High"],
    [1, "Very High"],
  ]) {
    const response = prototypeFollowUp(risk, category, inputs());
    assert.equal(response.status, "ready");
    assert.equal(response.guidance.probability, risk);
    assert.equal(response.guidance.category, category);
    assert.equal(response.guidance.ruleVersion, PROTOTYPE_FOLLOWUP_VERSION);
    assert.equal(response.guidance.actions[0].id, category === "High" ? "LEVEL-HIGH" : "LEVEL-VERY-HIGH");
  }
});

test("patient-specific findings generate practical proposed actions", () => {
  const response = prototypeFollowUp(0.172, "High", inputs());
  assert.equal(response.status, "ready");
  const rules = response.guidance.actions;
  for (const id of [
    "LEVEL-HIGH", "BP-RECHECK", "SMOKING", "DIABETES", "BP-MEDICATION",
    "BODY-MASS", "ACTIVITY", "SALT", "PRODUCE", "ALCOHOL", "FAMILY",
  ]) assert.ok(rules.some((item) => item.id === id), "Missing " + id);
  const bp = rules.find((item) => item.id === "BP-RECHECK");
  assert.match(bp.finding, /156\/94 mmHg/);
  const activity = rules.find((item) => item.id === "ACTIVITY");
  assert.match(activity.finding, /50 minutes\/week/);
  assert.ok(rules.every((r) =>
    r.title.trim().length > 10 &&
    r.finding.trim().length > 7 &&
    r.consideration.trim().length > 40));
  assert.doesNotMatch(rules.map((r) => r.consideration).join(" "), /must start medication|within \d+ days|automatic referral/i);
});

test("only recorded conditions trigger their corresponding actions", () => {
  const baseline = {
    ...seededIntake(3),
    sbp: "118", dbp: "76", bmi: "23.4",
    mode: "extended", family: "No",
  };
  const result = prototypeFollowUp(0.2, "Very High", baseline);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.guidance.actions.map((x) => x.id), ["LEVEL-VERY-HIGH"]);
  const withoutActivity = prototypeFollowUp(0.11, "High", {
    ...inputs(),
    mode: "observed",
    activityMinutes: "",
    fruitVeg: "",
    alcoholDrinks: "",
  });
  assert.equal(withoutActivity.status, "ready");
  assert.ok(withoutActivity.guidance.actions.every((item) =>
    !["ACTIVITY", "SALT", "PRODUCE", "ALCOHOL", "FAMILY"].includes(item.id)));
  const changed = prototypeFollowUp(0.11, "High", {
    ...inputs(), sbp: "124", dbp: "75", currentSmoking: "No",
  });
  assert.equal(changed.status, "ready");
  assert.ok(changed.guidance.actions.every((item) => item.id !== "BP-RECHECK" && item.id !== "SMOKING"));
});

test("invalid, mismatched, or unverified inputs refuse rule-based follow-up", () => {
  for (const risk of [null, undefined, NaN, Infinity, -0.1, 1.01, "0.15"]) {
    assert.equal(prototypeFollowUp(risk, "High", inputs()).status, "unavailable");
  }
  assert.equal(prototypeFollowUp(0.15, "Moderate", inputs()).status, "unavailable");
  assert.equal(prototypeFollowUp(0.15, "High", undefined).status, "unavailable");
  assert.equal(prototypeFollowUp(0.15, "High", { ...inputs(), verified: "No" }).status, "unavailable");
  assert.equal(prototypeFollowUp(0.15, "High", { ...inputs(), prior: "Yes" }).status, "unavailable");
  assert.equal(prototypeFollowUp(0.15, "High", inputs(), "PROVISIONAL-RSF-500").status, "unavailable");
});

test("new saved high-risk records freeze the illustrated guidance; old snapshots stay untouched", () => {
  const result = {
    pid: 1,
    risk: 0.172,
    band: "High",
    bmi: 29.1,
    ageAtAssessment: 58,
    inputs: inputs(),
    parts: [],
    saved: false,
    guidanceRules: [],
  };
  const saved = createSnapshot(result, 101, 2);
  assert.equal(saved.furtherAssessmentGuidance, undefined);
  assert.equal(saved.prototypeFollowUpGuidance?.source, "illustrative-prototype");
  assert.equal(saved.prototypeFollowUpGuidance?.actions.find((x) => x.id === "BP-RECHECK")?.finding,"Recorded BP: 156/94 mmHg");
  const displayed = storedPrototypeFollowUp(saved.prototypeFollowUpGuidance, saved.risk, saved.band, saved.model);
  assert.equal(displayed.status, "ready");
  assert.equal(displayed.guidance.actions.length, saved.prototypeFollowUpGuidance.actions.length);
  const originalText = saved.prototypeFollowUpGuidance.actions[1].consideration;
  displayed.guidance.actions[1].consideration = "changed";
  assert.equal(saved.prototypeFollowUpGuidance.actions[1].consideration, originalText);
  for (const [risk, category, model] of [
    [0.19, "High", saved.model],
    [0.172, "Very High", saved.model],
    [0.172, "High", "DIFFERENT"],
  ]) assert.equal(storedPrototypeFollowUp(saved.prototypeFollowUpGuidance,risk,category,model).status, "unavailable");
  assert.equal(storedPrototypeFollowUp(undefined,0.172,"High",saved.model).status,"unavailable");
  const below = createSnapshot({ ...result, risk: 0.083, band: "Moderate" },102,2);
  assert.equal(below.prototypeFollowUpGuidance, undefined);
});
