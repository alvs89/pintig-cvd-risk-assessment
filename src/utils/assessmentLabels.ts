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
  currentSmoking: "Current smoking",
  bpMeds: "Current blood pressure medication",
  diabetesHistory: "History of diabetes",
  pastBpMeds: "Previous blood pressure medication",
  mode: "Assessment information",
  alcoholUse: "Alcohol use",
  alcoholDays: "Drinking days per week",
  drinksPerDay: "Drinks per drinking day",
  alcoholDrinks: "Alcohol intake per week",
  activityDays: "Active days per week",
  activityPerDay: "Activity minutes per day",
  activityMinutes: "Activity minutes per week",
  walkingPace: "Walking pace",
  fruitVeg: "Fruit and vegetable servings per day",
  wholeGrain: "Whole-grain servings per day",
  saltFrequency: "Added salt",
  processedFood: "Processed foods",
  family: "Family cardiovascular history",
  education: "Highest education",
  employment: "Employment status",
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
