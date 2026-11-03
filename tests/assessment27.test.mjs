import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  derive27,
  QUESTIONS27,
  FEATURE_NAMES27,
  INTAKE27_SCHEMA,
  isApplicable27,
  assessment27Steps,
  sanitizeNumericInput,
} from "../src/services/assessment27.ts";
import { createIntake27 } from "../src/state/intakes27.ts";
import { patients, users } from "../src/state/store.ts";
import { simulate } from "../src/services/prediction.ts";
import { researchInputsFor } from "../src/services/researchCig.ts";
import { screeningSignature } from "../src/services/preAssessment.ts";
import { SCREENING_KEYS } from "../src/services/preAssessmentRules.mjs";
import { age } from "../src/utils/format.ts";
import {
  additionalFeatures,
  EDUCATION_OPTIONS,
  FOOD_FREQUENCIES,
  FOODS,
} from "../src/services/featureProtocolV1.ts";
const p = patients[0];
const check = () => {
  const answers = Object.fromEntries(SCREENING_KEYS.map((k) => [k, "No"]));
  return { pid: p.id, answers, confirmed: screeningSignature(p, answers) };
};

test("27-key contract, unique source-linked raw items and complete13-file review", () => {
  assert.equal(FEATURE_NAMES27.length, 27);
  assert.equal(new Set(QUESTIONS27.map((q) => q.id)).size, QUESTIONS27.length);
  assert.ok(QUESTIONS27.every((q) => q.source && q.text));
  const review = JSON.parse(
    fs.readFileSync(
      new URL("../docs/assessment27/source_review.json", import.meta.url),
    ),
  );
  assert.equal(review.length, 13);
  assert.equal(new Set(review.map((r) => r.sha256)).size, 11);
});
test("questionnaire steps group sections in order without omitting or duplicating content", () => {
  const sections = [...new Set(QUESTIONS27.map((q) => q.section))];
  const steps = assessment27Steps(sections);
  assert.ok(steps.length > 1);
  assert.deepEqual(
    [...steps.flatMap((step) => step.sections)].sort(),
    [...sections].sort(),
  );
  assert.ok(
    steps.some((step) => step.title === "Physical activity and sitting"),
  );
  assert.ok(steps.some((step) => step.title === "Review and save") === false);
});
test("numeric entry accepts digits or a single decimal point and rejects other characters", () => {
  assert.equal(sanitizeNumericInput("120", true), "120");
  assert.equal(sanitizeNumericInput("12.5", false), "12.5");
  assert.equal(sanitizeNumericInput("12.5.7", false), null);
  assert.equal(sanitizeNumericInput("1e3", true), null);
  assert.equal(sanitizeNumericInput("-2", false), null);
});
test("PURE Q17 uses its original shared stem and condition rows", () => {
  const hypertension = QUESTIONS27.find((q) => q.id === "hypertension");
  const diabetes = QUESTIONS27.find((q) => q.id === "diabetes");
  assert.equal(
    hypertension.sharedPrompt,
    "Have you ever been diagnosed with any of the following? (check all that apply)",
  );
  assert.equal(diabetes.sharedPrompt, hypertension.sharedPrompt);
  assert.equal(hypertension.text, "Hypertension/high blood pressure");
  assert.equal(diabetes.text, "Diabetes");
  assert.equal(
    hypertension.source,
    "pone.0271169.s001.pdf / PURE.pdf, PDF 9, Q17, printed page 4, row b",
  );
  assert.deepEqual(hypertension.options, ["No", "Yes"]);
});
test("unknowns, refusals and unsupported scales are not fabricated", () => {
  const { features } = derive27(
    {
      bpMed: "9 = unk",
      waist1: "0",
      waist2: "0",
      smokeEver: "9 = Unknown",
      stressHome: "No response",
    },
    p,
  );
  for (const key of [
    "bp_medication",
    "waist_cm",
    "smoking_status",
    "psychosocial_stress",
    "ses_index_0_100",
    "diet_score_0_100",
    "urban_rural_residence",
    "activity_min_week",
  ])
    assert.equal(features[key], null, key);
  assert.equal(Object.keys(features).length, 27);
});
test("smoking lifetime duration subtracts cessation; current intensity remains separate", () => {
  const out = derive27(
    {
      smokeEver: "1 = Yes",
      smokeCurrent: "0 = No",
      smokeAverage: "20",
      smokeStart: "18",
      smokeStop: "40",
      smokeBreak: "1 = Yes",
      smokeBreakYears: "2",
    },
    p,
  );
  assert.equal(out.features.smoking_status, "Former");
  assert.equal(out.features.smoking_pack_years, 20);
  assert.equal(out.features.current_smoking_intensity_cigs_day, 0);
  assert.equal(
    derive27(
      { smokeEver: "1 = Yes", smokeCurrent: "1 = Yes", smokeStart: "99" },
      p,
    ).features.smoking_pack_years,
    null,
  );
});
test("inactive smoking history is retained but does not affect never-smoking features", () => {
  const a = {
    smokeEver: "0 = No",
    smokeAverage: "50",
    smokeStart: "12",
    smokeCurrent: "1 = Yes",
  };
  assert.equal(
    isApplicable27(
      QUESTIONS27.find((q) => q.id === "smokeAverage"),
      a,
    ),
    false,
  );
  assert.equal(derive27(a, p).features.smoking_pack_years, 0);
  const saved = createIntake27(users[0], p, check(), a);
  assert.equal(saved.rawResponses.smokeAverage, "50");
  assert.equal(saved.applicability.smokeAverage, false);
});
test("multi-beverage ethanol uses per-frequency quantities and documented ABV assumptions", () => {
  const a = {
    alcoholHistory: "Currently use alcohol products",
    alc_beer: "Selected",
    alc_beer_quantity: "2",
    alc_beer_frequency: "Weekly",
    alc_wine: "Selected",
    alc_wine_quantity: "1",
    alc_wine_frequency: "Daily",
    alc_spirits: "Not selected",
    alc_country: "Not selected",
  };
  assert.equal(derive27(a, p).features.alcohol_ethanol_g_week, 112.4325);
  assert.equal(
    derive27({ ...a, alc_wine_frequency: "" }, p).features
      .alcohol_ethanol_g_week,
    null,
  );
  assert.equal(
    derive27({ ...a, alcoholHistory: "Never used alcohol products" }, p)
      .features.alcohol_ethanol_g_week,
    0,
  );
});
test("overlapping passive durations produce bounds not a fabricated cumulative total", () => {
  const a = {
    passiveHome: "1 = Yes",
    passive_partner: "1 = Yes",
    passive_partner_years: "10",
    passive_otherHome: "1 = Yes",
    passive_otherHome_years: "8",
    passiveOutside: "0 = No",
  };
  const r = derive27(a, p);
  assert.equal(r.features.passive_smoking_adult_years, 10);
  assert.deepEqual(r.passiveBounds, [10, 18]);
  assert.equal(
    derive27({ ...a, passive_otherHome: "0 = No" }, p).features
      .passive_smoking_adult_years,
    10,
  );
});
test("IPAQ work/duration skips and weighted sitting keep missing values distinct", () => {
  const a = {
    ipaq1: "No",
    ipaq2: "7",
    ipaq3_hours: "3",
    ipaq3_minutes: "0",
    ipaq26_hours: "4",
    ipaq26_minutes: "0",
    ipaq27_hours: "2",
    ipaq27_minutes: "0",
  };
  assert.equal(
    isApplicable27(
      QUESTIONS27.find((q) => q.id === "ipaq3_hours"),
      a,
    ),
    false,
  );
  assert.equal(derive27(a, p).features.sitting_minutes_day, 1440 / 7);
  assert.equal(
    derive27({ ...a, ipaq27_minutes: "" }, p).features.sitting_minutes_day,
    null,
  );
  assert.equal(derive27(a, p).features.activity_min_week, null);
});
test("protocol v1 maps education levels monotonically and retains prefer-not-to-answer as missing", () => {
  const scores = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(
    (i) =>
      additionalFeatures({ gen3Education: EDUCATION_OPTIONS[i] }).features
        .ses_index_0_100,
  );
  assert.deepEqual(scores, [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]);
  assert.equal(
    additionalFeatures({ gen3Education: EDUCATION_OPTIONS[9] }).features
      .ses_index_0_100,
    null,
  );
});
test("PINTIG Food6 applies source frequency conversion, caps components and requires complete food responses", () => {
  assert.ok(FOODS.length >= 40);
  const low = Object.fromEntries(
    FOODS.map((f) => ["ffq_" + f.id, FOOD_FREQUENCIES[0]]),
  );
  const high = Object.fromEntries(
    FOODS.map((f) => ["ffq_" + f.id, FOOD_FREQUENCIES[8]]),
  );
  assert.equal(additionalFeatures(low).features.diet_score_0_100, 100 / 3);
  assert.equal(additionalFeatures(high).features.diet_score_0_100, 200 / 3);
  assert.equal(
    additionalFeatures({ ...low, ffq_raisins: "" }).features.diet_score_0_100,
    null,
  );
});
test("IPAQ v1 calculates minutes/week and MET-minutes with ten-minute and 180-minute daily rules", () => {
  const a = { ipaq1: "Yes" };
  for (const q of [2, 4, 6]) {
    a["ipaq" + q] = "2";
    a[`ipaq${q + 1}_hours`] = "1";
    a[`ipaq${q + 1}_minutes`] = "0";
  }
  for (const q of [8, 10, 12, 14, 16, 18, 20, 22, 24]) a["ipaq" + q] = "0";
  const r = additionalFeatures(a).activity;
  assert.equal(r.minutes, 360);
  assert.equal(r.metMinutes, 120 * 8 + 120 * 4 + 120 * 3.3);
  a.ipaq3_hours = "0";
  a.ipaq3_minutes = "9";
  assert.equal(additionalFeatures(a).activity.minutes, 240);
  const capped = {
    ...a,
    ipaq2: "7",
    ipaq3_hours: "3",
    ipaq3_minutes: "0",
    ipaq4: "0",
    ipaq6: "0",
  };
  assert.equal(additionalFeatures(capped).activity.minutes, 1260);
});
test("IPAQ scope excludes age 70 and the urban code requires recorded provenance", () => {
  const a = { residenceClass: "Urban" };
  assert.equal(additionalFeatures(a, 70).features.activity_min_week, null);
  assert.equal(additionalFeatures(a).features.urban_rural_residence, null);
  assert.equal(
    additionalFeatures({
      ...a,
      residenceReference: "PSA 2020; barangay code 000",
    }).features.urban_rural_residence,
    1,
  );
});
test("invalid codes, BP ordering and inconsistent24-hour totals block saving", () => {
  for (const a of [
    { sbp1: "120", dbp1: "130" },
    { bpMed: "Yes" },
    {
      sleep: "10",
      sleepSedentary: "10",
      sleepSlight: "10",
      sleepModerate: "0",
      sleepHeavy: "0",
    },
  ]) {
    assert.ok(derive27(a, p).issues.length);
    assert.throws(() => createIntake27(users[0], p, check(), a));
  }
});
test("saving requires current eligibility and active role; raw snapshots do not mutate", () => {
  assert.throws(() => createIntake27(null, p, check(), {}));
  assert.throws(() =>
    createIntake27({ ...users[0], active: false }, p, check(), {}),
  );
  assert.throws(() => createIntake27(users[0], p, null, {}));
  const a = { smokeEver: "9 = Unknown" };
  const r = createIntake27(users[1], p, check(), a);
  assert.equal(r.featureProtocol, "PINTIG-FE-1.0");
  assert.equal(r.featureProvenance.ses_index_0_100.state, "unavailable");
  a.smokeEver = "0 = No";
  assert.equal(r.rawResponses.smokeEver, "9 = Unknown");
  assert.equal(Object.keys(r.rawResponses).length, QUESTIONS27.length);
  assert.equal(r.modelStatus, "blocked");
  assert.equal("risk" in r, false);
  assert.equal("band" in r, false);
});
test("expanded schema cannot call legacy illustrative or seven-feature research model", () => {
  assert.throws(() =>
    simulate({ schema: INTAKE27_SCHEMA, sbp: "120", bmi: "24" }, p),
  );
  assert.throws(() => simulate({ smoking_status: "Current", bmi: "24" }, p));
  assert.equal(
    researchInputsFor(p, {
      inputs: { schema: INTAKE27_SCHEMA },
      ageAtAssessment: age(p.dob),
    }),
    null,
  );
});

test("shared prompts retain row identity and independent response fields across questionnaires", () => {
  const find = (id) => QUESTIONS27.find(q => q.id === id);
  assert.equal(find("alc_beer").sharedPrompt, find("alc_wine").sharedPrompt);
  assert.equal(find("alc_beer").text, "Beer");
  assert.equal(find("alc_beer_quantity").context, "Beer");
  assert.equal(find("family_Stroke_Father").context, "Stroke");
  assert.equal(find("family_Stroke_Father").text, "Father");
  assert.equal(find("ipaq3_hours").sharedPrompt, find("ipaq3_minutes").sharedPrompt);
  assert.equal(find("ipaq3_hours").text, "Hours per day");
  assert.ok(find("ffq_apple").sharedPrompt);
  assert.equal(find("sleep").sharedPrompt, find("sleepHeavy").sharedPrompt);
  assert.equal(find("passive_work_years").context, "At Work?");
});
