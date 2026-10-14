import type { RiskBand } from "../types/domain";
import { band } from "../utils/risk";

export const FURTHER_ASSESSMENT_VERSION = "FURTHER-ASSESSMENT-1.0";
export interface FurtherAssessmentSnapshot {
  validatedModel: true;
  clinicallyReviewedRules: true;
  category: RiskBand;
  probability: number;
  heading: string;
  message: string;
  ruleVersion: string;
  modelVersion: string;
}
export type FurtherAssessmentResult =
  | { status: "ready"; guidance: FurtherAssessmentSnapshot }
  | { status: "unavailable" | "loading"; reason: string };
const messages: Record<RiskBand, string> = {
  Low: "Provide general cardiovascular health education and review relevant individual risk factors when appropriate. Additional clinical assessment may still be necessary depending on the patient's health history and clinical findings.",
  Moderate:
    "Discuss modifiable cardiovascular risk factors and appropriate preventive monitoring. Consider additional clinical assessment based on the patient's blood-pressure measurements, medical history, and other relevant findings.",
  High: "Recommend a comprehensive cardiovascular risk review with a qualified healthcare professional. This may include verification of blood-pressure measurements and consideration of additional clinical or laboratory assessment, as appropriate.",
  "Very High":
    "Prioritize review by a qualified clinician for comprehensive cardiovascular risk evaluation and preventive-care planning. Further clinical or laboratory assessment may be appropriate based on the healthcare professional's judgment.",
};
const validProbability = (risk: unknown): risk is number =>
  typeof risk === "number" && Number.isFinite(risk) && risk >= 0 && risk <= 1;
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** Approval is a future trusted integration prerequisite, never inferred from CIF metadata.
 * Current application callers do not supply it. Fixtures exercise the proposed rules only.
 */
export function furtherAssessment(
  risk: unknown,
  category: unknown,
  eligibility?: {
    validatedModel: true;
    clinicallyReviewedRules: true;
    modelVersion: string;
  },
  state: "complete" | "loading" | "failed" = "complete",
): FurtherAssessmentResult {
  if (state === "loading")
    return { status: "loading", reason: "Awaiting the assessment result." };
  if (state === "failed" || !validProbability(risk))
    return {
      status: "unavailable",
      reason:
        "A valid ten-year estimate is required for further assessment guidance.",
    };
  if (category !== band(risk))
    return {
      status: "unavailable",
      reason: "The estimate and risk category could not be verified.",
    };
  if (
    !eligibility ||
    eligibility.validatedModel !== true ||
    eligibility.clinicallyReviewedRules !== true ||
    !nonempty(eligibility.modelVersion) ||
    /^(ILLUSTRATIVE|PROVISIONAL)/i.test(eligibility.modelVersion)
  )
    return {
      status: "unavailable",
      reason:
        "Category-based recommendations are unavailable because this estimate is not a clinically validated prediction.",
    };
  return {
    status: "ready",
    guidance: {
      validatedModel: true,
      clinicallyReviewedRules: true,
      category: band(risk),
      probability: risk,
      heading: "Further Assessment Guidance",
      message: messages[band(risk)],
      ruleVersion: FURTHER_ASSESSMENT_VERSION,
      modelVersion: eligibility.modelVersion,
    },
  };
}

/** Historical views never regenerate messages using current rules. */
export function storedFurtherAssessment(
  stored: FurtherAssessmentSnapshot | undefined,
  risk: unknown,
  category: unknown,
  modelVersion: string,
): FurtherAssessmentResult {
  if (!stored)
    return {
      status: "unavailable",
      reason:
        "No verified further assessment guidance was recorded with this assessment.",
    };
  if (
    !validProbability(risk) ||
    stored.validatedModel !== true ||
    stored.clinicallyReviewedRules !== true ||
    category !== band(risk) ||
    stored.probability !== risk ||
    stored.category !== category ||
    stored.modelVersion !== modelVersion ||
    /^(ILLUSTRATIVE|PROVISIONAL)/i.test(modelVersion) ||
    !nonempty(modelVersion) ||
    !nonempty(stored.ruleVersion) ||
    !nonempty(stored.message) ||
    stored.heading !== "Further Assessment Guidance"
  )
    return {
      status: "unavailable",
      reason: "The recorded further assessment guidance could not be verified.",
    };
  return { status: "ready", guidance: { ...stored } };
}
