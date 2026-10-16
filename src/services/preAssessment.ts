import type { Patient } from "../types/domain";
import { age } from "../utils/format";
import {
  SCREENING_VERSION,
  SCREENING_KEYS,
  screeningDecision,
  type ScreeningAttestation,
} from "./preAssessmentRules.mjs";
export interface PreAssessment {
  pid: number;
  answers: Record<string, string>;
  confirmed: string | null;
}
export function screeningSignature(
  p: Patient,
  answers: Record<string, string>,
) {
  return JSON.stringify([
    SCREENING_VERSION,
    p.id,
    p.record,
    p.first,
    p.middle,
    p.last,
    p.dob,
    p.sex,
    age(p.dob),
    ...SCREENING_KEYS.map((key) => answers[key] ?? ""),
  ]);
}
export function screeningForPatient(
  check: PreAssessment | null,
  p: Patient,
): ScreeningAttestation | null {
  if (
    !check ||
    check.pid !== p.id ||
    check.confirmed !== screeningSignature(p, check.answers) ||
    screeningDecision(check.answers, age(p.dob)).status !== "eligible"
  )
    return null;
  return {
    version: SCREENING_VERSION,
    ageYears: age(p.dob),
    answers: { ...check.answers },
  };
}
