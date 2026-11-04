"""Prepare a new, immutable run for the questionnaire-aligned RSF experiment."""
from pathlib import Path
import hashlib, json
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
VERSION = 'rsf27_questionnaire_aligned_proxy_20261103_v3'
OUT = ROOT / 'analysis' / 'results' / VERSION
DATA = ROOT / 'data' / 'processed' / 'questionnaire_27_questionnaire_aligned_20261103_v1' / 'pintig_framingham_27predictors_QUESTIONNAIRE_ALIGNED_PROXY_EXPERIMENTAL.csv'
PREDICTORS = ['age_years','sex_male','ses_index_0_100','urban_rural_residence','waist_cm','hip_circumference_cm','sbp_mmhg','dbp_mmhg','heart_rate_bpm','hypertension_history','bp_medication','diabetes','diabetes_medication','lipid_lowering_medication','family_history_cvd','alcohol_ethanol_g_week','heavy_episodic_alcohol','smoking_status','smoking_pack_years','current_smoking_intensity_cigs_day','passive_smoking_childhood','passive_smoking_adult_years','activity_min_week','sitting_minutes_day','diet_score_0_100','psychosocial_stress','sleep_duration_hours']
META = ['participant_id','analysis_time_days','event_type','event_major_cvd_10y','event_competing_death_10y','outer_fold']

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    if OUT.exists(): raise FileExistsError(f'{OUT} already exists; create a new version rather than overwrite')
    d = pd.read_csv(DATA).sort_values('participant_id').reset_index(drop=True)
    if list(d.columns) != PREDICTORS + META or d.shape != (4191,33) or not d.participant_id.is_unique: raise ValueError('Dataset schema invalid')
    frozen = pd.read_csv(ROOT / 'data' / 'processed' / 'pintig_frozen_clean_analysis_v3_16predictors.csv').sort_values('participant_id').reset_index(drop=True)
    pd.testing.assert_frame_equal(d[META], frozen[META])
    if d.event_type.value_counts().to_dict() != {0:3604,1:369,2:218}: raise ValueError('Proxy event counts changed')
    inner = pd.read_csv(ROOT / 'analysis' / 'modeling' / 'v3_16predictors' / 'v3_inner_fold_assignments.csv')
    for k in range(1,6):
        expected = set(d.loc[d.outer_fold.ne(k),'participant_id'])
        found = set(inner.loc[inner.outer_fold.eq(k),'participant_id'])
        if expected != found: raise ValueError(f'Inner fold mismatch {k}')
    OUT.mkdir(parents=True)
    admin = d.event_type.eq(0) & d.analysis_time_days.eq(3652.5)
    (OUT/'predictors.json').write_text(json.dumps(PREDICTORS,indent=2))
    pd.DataFrame({'participant_id':d.participant_id,'complete_at_tau':admin.astype(int),'evaluation_time_days':d.analysis_time_days.where(~admin,3653.5)}).to_csv(OUT/'evaluation_followup_view.csv',index=False)
    protocol = {
      'input':str(DATA.relative_to(ROOT)),'input_sha256':digest(DATA),'seed':27110317,
      'endpoint':'Recorded CVD; competing death before recorded CVD, cause unknown.',
      'population':'4191 Framingham baseline records; 27 questionnaire-aligned synthetic predictors with preserved observed measurements.',
      'folds':'Frozen participant-level 5 outer × 3 inner folds; identical to previous proxy experiments.',
      'preprocessing':'PCA-based SES is fitted within every training split and applied to its validation split. Smoking/current intensity and observed missing values are also imputed from each training split only. Questionnaire-response generation was completed before splitting and uses no outcomes, times, or folds.',
      'selection':'Minimum mean inner IPCW 10-year Brier score; candidate hyperparameters evaluated within inner folds.',
      'model':'Competing-risk random survival forest: splitrule logrankCR, cause 1.',
      'deployment_approved':False,
      'prohibitions':['Research proxy model only','No clinical use','No exact major-CVD/non-CVD-death claim','No Philippine validation'],
    }
    (OUT/'protocol.json').write_text(json.dumps(protocol,indent=2))
    (OUT/'data_validation.json').write_text(json.dumps({'status':'PASS','participants':4191,'columns':33,'event_counts':{'censored':3604,'recorded_cvd_proxy':369,'death_before_recorded_cvd_proxy':218},'metadata_matches_frozen':True,'folds_verified':True,'dataset_sha256':digest(DATA)},indent=2))
    print(json.dumps({'status':'PASS','out':str(OUT)},indent=2))

if __name__ == '__main__': main()
