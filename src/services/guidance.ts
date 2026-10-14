import type { AssessmentInputs, Guidance, Patient } from "../types/domain";
export const GUIDANCE_VERSION = "GUIDE-RULES-1.0";
export function generateGuidance(x: AssessmentInputs, p: Patient): Guidance[] {
  const items: Guidance[] = [];
  const add = (
    id: string,
    title: string,
    trigger: string,
    steps: string,
    priority: Guidance["priority"] = "standard",
  ) => items.push({ id, title, trigger, steps, priority });
  const sbp = Number(x.sbp),
    dbp = Number(x.dbp),
    bmi = Number(x.bmi);
  if (sbp >= 180 || dbp >= 120) {
    add(
      "BP-URGENT",
      "Repeat and escalate markedly elevated blood pressure",
      `Recorded blood pressure ${sbp}/${dbp} mmHg`,
      "Repeat the measurement after ensuring correct cuff size and technique. Arrange prompt clinician assessment according to the facility protocol. If the patient has chest pain, severe shortness of breath, new neurological symptoms, or other acute symptoms, follow emergency response procedures.",
      "priority",
    );
  } else if (sbp >= 140 || dbp >= 90) {
    add(
      "BP-REVIEW",
      "Arrange blood pressure review",
      `Recorded blood pressure ${sbp}/${dbp} mmHg`,
      "Repeat the measurement after a seated rest, document both readings, and arrange follow-up with a qualified healthcare professional to evaluate persistently elevated measurements.",
      "priority",
    );
  } else if (sbp >= 130 || dbp >= 80) {
    add(
      "BP-MONITOR",
      "Monitor blood pressure",
      `Recorded blood pressure ${sbp}/${dbp} mmHg`,
      "Review measurement technique and encourage repeat measurements at subsequent visits. Discuss reducing excess sodium and maintaining regular physical activity where appropriate.",
    );
  }
  if (x.currentSmoking === "Yes")
    add(
      "TOBACCO",
      "Offer smoking-cessation support",
      "Current smoking: Yes",
      "Ask about readiness to quit, offer brief cessation counselling, help identify a quit date when the patient is ready, and discuss locally available tobacco-cessation services.",
      "priority",
    );
  if (x.bpMeds === "Yes")
    add(
      "MED-REVIEW",
      "Review existing blood pressure treatment",
      "Blood pressure medication: Yes",
      "Confirm that the medication list is accurate and encourage a clinician-led review of adherence, side effects, and recorded blood pressure. Do not change medication or doses using this assessment.",
    );
  if (bmi >= 25)
    add(
      "BMI",
      "Discuss weight-related lifestyle support",
      `Recorded BMI: ${bmi.toFixed(1)} kg/m²`,
      "Discuss achievable eating and activity habits that fit the patient’s circumstances, and arrange a broader nutritional assessment where appropriate. Avoid treating BMI alone as a diagnosis.",
    );
  if (x.mode === "extended") {
    const activity = x.activityMinutes === "" ? NaN : Number(x.activityMinutes),
      drinks = x.alcoholDrinks === "" ? NaN : Number(x.alcoholDrinks);
    if (Number.isFinite(activity) && activity < 150)
      add(
        "ACTIVITY",
        "Build a sustainable activity routine",
        `Physical activity: ${activity} minutes/week`,
        "Ask about mobility and current activity, then discuss a gradual increase in suitable moderate-intensity activities such as walking. A commonly used adult goal is 150 minutes weekly when clinically appropriate.",
      );
    if (Number.isFinite(drinks) && drinks > 0)
      add(
        "ALCOHOL",
        "Review alcohol consumption",
        `Reported alcohol: ${drinks} drinks/week`,
        "Discuss current drinking patterns and opportunities to reduce intake. Avoid recommending alcohol for cardiovascular protection. Offer additional support if controlling intake is difficult.",
      );
    if (x.saltFrequency === "Often" || x.processedFood === "Often")
      add(
        "DIET-SALT",
        "Review salty and processed foods",
        "Frequent use of salty condiments or processed foods",
        "Discuss practical ways to reduce added salt and compare packaged food labels. Consider a dietitian-led assessment if appropriate.",
      );
    if (x.fruitVeg !== "" && Number(x.fruitVeg) < 3)
      add(
        "DIET-PRODUCE",
        "Discuss fruit and vegetable intake",
        `Reported intake: ${x.fruitVeg} servings/day`,
        "Ask about access and preferences, then discuss affordable ways to add fruits and vegetables to regular meals.",
      );
    if (x.family === "Yes")
      add(
        "FAMILY",
        "Review cardiovascular family history",
        "Family history of CVD: Yes",
        "Clarify which relatives were affected and the approximate ages at diagnosis, then discuss whether additional clinician-led cardiovascular evaluation is appropriate.",
      );
  }
  if (!items.length)
    add(
      "PREVENTION",
      "Continue preventive risk-factor reviews",
      "No additional rule thresholds triggered",
      "Continue routine assessment of blood pressure, tobacco exposure, activity, diet and other applicable risk factors at future healthcare visits.",
    );
  return items;
}
