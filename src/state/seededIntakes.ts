import type { AssessmentInputs } from "../types/domain";
import { deriveInputs } from "../services/intake";

// Fictional new-intake fixtures only. No model output or historical observations.
const common: AssessmentInputs = {
  prior: "No",
  verified: "Yes",
  pastBpMeds: "No",
  mode: "extended",
};
const intakes: Record<number, AssessmentInputs> = {
  1: {
    ...common,
    sbp: "156",
    dbp: "94",
    height: "168",
    weight: "82",
    waist: "102",
    currentSmoking: "Yes",
    bpMeds: "Yes",
    diabetesHistory: "Yes",
    alcoholUse: "Yes",
    alcoholDays: "2",
    drinksPerDay: "2",
    activityDays: "2",
    activityPerDay: "25",
    walkingPace: "Slow",
    fruitVeg: "2",
    wholeGrain: "1",
    saltFrequency: "Often",
    processedFood: "Often",
    family: "Yes",
    education: "Secondary",
    employment: "Self-employed",
  },
  2: {
    ...common,
    sbp: "138",
    dbp: "86",
    height: "159",
    weight: "67",
    waist: "88",
    currentSmoking: "No",
    bpMeds: "No",
    diabetesHistory: "No",
    alcoholUse: "No",
    alcoholDays: "0",
    drinksPerDay: "0",
    activityDays: "3",
    activityPerDay: "35",
    walkingPace: "Average",
    fruitVeg: "3",
    wholeGrain: "2",
    saltFrequency: "Sometimes",
    processedFood: "Sometimes",
    family: "Yes",
    education: "Tertiary",
    employment: "Employed",
  },
  3: {
    ...common,
    sbp: "118",
    dbp: "76",
    height: "173",
    weight: "70",
    waist: "80",
    currentSmoking: "No",
    bpMeds: "No",
    diabetesHistory: "No",
    alcoholUse: "No",
    alcoholDays: "0",
    drinksPerDay: "0",
    activityDays: "5",
    activityPerDay: "40",
    walkingPace: "Brisk",
    fruitVeg: "4",
    wholeGrain: "3",
    saltFrequency: "Rarely",
    processedFood: "Rarely",
    family: "No",
    education: "Vocational",
    employment: "Employed",
  },
};
export function seededIntake(patientId: number): AssessmentInputs | undefined {
  const input = intakes[patientId];
  return input ? deriveInputs({ ...input, pid: String(patientId) }) : undefined;
}
export function hasIntakeAnswers(draft: AssessmentInputs | null): boolean {
  return (
    !!draft &&
    Object.entries(draft).some(
      ([key, value]) => !["pid", "mode"].includes(key) && value !== "",
    )
  );
}
