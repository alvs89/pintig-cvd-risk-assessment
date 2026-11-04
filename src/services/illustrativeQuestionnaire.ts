import { BEVERAGES, QUESTIONS27, derive27, type Answers27 } from './assessment27';
import { educationCategory } from './featureProtocolV1';
import { simulate } from './prediction';
import { generateGuidance } from './guidance';
import { screeningForPatient, type PreAssessment } from './preAssessment';
import { SCREENING_VERSION } from './preAssessmentRules.mjs';
import { band } from '../utils/risk';
import { age } from '../utils/format';
import type { AssessmentInputs, Patient, Result } from '../types/domain';

export function measurementBmi(answers: Answers27): number | null {
  const height = Number(answers.illustrativeHeight), weight = Number(answers.illustrativeWeight);
  if (!answers.illustrativeHeight?.trim() || !answers.illustrativeWeight?.trim() ||
      !Number.isFinite(height) || !Number.isFinite(weight) || height < 110 || height > 220 || weight < 25 || weight > 250) return null;
  const bmi = Number((weight / (height / 100) ** 2).toFixed(1));
  return bmi >= 12 && bmi <= 65 ? bmi : null;
}

/** Current questionnaire guidance; no probability or saved snapshot is consulted. */
export function questionnaireGuidance(answers: Answers27, patient: Patient) {
  const derived = derive27(answers, patient);
  // Avoid presenting guidance from invalid or contradictory current answers.
  if (derived.issues.length) return [];
  const f = derived.features;
  let drinks = '';
  if (['Never used alcohol products', 'Formerly used alcohol products'].includes(answers.alcoholHistory)) drinks = '0';
  else if (f.alcohol_ethanol_g_week != null) {
    const factors: Record<string, number> = { Daily: 7, Weekly: 1, Monthly: 12 / 52 };
    drinks = BEVERAGES.reduce((sum, [id]) => sum + (answers['alc_' + id] === 'Selected' ? Number(answers['alc_' + id + '_quantity']) * factors[answers['alc_' + id + '_frequency']] : 0), 0).toFixed(1);
  }
  const rules = generateGuidance({
    sbp: f.sbp_mmhg == null ? '' : String(f.sbp_mmhg),
    dbp: f.dbp_mmhg == null ? '' : String(f.dbp_mmhg),
    bmi: measurementBmi(answers)?.toString() ?? '',
    currentSmoking: f.smoking_status === 'Current' ? 'Yes' : '',
    bpMeds: answers.bpMed === '1 = yes, now' ? 'Yes' : '',
    mode: 'extended', alcoholDrinks: drinks,
    activityMinutes: f.activity_min_week == null ? '' : String(Math.round(Number(f.activity_min_week))),
    family: f.family_history_cvd === 1 ? 'Yes' : '',
    fruitVeg: '', saltFrequency: '', processedFood: '',
  }, patient);
  // Missing answers are not evidence that no risk-factor thresholds apply.
  return rules.filter(rule => {
    if (rule.id.startsWith('BP-') && (f.sbp_mmhg == null || f.dbp_mmhg == null)) return false;
    if (rule.id === 'PREVENTION' && (derived.incomplete.length || measurementBmi(answers) === null)) return false;
    return true;
  });
}

/** Explicit projection into ILLUSTRATIVE-0.2; never passes the RSF schema. */
export function illustrativeQuestionnaire(answers: Answers27, patient: Patient, screening: PreAssessment | null): Result {
  if (!screeningForPatient(screening, patient)) throw new Error('Complete the eligibility and safety check.');
  const derived = derive27(answers, patient);
  if (derived.issues.length) throw new Error('Correct the invalid questionnaire responses before calculating.');
  const f = derived.features;
  const bmi = measurementBmi(answers);
  if (bmi === null)
    throw new Error('Complete valid height and weight in the measurements section (calculated BMI must be 12–65 kg/m²).');
  const sbp = Number(f.sbp_mmhg), dbp = Number(f.dbp_mmhg);
  if (f.sbp_mmhg == null || f.dbp_mmhg == null || sbp < 70 || sbp > 260 || dbp < 40 || dbp > 160 || dbp >= sbp)
    throw new Error('Complete valid systolic and diastolic blood pressure measurements.');
  const smoking = f.smoking_status;
  if (!['Never', 'Former', 'Current'].includes(String(smoking))) throw new Error('Confirm current smoking status.');
  const medication = ({ '0 = no': 'No', '1 = yes, now': 'Yes', '2 = yes, not now': 'Past' } as Record<string,string>)[answers.bpMed];
  if (!medication) throw new Error('Confirm current hypertension-medication status.');
  if (derived.incomplete.length) {
    const question = QUESTIONS27.find(q => q.id === derived.incomplete[0]);
    throw new Error(`Complete all required applicable questions before calculating. ${derived.incomplete.length} unanswered. First unanswered question: ${question?.text ?? 'Review your responses.'}`);
  }
  let drinks = '';
  if (['Never used alcohol products', 'Formerly used alcohol products'].includes(answers.alcoholHistory)) drinks = '0';
  else if (f.alcohol_ethanol_g_week != null) {
    const factors: Record<string,number> = { Daily: 7, Weekly: 1, Monthly: 12 / 52 };
    drinks = BEVERAGES.reduce((sum, [id]) => sum + (answers['alc_' + id] === 'Selected' ? Number(answers['alc_' + id + '_quantity']) * factors[answers['alc_' + id + '_frequency']] : 0), 0).toFixed(1);
  }
  const education = educationCategory(answers);
  const x: AssessmentInputs = {
    pid: String(patient.id), prior: 'No', verified: 'Yes', mode: 'extended',
    sbp: String(sbp), dbp: String(dbp), bmi: String(bmi), height: answers.illustrativeHeight, weight: answers.illustrativeWeight,
    currentSmoking: smoking === 'Current' ? 'Yes' : 'No', bpMeds: medication,
    activityMinutes: f.activity_min_week == null ? '' : String(Math.round(Number(f.activity_min_week))),
    alcoholDrinks: drinks, family: f.family_history_cvd == null ? '' : f.family_history_cvd === 1 ? 'Yes' : 'No',
    education: education === 0 ? 'No formal education' : education === 1 ? 'Primary' : education != null ? 'Other' : '',
    fruitVeg: '', saltFrequency: '', processedFood: '',
    diabetesHistory: answers.diabetes ?? '', waist: f.waist_cm == null ? '' : String(f.waist_cm),
    questionnaireMapping: 'illustrative-questionnaire-v1',
  };
  const prediction = simulate(x, patient);
  return { ...prediction, inputs: x, pid: patient.id, ageAtAssessment: age(patient.dob), band: band(prediction.risk), saved: false, preAssessmentVersion: SCREENING_VERSION, guidanceRules: questionnaireGuidance(answers, patient) };
}
