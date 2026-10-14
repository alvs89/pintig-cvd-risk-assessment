import type { AssessmentInputs } from "../types/domain";
export function deriveInputs(
  input: AssessmentInputs,
  previous?: AssessmentInputs | null,
): AssessmentInputs {
  const x = { ...input };
  const height = Number(x.height),
    weight = Number(x.weight);
  if (
    x.height !== "" &&
    x.weight !== "" &&
    Number.isFinite(height) &&
    Number.isFinite(weight) &&
    height > 0 &&
    weight > 0
  )
    x.bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
  else if (
    previous &&
    Number(previous.height) > 0 &&
    Number(previous.weight) > 0
  )
    x.bmi = "";
  if (x.alcoholUse === "No") {
    x.alcoholDays = "0";
    x.drinksPerDay = "0";
  }
  x.alcoholDrinks =
    x.alcoholDays !== undefined &&
    x.alcoholDays !== "" &&
    x.drinksPerDay !== undefined &&
    x.drinksPerDay !== ""
      ? (Number(x.alcoholDays) * Number(x.drinksPerDay)).toFixed(1)
      : "";
  x.activityMinutes =
    x.activityDays !== undefined &&
    x.activityDays !== "" &&
    x.activityPerDay !== undefined &&
    x.activityPerDay !== ""
      ? String(Math.round(Number(x.activityDays) * Number(x.activityPerDay)))
      : "";
  return x;
}
