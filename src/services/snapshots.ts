import type { AssessmentRecord, Result } from "../types/domain";
import { T } from "../utils/format";
import { RISK_BAND_VERSION } from "../utils/risk";
import { EXPLANATION_VERSION, explainCalculation } from "./explanation";
import { GUIDANCE_VERSION } from "./guidance";
import { PREDICTION_VERSION } from "./prediction";
import { prototypeFollowUp } from "./prototypeFollowUp";
import {
  copyCif,
  copyPredictionContext,
  isModelPredictionContext,
  validateCif,
} from "./cif";
export function createSnapshot(
  result: Result,
  id: number,
  userId: number,
): AssessmentRecord {
  const rules = result.guidanceRules ?? [];
  const demoFollowUp = prototypeFollowUp(result.risk, result.band, result.inputs);
  const demoSnapshot = demoFollowUp.status === "ready"
    ? demoFollowUp.guidance
    : undefined;
  const context = isModelPredictionContext(result.predictionContext, result.pid)
    ? result.predictionContext
    : undefined;
  const curveValid =
    validateCif(result.cif, context, result.pid, result.risk).status ===
    "ready";
  return {
    id,
    pid: result.pid,
    uid: userId,
    date: T(),
    risk: result.risk,
    band: result.band,
    model: context?.modelVersion ?? PREDICTION_VERSION,
    ...(context ? { predictionContext: copyPredictionContext(context) } : {}),
    ...(curveValid && result.cif ? { cif: copyCif(result.cif) } : {}),
    ...(demoSnapshot
      ? {
          prototypeFollowUpGuidance: {
            ...demoSnapshot,
            actions: demoSnapshot.actions.map((item) => ({ ...item })),
          },
        }
      : {}),
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
