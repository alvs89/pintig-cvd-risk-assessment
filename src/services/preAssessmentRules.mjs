// Shared executable policy: React and the private Node API use the same rules.
export const SCREENING_VERSION = "PINTIG-AGGREGATE-PHILPEN2022-2";
export const WARNING_SIGNS = [
  ["chestPain", "Chest pain"],
  ["breathing", "Difficulty breathing"],
  ["consciousness", "Loss of consciousness"],
  ["speech", "Slurred speech or difficulty speaking"],
  ["face", "Facial asymmetry"],
  ["weakness", "Weakness or numbness on one side of the body"],
  ["disorientation", "Disorientation as to time, place, or person"],
  ["retractions", "Chest retractions (chest pulling inward during breathing)"],
  ["seizure", "Seizure or convulsion"],
  ["selfHarm", "An act of self-harm or suicide attempt"],
  ["agitation", "Agitated or aggressive behavior"],
  ["eyeInjury", "Eye injury or a foreign body in the eye"],
  ["severeInjury", "Severe injuries"],
];
// Aggregate attestations, not reconstructed answers for individual symptoms/events.
export const SCREENING_KEYS = ["warningSigns", "cardiovascularHistory"];
export function screeningDecision(answers, years) {
  const a =
    answers && typeof answers === "object" && !Array.isArray(answers)
      ? answers
      : {};
  if (a.warningSigns === "Yes")
    return {
      status: "warning",
      title: "Routine Risk Assessment Paused",
      message:
        "A warning sign has been reported that may require immediate clinical evaluation. Notify the responsible healthcare professional and follow the facility's established emergency or referral procedures, including transfer to an appropriate level of care when indicated. PINTIG estimates long-term cardiovascular risk and cannot diagnose or rule out an acute medical condition. Do not delay clinical assessment to obtain a risk score.",
    };
  if (a.cardiovascularHistory === "Yes")
    return {
      status: "history",
      title: "First-Event Risk Assessment Not Applicable",
      message:
        "The patient has a reported history of a qualifying cardiovascular condition. PINTIG estimates first-event risk and is not designed to estimate recurrent cardiovascular-event risk. A qualified healthcare professional should review the patient's history and determine the appropriate clinical assessment and continuing care.",
    };
  if (!Number.isInteger(years) || years < 35 || years > 70)
    return {
      status: "age",
      title: "Age eligibility not met",
      message:
        "Select a patient aged 35–70 years at assessment before proceeding.",
    };
  if (SCREENING_KEYS.some((key) => a[key] === "Unknown"))
    return {
      status: "uncertain",
      title: "Clarification required",
      message:
        "A required answer is unable to be confirmed. Pause routine assessment and ask the responsible healthcare professional to clarify it before continuing.",
    };
  if (
    Object.keys(a).length !== SCREENING_KEYS.length ||
    !SCREENING_KEYS.every((key) => a[key] === "No")
  )
    return {
      status: "incomplete",
      title: "Eligibility check incomplete",
      message:
        "Complete both healthcare-worker confirmations before continuing.",
    };
  return {
    status: "eligible",
    title: "Eligible to continue",
    message:
      "The required screening responses permit routine first-event assessment. Negative answers do not rule out a current medical condition.",
  };
}
export function validScreeningAttestation(screening, years) {
  return (
    !!screening &&
    !Array.isArray(screening) &&
    Object.keys(screening).sort().join("|") === "ageYears|answers|version" &&
    screening.version === SCREENING_VERSION &&
    screening.ageYears === years &&
    !!screening.answers &&
    Object.keys(screening.answers).length === SCREENING_KEYS.length &&
    screeningDecision(screening.answers, years).status === "eligible"
  );
}
