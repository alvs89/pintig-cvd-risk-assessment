"""Read-only integrity checks for the questionnaire-aligned synthetic dataset."""
from pathlib import Path
import hashlib, json
import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parents[3]
DATA=ROOT/'data/processed/questionnaire_27_questionnaire_aligned_20261103_v1/pintig_framingham_27predictors_QUESTIONNAIRE_ALIGNED_PROXY_EXPERIMENTAL.csv'
SOURCE=ROOT/'data/processed/questionnaire_27_engineered_20261103_v1/pintig_framingham_27predictors_ENGINEERED_PROXY_EXPERIMENTAL.csv'
RAW=ROOT/'data/raw/framingham.csv'
PREDICTORS=list(pd.read_csv(SOURCE,nrows=0).columns[:27]);META=['participant_id','analysis_time_days','event_type','event_major_cvd_10y','event_competing_death_10y','outer_fold']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
d=pd.read_csv(DATA).sort_values('participant_id').reset_index(drop=True);s=pd.read_csv(SOURCE).sort_values('participant_id').reset_index(drop=True)
assert d.shape==(4191,33) and list(d)==PREDICTORS+META and d.participant_id.is_unique
pd.testing.assert_frame_equal(d[META],s[META])
assert d.event_type.value_counts().to_dict()=={0:3604,1:369,2:218}
assert d.event_major_cvd_10y.eq(d.event_type.eq(1).astype(int)).all()
assert d.event_competing_death_10y.eq(d.event_type.eq(2).astype(int)).all()
assert d.outer_fold.isin([1,2,3,4,5]).all()
raw=pd.read_csv(RAW,usecols=['RANDID','PERIOD','SEX','AGE','SYSBP','DIABP','HEARTRTE','DIABETES','BPMEDS','HYPERTEN','CURSMOKE','CIGPDAY']).query('PERIOD == 1').set_index('RANDID').loc[d.participant_id].reset_index()
for feature,source in {'age_years':'AGE','sbp_mmhg':'SYSBP','dbp_mmhg':'DIABP','heart_rate_bpm':'HEARTRTE','hypertension_history':'HYPERTEN','bp_medication':'BPMEDS','diabetes':'DIABETES'}.items():np.testing.assert_allclose(d[feature],raw[source],equal_nan=True,rtol=0,atol=0)
np.testing.assert_array_equal(d.sex_male,raw.SEX.eq(1).astype(int))
np.testing.assert_allclose(d.current_smoking_intensity_cigs_day,raw.CIGPDAY.where(raw.CURSMOKE.eq(1),0),equal_nan=True,rtol=0,atol=0)
print(json.dumps({'status':'PASS','dataset_sha256':sha(DATA),'participants':4191,'columns':33,'observed_baseline_measurements_preserved':True,'outcomes_and_folds_match_recovered_source':True,'event_counts':{'censored':3604,'recorded_cvd_proxy':369,'death_before_recorded_cvd_proxy':218}},indent=2))
