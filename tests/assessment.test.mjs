import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { age } from "../src/utils/format.ts";
import { band } from "../src/utils/risk.ts";
import { phoneDigits } from "../src/utils/phone.ts";
import { deriveInputs } from "../src/services/intake.ts";
import { simulate, illustrativePredictor } from "../src/services/prediction.ts";
import {
  generateGuidance,
  GUIDANCE_VERSION,
} from "../src/services/guidance.ts";
import { createSnapshot } from "../src/services/snapshots.ts";
import {
  S,
  patients,
  users,
  getSnapshot,
  subscribe,
  render,
} from "../src/state/store.ts";
import { allowedPages, canReveal } from "../src/state/permissions.ts";

const source = fs.readFileSync(
  new URL("../legacy/extracted-v27.js", import.meta.url),
  "utf8",
);
const ast = ts.createSourceFile("v27.js", source, ts.ScriptTarget.Latest, true);
const functions = new Map();
function visit(node) {
  if (ts.isFunctionDeclaration(node))
    functions.set(node.name.text, node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const originalPrediction = new Function(
  "age",
  functions.get("simulate") + "; return simulate;",
)(age);
const originalGuidance = new Function(
  functions.get("generateGuidance") + "; return generateGuidance;",
)();
const inputs = {
  bmi: "25.3",
  sbp: "132",
  dbp: "82",
  height: "168",
  weight: "71.4",
  currentSmoking: "No",
  bpMeds: "No",
  mode: "extended",
  activityMinutes: "180",
  alcoholDrinks: "2.0",
  family: "No",
  education: "Secondary",
  saltFrequency: "Sometimes",
  processedFood: "Sometimes",
  fruitVeg: "3",
};

test("unrounded probabilities use the approved four boundaries", () => {
  for (const [risk, expected] of [
    [0, "Low"],
    [0.0499999, "Low"],
    [0.05, "Moderate"],
    [0.0999999, "Moderate"],
    [0.1, "High"],
    [0.1999999, "High"],
    [0.2, "Very High"],
    [1, "Very High"],
  ])
    assert.equal(band(risk), expected);
});
test("illustrative predictions and factor contributions match v27 exactly", () => {
  for (const patient of patients)
    for (const variant of [
      {},
      { mode: "observed" },
      {
        sbp: "260",
        currentSmoking: "Yes",
        bpMeds: "Yes",
        activityMinutes: "0",
        alcoholDrinks: "30",
        family: "Yes",
        education: "Primary",
      },
      { sbp: "70", bmi: "12", activityMinutes: "300" },
    ]) {
      const x = { ...inputs, ...variant };
      assert.deepEqual(simulate(x, patient), originalPrediction(x, patient));
    }
  assert.equal(illustrativePredictor.status, "illustrative");
  assert.equal(illustrativePredictor.version, "ILLUSTRATIVE-0.2");
});
test("educational guidance matches v27 independently of risk calculation", () => {
  for (const variant of [
    {},
    { sbp: "180", dbp: "120", currentSmoking: "Yes", bpMeds: "Yes" },
    {
      sbp: "145",
      dbp: "95",
      bmi: "30",
      activityMinutes: "0",
      saltFrequency: "Often",
      fruitVeg: "1",
      family: "Yes",
    },
    { mode: "observed", sbp: "110", dbp: "70", bmi: "20" },
  ]) {
    const x = { ...inputs, ...variant };
    assert.deepEqual(
      generateGuidance(x, patients[0]),
      originalGuidance(x, patients[0]),
    );
  }
  assert.equal(GUIDANCE_VERSION, "GUIDE-RULES-1.0");
});
test("saved snapshots preserve continuous risk and copy versioned inputs and rules", () => {
  const prediction = simulate(inputs, patients[0]);
  const result = {
    ...prediction,
    pid: 1,
    ageAtAssessment: age(patients[0].dob),
    inputs: { ...inputs },
    band: band(prediction.risk),
    saved: false,
    guidanceRules: generateGuidance(inputs, patients[0]),
  };
  const snapshot = createSnapshot(result, 3, 2);
  result.inputs.sbp = "200";
  result.guidanceRules[0].title = "Changed draft";
  assert.equal(snapshot.inputs.sbp, "132");
  assert.notEqual(snapshot.guidanceRules[0].title, "Changed draft");
  assert.equal(snapshot.risk, prediction.risk);
  assert.equal(snapshot.band, band(prediction.risk));
  assert.equal(snapshot.model, "ILLUSTRATIVE-0.2");
  assert.equal(snapshot.guidanceVersion, GUIDANCE_VERSION);
  assert.equal(snapshot.riskBandVersion, "PINTIG-BANDS-1.0");
  assert.equal(snapshot.explanationVersion, "ILLUSTRATIVE-FACTORS-1.0");
});
test("derivations retain BMI precision, alcohol and rounded activity totals", () => {
  const x = deriveInputs({
    ...inputs,
    alcoholUse: "Yes",
    alcoholDays: "2",
    drinksPerDay: "1.5",
    activityDays: "3",
    activityPerDay: "60",
  });
  assert.equal(x.bmi, "25.3");
  assert.equal(x.alcoholDrinks, "3.0");
  assert.equal(x.activityMinutes, "180");
  assert.equal(deriveInputs({ ...x, alcoholUse: "No" }).alcoholDrinks, "0.0");
  assert.equal(
    deriveInputs({ ...x, height: "", weight: "", bmi: "26" }).bmi,
    "26",
  );
  assert.equal(deriveInputs({ ...x, activityPerDay: "" }).activityMinutes, "");
  assert.equal(deriveInputs({ ...x, height: "" }, x).bmi, "");
  assert.equal(inputs.bmi, "25.3");
});
test("age uses birth date boundaries and phone formats remain compatible", () => {
  assert.equal(age("1991-10-15", new Date("2026-10-14T12:00:00")), 34);
  assert.equal(age("1991-10-14", new Date("2026-10-14T12:00:00")), 35);
  for (const text of ["+63 917 000 0001", "09170000001", "9170000001"])
    assert.equal(phoneDigits(text), "9170000001");
});
test("role navigation, identity controls and React subscription are session based", () => {
  assert.ok(allowedPages("admin").includes("Reports"));
  assert.ok(!allowedPages("worker").includes("User Accounts"));
  assert.equal(canReveal(patients[0]), false);
  S.user = users[1];
  assert.equal(canReveal(patients[0]), true);
  S.user = null;
  let count = 0;
  const before = getSnapshot();
  const unsubscribe = subscribe(() => count++);
  render();
  unsubscribe();
  render();
  assert.equal(count, 1);
  assert.equal(getSnapshot(), before + 2);
});
