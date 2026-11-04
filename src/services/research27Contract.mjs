// Frozen research inference contract. The live FE-1.3 questionnaire is not equivalent.
export const MODEL27 = 'rsf27-questionnaire-aligned-proxy-20261103-v3';
export const MODEL27_SHA256 = 'f1c95bc1f4e43890475f8b38cb092995e79c29ccb0deb439f160962606091d34';
export const TRANSFORM27 = 'rsf27-training-definitions-v3';
export const PREDICTORS27 = ['age_years','sex_male','ses_index_0_100','urban_rural_residence','waist_cm','hip_circumference_cm','sbp_mmhg','dbp_mmhg','heart_rate_bpm','hypertension_history','bp_medication','diabetes','diabetes_medication','lipid_lowering_medication','family_history_cvd','alcohol_ethanol_g_week','heavy_episodic_alcohol','smoking_status','smoking_pack_years','current_smoking_intensity_cigs_day','passive_smoking_childhood','passive_smoking_adult_years','activity_min_week','sitting_minutes_day','diet_score_0_100','psychosocial_stress','sleep_duration_hours'];
export function validateResearch27Request(body) {
  if (!body || body.modelVersion !== MODEL27 || body.modelSha256 !== MODEL27_SHA256 || body.transformVersion !== TRANSFORM27 || body.researchOnly !== true)
    return 'The request does not match the saved 27-predictor model and transformation contract.';
  const f=body.features;
  if (!f || Object.keys(f).length!==27 || PREDICTORS27.some(k=>!Object.hasOwn(f,k))) return 'Exactly 27 defined predictor fields are required.';
  if (!['Never','Former','Current'].includes(f.smoking_status)) return 'Smoking status is missing or incompatible.';
  for(const key of PREDICTORS27.filter(k=>!['smoking_status','ses_index_0_100'].includes(k)))
    if(typeof f[key]!=='number'||!Number.isFinite(f[key]))return `Missing or invalid predictor: ${key}.`;
  // SES must be computed with the saved training PCA/ECDF, never supplied as a placeholder.
  if(f.ses_index_0_100!==null)return 'SES must be derived from source responses with the saved reference.';
  const s=body.ses;
  if(!s||!Number.isInteger(s.education_category)||s.education_category<0||s.education_category>8||!Number.isInteger(s.income_band)||s.income_band<0||s.income_band>5||!Number.isInteger(s.income_supported_people)||s.income_supported_people<1||s.income_supported_people>100)return 'Complete compatible education, income and supported-person responses are required.';
  for(const key of ['sex_male','urban_rural_residence','hypertension_history','bp_medication','diabetes','diabetes_medication','lipid_lowering_medication','family_history_cvd','heavy_episodic_alcohol','passive_smoking_childhood','psychosocial_stress'])if(![0,1].includes(f[key]))return `Invalid binary predictor: ${key}.`;
  if(f.age_years<35||f.age_years>70||f.sbp_mmhg<=f.dbp_mmhg||f.dbp_mmhg<=0||f.waist_cm<=0||f.hip_circumference_cm<=0||f.heart_rate_bpm<=0)return 'Measurements or age are outside the supported assessment contract.';
  for(const key of ['alcohol_ethanol_g_week','smoking_pack_years','current_smoking_intensity_cigs_day','passive_smoking_adult_years','activity_min_week','sitting_minutes_day','diet_score_0_100','sleep_duration_hours'])if(f[key]<0)return `Invalid negative predictor: ${key}.`;
  if(f.diet_score_0_100>100||f.sleep_duration_hours>24||f.sitting_minutes_day>1440||f.passive_smoking_adult_years>f.age_years-18)return 'Duration or score is outside its valid range.';
  if(f.smoking_status!=='Current'&&f.current_smoking_intensity_cigs_day!==0)return 'Noncurrent smoking intensity must be zero.';
  if(f.smoking_status==='Never'&&f.smoking_pack_years!==0)return 'Never-smoking exposure must be zero.';
  return null;
}
