import test from "node:test";
import assert from "node:assert/strict";
import { patients } from "../src/state/store.ts";
import { researchInputsFor, verifyResearchCif, isFictionalIntakePatient } from "../src/services/researchCig.ts";
import { seededIntake } from "../src/state/seededIntakes.ts";

const make = (patient, overrides = {}) => ({
  ageAtAssessment: 58,
  inputs: { ...seededIntake(patient.id), ...overrides },
});
const response = (risk = 0.15) => ({
  schemaVersion: "research-7p-cif-v1",
  modelVersion: "FRAMINGHAM-7P-RSF-RESEARCH-20261015",
  source: "local-readonly-randomForestSRC",
  endpoint: "Framingham-recorded CVD; not final PURE major-CVD composite",
  competing: "Death before recorded CVD; cause of death not verified",
  numberOfTrees: 500,
  risk10: risk,
  cif: {
    times: [26, 365.25, 730.5, 1095.75, 1461, 1826.25, 2191.5, 2556.75, 2922, 3287.25, 3652.5],
    probabilities: [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.07, 0.09, 0.1, 0.13, risk],
    probabilityUnit: "fraction", timeUnit: "days", daysPerYear: 365.25, supportedUntil: 3652.5,
  },
});

test("only known fictitious seeded identities use observed seven predictors", () => {
  assert.equal(patients.length >= 3, true);
  for (let i=0; i<3; i++) assert.equal(isFictionalIntakePatient(patients[i]), true);
  const input = researchInputsFor(patients[0], make(patients[0]));
  assert.deepEqual(Object.keys(input).sort(), [
    "age_years", "sex_male", "sbp_mmhg", "dbp_mmhg",
    "bmi_kg_m2", "current_smoker", "bp_medication",
  ].sort());
  assert.equal(input.sbp_mmhg,156);
  assert.equal(input.dbp_mmhg,94);
  assert.equal(input.bmi_kg_m2,29.1);
  assert.equal(input.sex_male,1);
  assert.equal(input.current_smoker,1);
  assert.equal(input.bp_medication,1);
  assert.equal(input.age_years,58);
  assert.equal(researchInputsFor(patients[1],{ ...make(patients[1]), ageAtAssessment:51 }).sex_male,0);
  assert.equal(researchInputsFor(patients[0], make(patients[0], { sbp:"142" })).sbp_mmhg,142);
});

test("reject unknown or modified patient identity and incomplete inputs", () => {
  assert.equal(researchInputsFor({ ...patients[0], record:"PNT-OTHER" },make(patients[0])),null);
  for (const x of [
    { prior:"Yes" }, { verified:"Unknown" }, { sbp:"" }, { bmi:"" },
    { currentSmoking:"Unknown" }, { bpMeds:"Unknown" }, { sbp:"85",dbp:"90" },
    { sbp:"NaN" }, { bmi:"999" },
  ]) assert.equal(researchInputsFor(patients[0],make(patients[0],x)),null);
  assert.equal(researchInputsFor(patients[0],{ ...make(patients[0]),ageAtAssessment:72 }),null);
});

test("a separately supplied model CIF is checked at every point", () => {
  const output = verifyResearchCif(response());
  assert.ok(output);
  assert.equal(output.risk,0.15);
  assert.equal(output.annual.length,10);
  assert.equal(output.annual[9].probability,0.15);
  assert.equal(output.points.at(-1).year,10);
  assert.equal(output.annual[4].probability,0.05);
});

test("reject identity, endpoint, time, decreasing CIF, mismatch, or missing years", () => {
  const cases = [];
  { const x=response();x.modelVersion="ILLUSTRATIVE-0.2";cases.push(x); }
  { const x=response();x.endpoint="first major CVD incl HF";cases.push(x); }
  { const x=response();x.risk10=0.8;cases.push(x); }
  { const x=response();x.cif.times[10]=3646;cases.push(x); }
  { const x=response();x.cif.probabilities[5]=-0.1;cases.push(x); }
  { const x=response();x.cif.probabilities[7]=0.001;cases.push(x); }
  { const x=response();x.cif.supportedUntil=3500;cases.push(x); }
  { const x=response();x.cif.timeUnit="months";cases.push(x); }
  { const x=response();x.cif.probabilities[9]=NaN;cases.push(x); }
  for (const c of cases) assert.equal(verifyResearchCif(c),null);
});
