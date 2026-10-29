export const assessmentLabels: Record<string, string> = {
  pid: "Patient record",
  prior: "Previous major cardiovascular event",
  verified: "Information verified",
  sbp: "Systolic blood pressure",
  dbp: "Diastolic blood pressure",
  height: "Height",
  weight: "Weight",
  bmi: "Body mass index",
  waist: "Waist circumference",
  currentSmoking: "Current cigarette smoking",
  bpMeds: "Hypertension medication",
  diabetesHistory: "Diabetes history (supplemental)",
  pastBpMeds: "Previous blood pressure medication (supplemental)",
  mode: "Assessment information",
  alcoholUse: "Alcohol use",
  alcoholDays: "Drinking days per week",
  drinksPerDay: "Drinks per drinking day",
  alcoholDrinks: "Alcohol intake per week",
  activityDays: "Moderate activity days per week (supplemental/adapted)",
  activityPerDay: "Activity minutes per active day (supplemental/adapted)",
  activityMinutes: "Activity minutes per week (supplemental/adapted)",
  walkingPace: "Normal walking pace outdoors",
  fruitVeg: "Fruit and vegetable servings per day (supplemental)",
  wholeGrain: "Whole-grain servings per day (supplemental)",
  saltFrequency: "Added salt (supplemental)",
  processedFood: "Processed foods (supplemental)",
  family: "Family cardiovascular history (supplemental)",
  education: "Highest degree or level of school completed",
  employment: "Current employment status",
  ageAtAssessment: "Age at assessment",
  smoking: "Smoking status",
  diabetes: "History of diabetes",
};
export function displayAssessmentValue(
  key: string,
  value: string,
  record: string,
): string {
  if (key === "pid") return record;
  if (value === "") return "Not recorded";
  if (key === "bpMeds")
    return value === "Yes"
      ? "Yes, now"
      : value === "Past"
        ? "Yes, not now"
        : value;
  if (key === "mode")
    return value === "extended"
      ? "Clinical and lifestyle information"
      : "Clinical information";
  const units: Record<string, string> = {
    sbp: "mmHg",
    dbp: "mmHg",
    height: "cm",
    weight: "kg",
    waist: "cm",
    bmi: "kg/m²",
    ageAtAssessment: "years",
  };
  return units[key] ? value + " " + units[key] : value;
}
