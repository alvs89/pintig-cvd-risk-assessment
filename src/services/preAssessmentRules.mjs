// Shared executable policy: React and the private Node API use the same rules.
export const SCREENING_VERSION = "PINTIG-PREASSESSMENT-PHILPEN2022-1";
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
export const EVENT_HISTORY = [
  ["heartAttack", "Previous heart attack (myocardial infarction)"],
  ["stroke", "Previous stroke"],
  ["heartFailure", "Previously diagnosed heart failure"],
  [
    "coronaryDisease",
    "Other previously diagnosed coronary heart disease, including angina",
  ],
];
export const SCREENING_KEYS = [...WARNING_SIGNS, ...EVENT_HISTORY]
  .map(([key]) => key)
  .concat("verified");
export function screeningDecision(answers, years) {
  const a =
    answers && typeof answers === "object" && !Array.isArray(answers)
      ? answers
      : {};
  if (WARNING_SIGNS.some(([key]) => a[key] === "Yes"))
    return {
      status: "warning",
      title: "Routine Risk Assessment Paused",
      message:
        "A warning sign has been reported that may require immediate clinical evaluation. Notify the responsible healthcare professional and follow the facility's established emergency or referral procedures, including transfer to an appropriate level of care when indicated. PINTIG estimates long-term cardiovascular risk and cannot diagnose or rule out an acute medical condition. Do not delay clinical assessment to obtain a risk score.",
    };
  if (EVENT_HISTORY.some(([key]) => a[key] === "Yes"))
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
  if (a.verified === "No")
    return {
      status: "unverified",
      title: "Information not verified",
      message:
        "Confirm that the information is sufficient and verified before continuing.",
    };
  if (
    !SCREENING_KEYS.every(
      (key) => a[key] === (key === "verified" ? "Yes" : "No"),
    )
  )
    return {
      status: "incomplete",
      title: "Eligibility check incomplete",
      message:
        "Complete every safety and previous cardiovascular-history question before continuing.",
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
    screening.version === SCREENING_VERSION &&
    !!screening.answers &&
    Object.keys(screening.answers).length === SCREENING_KEYS.length &&
    screeningDecision(screening.answers, years).status === "eligible"
  );
}
