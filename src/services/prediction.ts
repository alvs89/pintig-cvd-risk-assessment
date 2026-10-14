import type {
  AssessmentInputs,
  Factor,
  Patient,
  Prediction,
  PredictionService,
} from "../types/domain";
import { age } from "../utils/format";
export const PREDICTION_VERSION = "ILLUSTRATIVE-0.2";
export function simulate(x: AssessmentInputs, p: Patient): Prediction {
  let bmi = +x.bmi,
    years = age(p.dob),
    parts: Factor[] = [
      ["Age", (years - 45) * 0.0024],
      ["Systolic blood pressure", (+x.sbp - 120) * 0.0007],
      ["Body mass index", (bmi - 24) * 0.001],
      ["Current smoking", x.currentSmoking === "Yes" ? 0.034 : 0],
      ["Antihypertensive medication history", x.bpMeds === "Yes" ? 0.014 : 0],
    ];
  if (x.mode === "extended") {
    if (x.activityMinutes !== "")
      parts.push([
        "Weekly activity",
        +x.activityMinutes < 150
          ? 0.012
          : +x.activityMinutes >= 300
            ? -0.008
            : 0,
      ]);
    if (x.alcoholDrinks !== "")
      parts.push([
        "Weekly alcohol intake",
        Math.max(0, +x.alcoholDrinks - 7) * 0.00075,
      ]);
    if (x.family === "Yes") parts.push(["Family history", 0.009]);
    if (x.education === "Primary" || x.education === "No formal education")
      parts.push(["Educational attainment", 0.006]);
  }
  let risk = Math.max(
    0.008,
    Math.min(
      0.35,
      0.033 +
        parts.reduce((a, z) => a + z[1], 0) +
        (p.sex === "Male" ? 0.008 : 0),
    ),
  );
  return {
    risk,
    bmi,
    parts: parts.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])),
  };
}
export const illustrativePredictor: PredictionService = {
  version: PREDICTION_VERSION,
  status: "illustrative",
  predict: simulate,
};
