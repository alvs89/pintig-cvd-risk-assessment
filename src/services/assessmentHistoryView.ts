import type { AssessmentInputs, AssessmentRecord } from "../types/domain";

/** The questionnaire's sections, with a separate fallback for legacy and future fields. */
export const HISTORY_QUESTION_SECTIONS = [
  {
    id: "patient",
    title: "Patient identification",
    keys: ["pid", "ageAtAssessment"],
  },
  {
    id: "eligibility",
    title: "Eligibility questions",
    keys: ["prior", "verified"],
  },
  {
    id: "measurements",
    title: "Clinic measurements",
    keys: ["sbp", "dbp", "height", "weight", "bmi", "waist"],
  },
  {
    id: "medical",
    title: "Smoking and medication history",
    keys: [
      "currentSmoking",
      "smoking",
      "bpMeds",
      "pastBpMeds",
      "diabetesHistory",
      "diabetes",
    ],
  },
  {
    id: "activity",
    title: "Alcohol consumption and physical activity",
    keys: [
      "mode",
      "alcoholUse",
      "alcoholDays",
      "drinksPerDay",
      "alcoholDrinks",
      "activityDays",
      "activityPerDay",
      "activityMinutes",
      "walkingPace",
    ],
  },
  {
    id: "diet",
    title: "Diet and nutrition",
    keys: ["fruitVeg", "wholeGrain", "saltFrequency", "processedFood"],
  },
  {
    id: "social",
    title: "Family and social history",
    keys: ["family", "education", "employment"],
  },
] as const;

export interface HistoryQuestionGroup {
  id: string;
  title: string;
  fields: { key: string; value: string }[];
}

/** Present exact saved values, including explicit unknowns and blank values.
 * Never infer missing historical answers or alter the original record.
 */
export function groupSavedQuestionnaire(
  inputs: AssessmentInputs,
): HistoryQuestionGroup[] {
  const seen = new Set<string>();
  const groups: HistoryQuestionGroup[] = [];
  for (const section of HISTORY_QUESTION_SECTIONS) {
    const fields: { key: string; value: string }[] = [];
    for (const key of section.keys) {
      if (!Object.prototype.hasOwnProperty.call(inputs, key)) continue;
      seen.add(key);
      fields.push({ key, value: inputs[key] });
    }
    if (fields.length)
      groups.push({ id: section.id, title: section.title, fields });
  }
  const additional = Object.entries(inputs)
    .filter(([key]) => !seen.has(key))
    .map(([key, value]) => ({ key, value }));
  if (additional.length)
    groups.push({
      id: "other",
      title: "Other recorded information",
      fields: additional,
    });
  return groups;
}

export function savedEstimateSource(record: AssessmentRecord) {
  if (record.model.startsWith("ILLUSTRATIVE")) {
    return {
      kind: "illustrative" as const,
      heading: "Illustrative estimate",
      message:
        "This estimate has not been clinically validated and should not be used for clinical decisions.",
      modelVersion: record.model,
    };
  }
  return {
    kind: "unverified-model" as const,
    heading: "Recorded model estimate",
    message:
      "The recorded model's clinical validation is unverified. Do not use this estimate for clinical decisions.",
    modelVersion: record.model,
  };
}

export function isLimitedLegacyAssessment(inputs: AssessmentInputs): boolean {
  return (
    !Object.prototype.hasOwnProperty.call(inputs, "prior") ||
    !Object.prototype.hasOwnProperty.call(inputs, "verified")
  );
}
