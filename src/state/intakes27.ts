import {
  derive27,
  INTAKE27_SCHEMA,
  QUESTIONS27,
  isApplicable27,
  type Answers27,
} from "../services/assessment27";
import { screeningForPatient } from "../services/preAssessment";
import type { Patient, User } from "../types/domain";
import type { PreAssessment } from "../services/preAssessment";
import { FEATURE_PROTOCOL_VERSION } from "../services/featureProtocolV1";
import {
  EDUCATION_OPTIONS,
  FOOD_FREQUENCIES,
  FOODS,
} from "../services/featureProtocolV1";
import { EMPLOYMENT_OPTIONS, INCOME_OPTIONS } from "../services/sesProtocol";
import { screeningSignature } from "../services/preAssessment";
import { SCREENING_KEYS } from "../services/preAssessmentRules.mjs";
import { seededIntake } from "./seededIntakes";

export function createIntake27(
  user: User | null,
  patient: Patient,
  screening: PreAssessment | null,
  answers: Answers27,
) {
  if (!user?.active || !["admin", "worker"].includes(user.role))
    throw new Error("Sign in with an active authorized account.");
  const eligibility = screeningForPatient(screening, patient);
  if (!eligibility)
    throw new Error("Complete the eligibility and safety check before saving.");
  const raw = Object.fromEntries(
    QUESTIONS27.map((q) => [q.id, answers[q.id] ?? ""]),
  );
  const derived = derive27(raw, patient);
  if (derived.issues.length)
    throw new Error(
      "Correct the highlighted questionnaire answers before saving.",
    );
  return {
    schema: INTAKE27_SCHEMA,
    featureProtocol: FEATURE_PROTOCOL_VERSION,
    patientId: patient.id,
    userId: user.id,
    recordedAt: new Date().toISOString(),
    baseline: { age: derived.features.age_years, sex: patient.sex },
    eligibility,
    rawResponses: { ...raw, ...Object.fromEntries(['illustrativeHeight', 'illustrativeWeight'].filter(key => answers[key] !== undefined).map(key => [key, answers[key]])) },
    applicability: Object.fromEntries(
      QUESTIONS27.map((q) => [q.id, isApplicable27(q, raw)]),
    ),
    sources: Object.fromEntries(QUESTIONS27.map((q) => [q.id, q.source])),
    ...derived,
  };
}
export type Intake27 = ReturnType<typeof createIntake27> & {
  id: number;
  /** Clearly identifies the fictional, session-only presentation records. */
  demonstration?: boolean;
};
/** Session-only, separate from records containing historical risk estimates. */
export const intakes27: Intake27[] = [];

type DemoProfile = {
  sbp: number; dbp: number; pulse: number; waist: number; hip: number;
  hypertension: boolean; diabetes: boolean; bpMedication: boolean;
  lipidMedication: boolean; diabetesMedication: boolean; familyHistory: boolean;
  alcohol: "never" | "former" | "current"; smoking: "never" | "former" | "current";
  activeDays: number; activityMinutes: number; diet: "supportive" | "mixed" | "limited";
  stress: "low" | "occasional" | "persistent"; sleep: number; passive: "none" | "home" | "work";
};

