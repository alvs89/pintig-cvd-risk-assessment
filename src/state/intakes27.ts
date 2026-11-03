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
    rawResponses: { ...raw },
    applicability: Object.fromEntries(
      QUESTIONS27.map((q) => [q.id, isApplicable27(q, raw)]),
    ),
    sources: Object.fromEntries(QUESTIONS27.map((q) => [q.id, q.source])),
    ...derived,
  };
}
export type Intake27 = ReturnType<typeof createIntake27> & { id: number };
/** Session-only, separate from records containing historical risk estimates. */
export const intakes27: Intake27[] = [];
