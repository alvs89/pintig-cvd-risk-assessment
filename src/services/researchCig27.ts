import type { Patient, Result } from '../types/domain';
import { derive27, INTAKE27_SCHEMA } from './assessment27';
import { isFictionalIntakePatient, type ResearchCif } from './researchCig';
import { MODEL27, MODEL27_SHA256, TRANSFORM27 } from './research27Contract.mjs';
export const RESEARCH_CIG27_ENDPOINT = '/research-cig-27';
export interface Research27Request {
  researchOnly: true; modelVersion: string; modelSha256: string; transformVersion: string;
  features: Record<string, number | string | null>;
  ses: { education_category: number; income_band: number; income_supported_people: number };
}
export function research27Compatibility(patient: Patient, result: Result): { request: Research27Request | null; reasons: string[] } {
  const reasons: string[] = [];
  if (!isFictionalIntakePatient(patient) || result.pid !== patient.id) return { request: null, reasons: ['Research inference is limited to the recorded fictional assessment profiles.'] };
  const snapshot=result.researchQuestionnaire;
  if (!snapshot || snapshot.schema !== INTAKE27_SCHEMA || snapshot.age !== result.ageAtAssessment)
    return { request: null, reasons: ['This assessment has no matching 27-predictor questionnaire snapshot. Complete a new questionnaire to review compatibility.'] };
  const derived=derive27(snapshot.answers,patient);
  if (derived.features.age_years !== snapshot.age) reasons.push('The patient profile age has changed since this assessment. Complete a new assessment.');
  if (derived.issues.length) reasons.push('Correct invalid or inconsistent questionnaire responses before requesting a research graph.');
  if (derived.incomplete.length) reasons.push(`${derived.incomplete.length} required questionnaire responses are missing.`);
  const missing=Object.entries(derived.features).filter(([k,v])=>v==null&&k!=='ses_index_0_100').map(([k])=>k.replaceAll('_',' '));
  if(missing.length)reasons.push(`Unavailable model inputs: ${missing.join(', ')}.`);
  // Audit 2026-11-05: names and nominal ranges match, transformations do not.
  // Never bypass these blockers by substituting the experimental column or zero.
  reasons.push('SES cannot be matched: the saved model uses PCA and income representative amounts from a synthetic reference; the questionnaire retains income ranges and has no compatible SES score.');
  reasons.push('Diet scoring differs: the questionnaire weights grain portions, while the model training generator used unweighted grain frequencies.');
  reasons.push('Smoking and passive-exposure transformations have unresolved differences in rounding, caps and duration definitions. A verified model-compatible transformation is required.');
  return { request:null,reasons };
}
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
export function verifyResearchCif27(input:unknown):ResearchCif|null {
  if(!record(input)||input.schemaVersion!=='research-27p-cif-v1'||input.modelVersion!==MODEL27||input.modelSha256!==MODEL27_SHA256||input.transformVersion!==TRANSFORM27||input.researchOnly!==true||input.outcomeId!=='recorded-cvd-proxy'||input.competingEvent!=='death-before-recorded-cvd-cause-unverified'||input.numberOfTrees!==200||input.curveSource!=='all-model-event-times-step-cif'||!finite(input.risk10)||input.risk10<0||input.risk10>1||!record(input.cif))return null;
  const c=input.cif;
  if(c.timeUnit!=='days'||c.daysPerYear!==365.25||c.supportedUntil!==3652.5||c.probabilityUnit!=='fraction'||!Array.isArray(c.times)||!Array.isArray(c.probabilities)||c.times.length!==c.probabilities.length||c.times.length<2||c.times.length>20000)return null;
  const points:ResearchCif['points']=[];
  let last=-1,prob=-1;
  for(let i=0;i<c.times.length;i++) {
    const t=c.times[i],p=c.probabilities[i];
    if(!finite(t)||!finite(p)||t<0||t>3652.5||t<=last||p<0||p>1||p<prob)return null;
    if(i===0&&(t!==0||p!==0))return null;
    points.push({year:t/365.25,probability:p});last=t;prob=p;
  }
  if(last!==3652.5||Math.abs(prob-input.risk10)>1e-12)return null;
  const annual=Array.from({length:10},(_,i)=>({year:i+1,probability:points.filter(p=>p.year<=i+1).at(-1)!.probability}));
  return {risk:input.risk10,points,annual};
}
export function firstThresholdCrossing(curve:ResearchCif,threshold:number) {
  return curve.points.find(p=>p.probability>=threshold) ?? null;
}