// Fictional presentation profiles only. They are not research participants,
// clinical records, risk percentages, or model outputs.
const demoProfiles: Record<number, DemoProfile> = {
  1: { sbp: 164, dbp: 96, pulse: 84, waist: 106, hip: 108, hypertension: true, diabetes: true, bpMedication: true, lipidMedication: true, diabetesMedication: true, familyHistory: true, alcohol: "current", smoking: "current", activeDays: 2, activityMinutes: 25, diet: "limited", stress: "persistent", sleep: 5.8, passive: "work" },
  2: { sbp: 142, dbp: 86, pulse: 76, waist: 89, hip: 104, hypertension: true, diabetes: false, bpMedication: true, lipidMedication: false, diabetesMedication: false, familyHistory: true, alcohol: "never", smoking: "never", activeDays: 4, activityMinutes: 35, diet: "mixed", stress: "occasional", sleep: 6.8, passive: "none" },
  3: { sbp: 118, dbp: 74, pulse: 68, waist: 82, hip: 98, hypertension: false, diabetes: false, bpMedication: false, lipidMedication: false, diabetesMedication: false, familyHistory: false, alcohol: "current", smoking: "former", activeDays: 5, activityMinutes: 45, diet: "supportive", stress: "low", sleep: 7.4, passive: "home" },
  4: { sbp: 112, dbp: 72, pulse: 70, waist: 75, hip: 99, hypertension: false, diabetes: false, bpMedication: false, lipidMedication: false, diabetesMedication: false, familyHistory: false, alcohol: "never", smoking: "never", activeDays: 5, activityMinutes: 60, diet: "supportive", stress: "low", sleep: 7.6, passive: "none" },
  5: { sbp: 119, dbp: 77, pulse: 72, waist: 82, hip: 100, hypertension: false, diabetes: false, bpMedication: false, lipidMedication: false, diabetesMedication: false, familyHistory: false, alcohol: "current", smoking: "never", activeDays: 4, activityMinutes: 40, diet: "mixed", stress: "occasional", sleep: 7.2, passive: "none" },
  6: { sbp: 133, dbp: 84, pulse: 78, waist: 88, hip: 106, hypertension: true, diabetes: false, bpMedication: false, lipidMedication: false, diabetesMedication: false, familyHistory: true, alcohol: "former", smoking: "never", activeDays: 3, activityMinutes: 35, diet: "mixed", stress: "occasional", sleep: 6.7, passive: "home" },
  7: { sbp: 122, dbp: 79, pulse: 74, waist: 80, hip: 103, hypertension: false, diabetes: false, bpMedication: false, lipidMedication: false, diabetesMedication: false, familyHistory: true, alcohol: "never", smoking: "former", activeDays: 5, activityMinutes: 50, diet: "supportive", stress: "low", sleep: 7.1, passive: "none" },
  8: { sbp: 149, dbp: 93, pulse: 88, waist: 99, hip: 105, hypertension: true, diabetes: false, bpMedication: true, lipidMedication: true, diabetesMedication: false, familyHistory: true, alcohol: "current", smoking: "current", activeDays: 3, activityMinutes: 25, diet: "limited", stress: "persistent", sleep: 6.0, passive: "work" },
  9: { sbp: 151, dbp: 91, pulse: 80, waist: 97, hip: 111, hypertension: true, diabetes: true, bpMedication: true, lipidMedication: true, diabetesMedication: true, familyHistory: true, alcohol: "never", smoking: "never", activeDays: 3, activityMinutes: 30, diet: "limited", stress: "occasional", sleep: 6.4, passive: "home" },
  10: { sbp: 177, dbp: 101, pulse: 92, waist: 112, hip: 110, hypertension: true, diabetes: true, bpMedication: true, lipidMedication: true, diabetesMedication: true, familyHistory: true, alcohol: "current", smoking: "current", activeDays: 2, activityMinutes: 20, diet: "limited", stress: "persistent", sleep: 5.6, passive: "work" },
};

const yesNo = (value: boolean) => (value ? "Yes" : "No");
const codedYesNo = (value: boolean) => (value ? "1 = Yes" : "0 = No");
const med = (value: boolean) => (value ? "1 = yes, now" : "0 = no");

