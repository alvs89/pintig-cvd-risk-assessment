import type { AssessmentRecord, Result } from "../types/domain";
import { T } from "../utils/format";
import { RISK_BAND_VERSION } from "../utils/risk";
import { EXPLANATION_VERSION, explainCalculation } from "./explanation";
import { GUIDANCE_VERSION } from "./guidance";
import { PREDICTION_VERSION } from "./prediction";
export function createSnapshot(
  result: Result,
  id: number,
  userId: number,
): AssessmentRecord {
  const rules = result.guidanceRules ?? [];
  return {
    id,
    pid: result.pid,
    uid: userId,
    date: T(),
    risk: result.risk,
    band: result.band,
    model: PREDICTION_VERSION,
    riskBandVersion: RISK_BAND_VERSION,
    explanationVersion: EXPLANATION_VERSION,
    inputs: {
      ...result.inputs,
      ageAtAssessment: String(result.ageAtAssessment),
      bmi: result.bmi.toFixed(1),
    },
    explanation: explainCalculation(result.parts),
    guidance: rules.map((rule) => rule.title + ": " + rule.steps).join("\n"),
    guidanceRules: rules.map((rule) => ({ ...rule })),
    guidanceVersion: GUIDANCE_VERSION,
  };
}
