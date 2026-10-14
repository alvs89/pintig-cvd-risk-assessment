import type { AssessmentInputs, RiskBand } from "../types/domain";
import { band } from "../utils/risk";

/** Educational prototype only; NOT clinical rule approval or model validation. */
export const PROTOTYPE_FOLLOWUP_VERSION = "PROTOTYPE-FOLLOWUP-1.0";
export const PROTOTYPE_FOLLOWUP_MODEL = "ILLUSTRATIVE-0.2";

export interface PrototypeFollowUpAction {
  id: string;
  title: string;
  finding: string;
  consideration: string;
}
export interface PrototypeFollowUpSnapshot {
  source: "illustrative-prototype";
  probability: number;
  category: "High" | "Very High";
  modelVersion: typeof PROTOTYPE_FOLLOWUP_MODEL;
  ruleVersion: typeof PROTOTYPE_FOLLOWUP_VERSION;
  introduction: string;
  actions: PrototypeFollowUpAction[];
}
export type PrototypeFollowUpResult =
  | { status: "ready"; guidance: PrototypeFollowUpSnapshot }
  | { status: "below-threshold" | "unavailable"; reason: string };

const validRisk = (risk: unknown): risk is number =>
  typeof risk === "number" &&
  Number.isFinite(risk) &&
  risk >= 0 &&
  risk <= 1;
const numeric = (raw: unknown): number | null =>
  typeof raw === "string" &&
  raw.trim() !== "" &&
  Number.isFinite(Number(raw))
    ? Number(raw)
    : null;
const isYes = (value: unknown) => value === "Yes";

/**
 * Demonstrates communication only. Uses full-precision illustrative risk for the
 * 10% selection rule; specific suggestions depend on recorded questionnaire
 * fields, not factor-chart contributions, model CIF, or reference markers.
 *
 * No diagnosis, prescription, mandated referral, triage or appointment interval.
 */