export function fictionalDemoAnswers(patient: Patient): Answers27 {
  const d = demoProfiles[patient.id];
  if (!d) return {};
  // Reuse established fictional measurements; Patient 11 has no demoProfile.
  const measurements = seededIntake(patient.id);
  const retired = patient.id === 7 || patient.id === 10;
  const answers: Answers27 = {
    illustrativeHeight: measurements?.height ?? '',
    illustrativeWeight: measurements?.weight ?? '',
    gen3Education: EDUCATION_OPTIONS[patient.id === 10 ? 2 : patient.id === 5 ? 5 : patient.id === 4 ? 7 : patient.id === 1 ? 3 : 6],
    familyIncomePH: INCOME_OPTIONS[patient.id === 10 ? 1 : patient.id === 1 ? 2 : patient.id === 4 ? 4 : 3],
    incomeSupportedPeople: String(patient.id === 1 || patient.id === 9 ? 5 : patient.id === 5 ? 2 : 3),
    employmentStatus: EMPLOYMENT_OPTIONS[retired ? 6 : patient.id === 4 || patient.id === 8 ? 1 : 2],
    currentOccupation: retired ? "Retired" : patient.id === 4 ? "Small business owner" : patient.id === 5 ? "Technical services worker" : "Community office worker",
    residenceClass: "Urban",
    residenceReference: "PSA urban classification; fictional demonstration barangay",
    sbp1: String(d.sbp - 1), sbp2: String(d.sbp + 1), dbp1: String(d.dbp - 1), dbp2: String(d.dbp + 1),
    pulse1: String(d.pulse - 1), pulse2: String(d.pulse + 1), waist1: String(d.waist - 1), waist2: String(d.waist + 1),
    hip1: String(d.hip - 1), hip2: String(d.hip + 1), waistClothing: "minimal/no clothing", hipClothing: "minimal/no clothing",
    hypertension: yesNo(d.hypertension), diabetes: yesNo(d.diabetes), bpMed: med(d.bpMedication), lipidMed: med(d.lipidMedication), diabetesMed: med(d.diabetesMedication),
    alcoholHistory: d.alcohol === "never" ? "Never used alcohol products" : d.alcohol === "former" ? "Formerly used alcohol products" : "Currently use alcohol products",
    smokeEver: codedYesNo(d.smoking !== "never"), passiveChild: codedYesNo(d.passive !== "none"),
    passiveHome: codedYesNo(d.passive === "home"), passiveOutside: codedYesNo(d.passive === "work"),
    stressWorkApplicable: retired ? "Not applicable" : "Not marked",
    stressHome: d.stress === "low" ? "Never Experienced Stress" : d.stress === "occasional" ? "Some Period of Stress" : "Permanent Stress",
    sleep: String(d.sleep), ipaq1: retired ? "No" : "Yes", ipaq26_hours: d.activeDays <= 2 ? "8" : "7", ipaq26_minutes: "0", ipaq27_hours: d.activeDays <= 2 ? "7" : "6", ipaq27_minutes: "30",
  };
  for (const condition of ["Coronary Heart Disease", "Stroke"])
    for (const relative of ["Father", "Mother", "Siblings"])
      answers[`family_${condition}_${relative}`] = d.familyHistory && ((condition === "Coronary Heart Disease" && relative === "Father") || (condition === "Stroke" && relative === "Mother")) ? "Yes" : "No";
  if (d.alcohol !== "never") {
    for (const beverage of ["spirits", "wine", "beer", "country"]) answers[`alc_${beverage}`] = beverage === (patient.id === 1 || patient.id === 10 ? "spirits" : "beer") ? "Selected" : "Not selected";
    const beverage = patient.id === 1 || patient.id === 10 ? "spirits" : "beer";
    answers[`alc_${beverage}_frequency`] = "Weekly";
    answers[`alc_${beverage}_quantity`] = d.alcohol === "former" ? "2" : patient.id === 10 ? "6" : "2";
    answers.heavyAlcohol = d.alcohol === "current" && (patient.id === 1 || patient.id === 10) ? "Yes" : "No";
  }
  if (d.smoking !== "never") {
    const current = d.smoking === "current";
    answers.smokeLastYear = codedYesNo(current);
    answers.smokeCurrent = codedYesNo(current);
    answers.smokeNow = current ? String(patient.id === 10 ? 18 : 10) : "0";
    answers.smokeAverage = String(patient.id === 1 ? 16 : patient.id === 10 ? 22 : 10);
    answers.smokeStart = String(patient.id === 1 ? 19 : 21);
    answers.smokeStop = current ? "0" : String(patient.id === 3 ? 35 : 48);
    answers.smokeBreak = codedYesNo(!current && patient.id === 7);
    if (answers.smokeBreak.startsWith("1")) answers.smokeBreakYears = "2";
  }
  if (d.passive !== "none") {
    answers.childMother = codedYesNo(patient.id === 3 || patient.id === 6 || patient.id === 9);
    answers.childFather = codedYesNo(patient.id === 1 || patient.id === 8 || patient.id === 10);
    answers.childOther = "0 = No";
  }
  for (const id of ["partner", "otherHome", "work", "otherIndoor"]) {
    const active = (d.passive === "home" && id === "partner") || (d.passive === "work" && id === "work");
    const gate = id === "partner" || id === "otherHome" ? d.passive === "home" : d.passive === "work";
    if (gate) {
      answers[`passive_${id}`] = codedYesNo(active);
      if (active) answers[`passive_${id}_years`] = String(patient.id === 10 ? 20 : patient.id === 1 ? 12 : 8);
    }
  }
  const activityDays: Record<number, number> = { 2: retired ? 0 : 0, 4: retired ? 0 : 1, 6: retired ? 0 : 1, 10: 0, 12: Math.min(7, d.activeDays), 14: 0, 16: 1, 18: 3, 20: d.activeDays, 22: 0, 24: 0 };
  for (const [numberText, days] of Object.entries(activityDays)) {
    const number = Number(numberText);
    answers[`ipaq${number}`] = String(days);
    if (days > 0) {
      const duration = number === 18 ? 25 : number === 16 ? 20 : d.activityMinutes;
      answers[`ipaq${number + 1}_hours`] = String(Math.floor(duration / 60));
      answers[`ipaq${number + 1}_minutes`] = String(duration % 60);
    }
  }
  const frequency = (group: string) => {
    const healthy = group === "fruit" || group === "vegetables" || group === "grain" || group === "nuts";
    const high = d.diet === "supportive" ? (healthy ? 5 : 1) : d.diet === "mixed" ? (healthy ? 3 : 2) : (healthy ? 2 : 4);
    return FOOD_FREQUENCIES[high];
  };
  for (const food of FOODS) answers[`ffq_${food.id}`] = frequency(food.group);
  if (!retired) answers.stressWork = d.stress === "low" ? "Never Experienced Stress" : d.stress === "occasional" ? "Some Period of Stress" : "Several Periods of Stress";
  return answers;
}

/** Seed exactly Patients 1–10 once with complete fictional questionnaires. */
export function seedFictionalDemoQuestionnaires(patients: Patient[], user: User) {
  if (intakes27.length) return;
  for (const patient of patients.filter((p) => p.id >= 1 && p.id <= 10)) {
    const answers = fictionalDemoAnswers(patient);
    const screeningAnswers = Object.fromEntries(SCREENING_KEYS.map((key) => [key, "No"]));
    const screening = { pid: patient.id, answers: screeningAnswers, confirmed: screeningSignature(patient, screeningAnswers) };
    const preview = derive27(answers, patient);
    if (preview.incomplete.length || preview.issues.length)
      throw new Error(`Invalid fictional questionnaire seed for ${patient.record}: incomplete=${preview.incomplete.join(",")}; issues=${preview.issues.join(",")}`);
    const record = createIntake27(user, patient, screening, answers);
    intakes27.push({ ...record, id: intakes27.length + 1, demonstration: true });
  }
}
