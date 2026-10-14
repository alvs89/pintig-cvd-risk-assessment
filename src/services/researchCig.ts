import type { AssessmentInputs, Patient, Result } from "../types/domain";

/** Private research-only model: NOT the intended PURE outcome. */
export const RESEARCH_MODEL_VERSION = "FRAMINGHAM-7P-RSF-RESEARCH-20261015";
export const RESEARCH_CIG_ENDPOINT = "http://127.0.0.1:8765/research-cif";
export interface ResearchPoint {
  year: number;
  probability: number;
}
export interface ResearchCif {
  risk: number;
  points: ResearchPoint[];
  annual: ResearchPoint[];
}
export interface ResearchInput {
  age_years: number;
  sex_male: number;
  sbp_mmhg: number;
  dbp_mmhg: number;
  bmi_kg_m2: number;
  current_smoker: number;
  bp_medication: number;
}
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** Hard restriction to the three known fictional demonstration identities. */
export function isFictionalIntakePatient(p: Patient): boolean {
  return (
    (p.id === 1 && p.record === "PNT-000001" &&
      p.first === "Roberto" && p.last === "Dela Cruz" &&
      p.dob === "1968-04-17") ||
    (p.id === 2 && p.record === "PNT-000002" &&
      p.first === "Elena" && p.last === "Reyes" &&
      p.dob === "1975-07-08") ||
    (p.id === 3 && p.record === "PNT-000003" &&
      p.first === "Antonio" && p.last === "Santos" &&
      p.dob === "1982-01-13")
  );
}
/** No identity or other questionnaire fields are sent to the research service. */
export function researchInputsFor(
  p: Patient,
  assessment: Pick<Result, "inputs" | "ageAtAssessment">,
): ResearchInput | null {
  if (!isFictionalIntakePatient(p)) return null;
  const x: AssessmentInputs = assessment.inputs;
  if (x.prior !== "No" || x.verified !== "Yes") return null;
  const age = assessment.ageAtAssessment;
  const sbp = Number(x.sbp), dbp = Number(x.dbp), bmi = Number(x.bmi);
  if (
    !Number.isInteger(age) || age < 35 || age > 70 ||
    !x.sbp || !x.dbp || !x.bmi ||
    ![sbp, dbp, bmi].every(Number.isFinite) ||
    sbp < 70 || sbp > 260 || dbp < 40 || dbp > 160 ||
    dbp >= sbp || bmi < 12 || bmi > 65 ||
    !["Yes", "No"].includes(x.currentSmoking) ||
    !["Yes", "No"].includes(x.bpMeds)
  ) return null;
  return {
    age_years: age,
    sex_male: p.sex === "Male" ? 1 : 0,
    sbp_mmhg: sbp,
    dbp_mmhg: dbp,
    bmi_kg_m2: bmi,
    current_smoker: x.currentSmoking === "Yes" ? 1 : 0,
    bp_medication: x.bpMeds === "Yes" ? 1 : 0,
  };
}
/** Reject incomplete or fabricated time points; never infer annual time series. */
export function verifyResearchCif(input: unknown): ResearchCif | null {
  if (!record(input) ||
      input.schemaVersion !== "research-7p-cif-v1" ||
      input.modelVersion !== RESEARCH_MODEL_VERSION ||
      input.source !== "local-readonly-randomForestSRC" ||
      input.endpoint !== "Framingham-recorded CVD; not final PURE major-CVD composite" ||
      input.competing !== "Death before recorded CVD; cause of death not verified" ||
      input.numberOfTrees !== 500 ||
      !finite(input.risk10) || input.risk10 < 0 || input.risk10 > 1 ||
      !record(input.cif))
    return null;
  const cif = input.cif;
  if (cif.timeUnit !== "days" || cif.daysPerYear !== 365.25 ||
      cif.supportedUntil !== 3652.5 || cif.probabilityUnit !== "fraction" ||
      !Array.isArray(cif.times) || !Array.isArray(cif.probabilities) ||
      cif.times.length < 11 || cif.times.length !== cif.probabilities.length ||
      cif.times.length > 20000)
    return null;
  const points: ResearchPoint[] = [{ year: 0, probability: 0 }];
  let lastTime = 0, lastProbability = 0;
  for (let i = 0; i < cif.times.length; i++) {
    const time: unknown = cif.times[i], probability: unknown = cif.probabilities[i];
    if (!finite(time) || !finite(probability) ||
        time <= lastTime || time > 3652.5 || probability < lastProbability - 1e-12 ||
        probability < 0 || probability > 1)
      return null;
    points.push({ year: time / 365.25, probability });
    lastTime = time;
    lastProbability = probability;
  }
  if (lastTime !== 3652.5 || Math.abs(lastProbability - input.risk10) > 1e-12)
    return null;
  const annual: ResearchPoint[] = [];
  for (let year = 1; year <= 10; year++) {
    const eligible = points.filter((v) => v.year <= year + 1e-10);
    annual.push({ year, probability: eligible[eligible.length - 1].probability });
  }
  if (Math.abs(annual[9].probability - input.risk10) > 1e-12) return null;
  return { risk: input.risk10, points, annual };
}