export function prototypeFollowUp(
  risk: unknown,
  category: unknown,
  inputs: AssessmentInputs | undefined,
  modelVersion: string = PROTOTYPE_FOLLOWUP_MODEL,
): PrototypeFollowUpResult {
  if (!validRisk(risk) || category !== band(risk))
    return { status: "unavailable", reason: "A consistent ten-year estimate is required." };
  if (risk < 0.1)
    return {
      status: "below-threshold",
      reason:
        "This illustrative estimate is below the proposed 10% follow-up display threshold. Continue the separate condition-based educational guidance; clinical evaluation may still be appropriate for individual findings.",
    };
  if (
    modelVersion !== PROTOTYPE_FOLLOWUP_MODEL ||
    !inputs ||
    inputs.prior !== "No" ||
    inputs.verified !== "Yes"
  )
    return {
      status: "unavailable",
      reason: "Prototype follow-up could not be generated from a verified fictional intake and illustrative result.",
    };

  const categoryName = category as "High" | "Very High";
  const actions: PrototypeFollowUpAction[] = [];
  const add = (id: string, title: string, finding: string, consideration: string) =>
    actions.push({ id, title, finding, consideration });

  if (categoryName === "Very High")
    add(
      "LEVEL-VERY-HIGH",
      "Discuss a comprehensive clinician-led cardiovascular risk review",
      "Illustrative ten-year risk category: Very High (20% or higher)",
      "A qualified healthcare professional could review the combined history, repeat relevant measurements, and determine whether additional clinical or laboratory evaluation is appropriate. The category alone does not establish a referral urgency or treatment plan.",
    );
  else
    add(
      "LEVEL-HIGH",
      "Discuss further cardiovascular assessment",
      "Illustrative ten-year risk category: High (10% to below 20%)",
      "Discuss the recorded risk factors with a qualified healthcare professional, who can decide whether further clinical or laboratory evaluation is appropriate. This prototype percentage is not a validated referral threshold.",
    );

  const sbp = numeric(inputs.sbp), dbp = numeric(inputs.dbp);
  if (
    sbp !== null && dbp !== null &&
    sbp >= 60 && sbp <= 300 && dbp >= 30 && dbp <= 180 &&
    sbp > dbp
  ) {
    if (sbp >= 140 || dbp >= 90)
      add(
        "BP-RECHECK",
        "Confirm and review elevated blood-pressure readings",
        "Recorded BP: " + sbp + "/" + dbp + " mmHg",
        "Repeat blood-pressure measurements using suitable cuff size and a seated rest, record the results, and discuss repeated elevated readings with a qualified healthcare professional. A single reading does not confirm a diagnosis.",
      );
    else if (sbp >= 130 || dbp >= 80)
      add(
        "BP-MONITOR",
        "Discuss blood-pressure monitoring",
        "Recorded BP: " + sbp + "/" + dbp + " mmHg",
        "Review measurement technique, consider recording repeated readings, and discuss reducing excess dietary sodium if relevant.",
      );
  }
  if (isYes(inputs.currentSmoking))
    add(
      "SMOKING",
      "Offer smoking-cessation support",
      "Current smoking: Yes",
      "Discuss readiness to stop smoking, identify practical triggers and support options, and ask a healthcare professional about accessible cessation services.",
    );
  if (isYes(inputs.diabetesHistory))
    add(
      "DIABETES",
      "Review the reported diabetes history",
      "Reported previous diabetes diagnosis: Yes",
      "Bring available diabetes records to a qualified healthcare professional for a review of ongoing follow-up and relevant cardiovascular risk factors. Do not change medicines based on this estimate.",
    );
  if (isYes(inputs.bpMeds))
    add(
      "BP-MEDICATION",
      "Review existing blood-pressure medication information",
      "Current blood-pressure medication: Yes",
      "Confirm the medication list and discuss adherence, side effects, and repeated BP readings with the prescribing professional. Do not start, stop, or adjust doses based on this demonstration.",
    );
  const bmi = numeric(inputs.bmi);
  if (bmi !== null && bmi >= 25 && bmi <= 65)
    add(
      "BODY-MASS",
      "Discuss achievable nutrition and movement goals",
      "Recorded BMI: " + bmi.toFixed(1) + " kg/m²",
      "Discuss practical meal choices and gradual activity goals suited to the person's circumstances. BMI alone does not diagnose an illness.",
    );
  if (inputs.mode === "extended") {
    const activity = numeric(inputs.activityMinutes);
    if (activity !== null && activity >= 0 && activity < 150)
      add(
        "ACTIVITY",
        "Explore a gradual physical-activity routine",
        "Reported physical activity: " + activity + " minutes/week",
        "Ask about mobility and current activity; consider gradually adding suitable walking or other moderate activity when appropriate. A commonly used adult goal is 150 minutes per week.",
      );
    if (inputs.saltFrequency === "Often" || inputs.processedFood === "Often")
      add(
        "SALT",
        "Review added salt and processed-food habits",
        "Frequent added salt or processed-food consumption reported",
        "Discuss checking packaged-food sodium labels and reducing frequent use of salty condiments when practical.",
      );
    const produce = numeric(inputs.fruitVeg);
    if (produce !== null && produce >= 0 && produce < 3)
      add(
        "PRODUCE",
        "Explore affordable fruit and vegetable options",
        "Reported fruit and vegetables: " + produce + " servings/day",
        "Discuss practical ways to include more fruits and vegetables in regular meals while considering budget and access.",
      );
    const alcohol = numeric(inputs.alcoholDrinks);
    if (alcohol !== null && alcohol > 0)
      add(
        "ALCOHOL",
        "Discuss alcohol-use patterns",
        "Reported alcohol consumption: " + alcohol + " drinks/week",
        "Review drinking habits and opportunities to reduce alcohol consumption. Alcohol should not be recommended for cardiovascular protection.",
      );
    if (isYes(inputs.family))
      add(
        "FAMILY",
        "Clarify the cardiovascular family history",
        "Reported family history of cardiovascular disease: Yes",
        "Ask which relatives were affected and at what ages, and share this history during a clinician-led risk-factor review.",
      );
  }

  return {
    status: "ready",
    guidance: {
      source: "illustrative-prototype",
      probability: risk,
      category: categoryName,
      modelVersion: PROTOTYPE_FOLLOWUP_MODEL,
      ruleVersion: PROTOTYPE_FOLLOWUP_VERSION,
      introduction:
        categoryName === "Very High"
          ? "For illustration only: this shows how several recorded findings could be organized for a comprehensive professional risk discussion."
          : "For illustration only: this shows how a professional follow-up discussion could address recorded risk factors.",
      actions,
    },
  };
}

/** Snapshot validation, not regeneration: preserve the guidance from save-time. */
export function storedPrototypeFollowUp(
  saved: PrototypeFollowUpSnapshot | undefined,
  risk: unknown,
  category: unknown,
  modelVersion: string,
): PrototypeFollowUpResult {
  if (!saved)
    return { status: "unavailable", reason: "No prototype follow-up guidance was saved with this assessment." };
  if (
    !validRisk(risk) ||
    risk < 0.1 ||
    category !== band(risk) ||
    saved.source !== "illustrative-prototype" ||
    saved.probability !== risk ||
    saved.category !== category ||
    saved.modelVersion !== PROTOTYPE_FOLLOWUP_MODEL ||
    modelVersion !== saved.modelVersion ||
    saved.ruleVersion !== PROTOTYPE_FOLLOWUP_VERSION ||
    typeof saved.introduction !== "string" ||
    !Array.isArray(saved.actions) ||
    saved.actions.length === 0 ||
    saved.actions.some((item) =>
      !item ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.finding !== "string" ||
      typeof item.consideration !== "string")
  )
    return { status: "unavailable", reason: "Saved prototype guidance does not match this assessment's original estimate." };
  return {
    status: "ready",
    guidance: { ...saved, actions: saved.actions.map((item) => ({ ...item })) },
  };
}
