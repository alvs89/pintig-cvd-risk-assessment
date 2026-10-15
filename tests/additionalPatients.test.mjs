import test from "node:test";
import assert from "node:assert/strict";
import { createAdditionalPopulation } from "../src/state/additionalPatients.ts";
import { patients, records, users, render } from "../src/state/store.ts";
import { seededIntake } from "../src/state/seededIntakes.ts";
import { deriveInputs } from "../src/services/intake.ts";
import { simulate } from "../src/services/prediction.ts";
import { generateGuidance } from "../src/services/guidance.ts";
import { explainCalculation } from "../src/services/explanation.ts";
import { createSnapshot } from "../src/services/snapshots.ts";
import { riskDistribution } from "../src/services/riskDistribution.ts";
import { isFictionalIntakePatient } from "../src/services/researchCig.ts";
import { age } from "../src/utils/format.ts";
import { band } from "../src/utils/risk.ts";

test("eight complete fictional cases use actual calculator outputs and all four categories", () => {
  const added = createAdditionalPopulation();
  assert.equal(added.patients.length, 8);
  assert.equal(added.records.length, 8);
  assert.deepEqual(
    riskDistribution(added.records).categories.map((c) => c.count),
    [2, 2, 2, 2],
  );
  for (const p of added.patients) {
    const r = added.records.find((r) => r.pid === p.id);
    const x = seededIntake(p.id);
    assert.ok(users.some((u) => u.id === r.uid));
    assert.equal(p.phone, "");
    assert.equal(p.pin, "");
    assert.equal(isFictionalIntakePatient(p), true);
    assert.ok(age(p.dob, new Date(r.date + "T12:00:00")) >= 35);
    assert.ok(+r.inputs.ageAtAssessment <= 70);
    assert.equal(x.prior, "No");
    assert.equal(x.verified, "Yes");
    assert.equal(x.mode, "extended");
    assert.ok(Object.values(x).every((v) => v !== ""));
    assert.equal(x.bmi, (+x.weight / (+x.height / 100) ** 2).toFixed(1));
    assert.equal(+x.alcoholDrinks, +x.alcoholDays * +x.drinksPerDay);
    assert.equal(+x.activityMinutes, +x.activityDays * +x.activityPerDay);
    assert.ok(+x.sbp > +x.dbp);
    if (x.alcoholUse === "No") assert.equal(+x.alcoholDrinks, 0);
    if (x.bpMeds === "Yes") assert.equal(x.pastBpMeds, "No");
    assert.deepEqual(r.inputs, { ...x, ageAtAssessment: String(age(p.dob)) });
    const calculated = simulate(r.inputs, p);
    assert.equal(r.risk, calculated.risk);
    assert.equal(r.band, band(calculated.risk));
    assert.equal(r.explanation, explainCalculation(calculated.parts));
    assert.deepEqual(r.guidanceRules, generateGuidance(x, p));
    assert.equal(r.model, "ILLUSTRATIVE-0.2");
    assert.ok(r.riskBandVersion && r.explanationVersion && r.guidanceVersion);
    assert.equal(r.cif, undefined);
    assert.equal(r.predictionContext, undefined);
    assert.equal(r.furtherAssessmentGuidance, undefined);
  }
});

test("initialization is repeatable, original records remain, and distribution includes originals", () => {
  assert.equal(patients.length, 11);
  assert.equal(records.length, 10);
  assert.equal(new Set(patients.map((p) => p.record)).size, 11);
  assert.equal(new Set(records.map((r) => r.id)).size, 10);
  assert.equal(new Set(records.map((r) => r.pid)).size, 10);
  const before = JSON.stringify(records);
  assert.deepEqual(createAdditionalPopulation(), createAdditionalPopulation());
  render();
  render();
  assert.equal(JSON.stringify(records), before);
  assert.deepEqual(
    riskDistribution(records).categories.map((c) => [c.count, c.percentage]),
    [
      [2, 20],
      [2, 20],
      [3, 30],
      [3, 30],
    ],
  );
  const p = patients.find((p) => p.id === 8),
    inputs = deriveInputs({ ...seededIntake(8), sbp: "135" });
  const prediction = simulate(inputs, p);
  const next = createSnapshot(
    {
      ...prediction,
      pid: p.id,
      inputs,
      band: band(prediction.risk),
      ageAtAssessment: age(p.dob),
      saved: false,
      guidanceRules: generateGuidance(inputs, p),
    },
    11,
    2,
  );
  assert.notEqual(next.risk, records.find((r) => r.pid === 8).risk);
  next.inputs.sbp = "140";
  assert.equal(JSON.stringify(records), before);
  assert.equal(seededIntake(8).sbp, "148");
});
