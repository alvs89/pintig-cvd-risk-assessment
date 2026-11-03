"""Read-only dataset finalization; reuse the recovery outputs and existing validators.
Run: python analysis/scripts/reconstruction_26/finalize_recovered.py
Optional --report-version NAME creates a fresh audit, never duplicate datasets.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path
import numpy as np
import pandas as pd
from build import ROOT, HERE, META, validate, digest

ap=argparse.ArgumentParser()
ap.add_argument('--report-version',default='finalization_v1')
args=ap.parse_args()
assert args.report_version.replace('_','').isalnum()
version='questionnaire_26_outcome_recovered_20261101_v1'
data=ROOT/'data/processed'/version
oldreport=ROOT/'analysis/reports'/version
report=oldreport/args.report_version
if report.exists(): raise FileExistsError('Choose a new report version; never overwrite prior audits')
protected={}
for directory in ['data','analysis/results','analysis/modeling','analysis/reports','src','legacy']:
    for p in (ROOT/directory).rglob('*'):
        if p.is_file(): protected[p.relative_to(ROOT).as_posix()]=digest(p)

def read(p):
    d=pd.read_csv(p)
    assert d.participant_id.notna().all() and d.participant_id.is_unique
    return d.sort_values('participant_id').reset_index(drop=True)

original=ROOT/'data/processed/questionnaire_26_20261101_v1'
proxyfile=data/'pintig_framingham_26predictors_PROXY_EXPERIMENTAL.csv'
exactfile=data/'pintig_framingham_26predictors_exact_endpoint.csv'
proxy=read(proxyfile);exact=read(exactfile)
reconstruction=read(original/'pintig_framingham_26predictors_provisional.csv')
frozen=read(ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv')
base=read(ROOT/'data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv')
features=json.loads((ROOT/'analysis/results/v4_corrected_20261031_v1/configurations.json').read_text())['n26']
assert list(proxy.columns)==features+META and proxy.shape==(4191,32)
pd.testing.assert_frame_equal(exact,reconstruction)
pd.testing.assert_frame_equal(proxy[features],reconstruction[features])
pd.testing.assert_frame_equal(proxy[META],frozen[META])
assert proxy[META].notna().all().all()
assert exact[META[1:5]].isna().all().all()
assert proxy.event_type.value_counts().to_dict()=={0:3604,1:369,2:218}
assert proxy.outer_fold.value_counts().sort_index().tolist()==[839,838,838,838,838]
np.testing.assert_array_equal(proxy.event_major_cvd_10y,proxy.event_type.eq(1))
np.testing.assert_array_equal(proxy.event_competing_death_10y,proxy.event_type.eq(2))
raw=pd.read_csv(ROOT/'data/raw/framingham.csv')
baseline=raw.loc[raw.PERIOD==1]
assert baseline.RANDID.is_unique
b=baseline.set_index('RANDID').loc[proxy.participant_id].reset_index()
t=np.minimum(np.minimum(b.TIMECVD,b.TIMEDTH),3652.5)
e=np.where((b.CVD==1)&(b.TIMECVD<=3652.5)&(b.TIMECVD<=b.TIMEDTH),1,
           np.where((b.DEATH==1)&(b.TIMEDTH<=3652.5),2,0))
np.testing.assert_array_equal(t,proxy.analysis_time_days)
np.testing.assert_array_equal(e,proxy.event_type)
q=read(original/'SIMULATED_questionnaire_responses_reference_20261101.csv')
np.testing.assert_array_equal(q.participant_id,proxy.participant_id)
# Existing validator checks raw observations, first22, questionnaire derivations, folds and exact-endpoint NAs.
checks=validate(exact,q,base,b,features)
metadata=json.loads((oldreport/'proxy_metadata.json').read_text())
assert all(digest(data/name)==h for name,h in metadata['sha256'].items())
report.mkdir()
(report/'protected_sha256.json').write_text(json.dumps(protected,indent=2))
commands=[ [sys.executable,'-m','unittest','discover','-s','analysis/scripts/reconstruction_26','-p','test_build.py','-v'],
 ['C:/Program Files/R/R-4.6.1/bin/Rscript.exe',str(HERE/'smoke_test_proxy.R')] ]
for name,cmd in zip(['questionnaire_tests','rsf_smoke_test'],commands):
    result=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True)
    (report/f'{name}.log').write_text(result.stdout+'\n'+result.stderr,encoding='utf-8')
    if result.returncode: raise RuntimeError(f'{name} failed; see saved log')
    if name=='rsf_smoke_test': assert 'SMOKE_TEST_PASS' in result.stdout
dictionary=pd.read_csv(ROOT/'analysis/reports/questionnaire_26_20261101_v1/pintig_26predictors_data_dictionary.csv').fillna('')
definitions={
 'analysis_time_days':'Historical min(TIMECVD,TIMEDTH,3652.5); recorded-CVD/death/censoring proxy time in days',
 'event_type':'0=censored; 1=recorded CVD by horizon before or tied with death; 2=all-cause death before recorded CVD by horizon, cause unverified',
 'event_major_cvd_10y':'Legacy column name: 1 iff event_type=1; recorded-CVD proxy, not verified full major-CVD endpoint',
 'event_competing_death_10y':'Legacy column name: 1 iff event_type=2; death-before-CVD proxy, NOT confirmed non-CVD death'}
for field,definition in definitions.items():
    ix=dictionary.column.eq(field)
    for key,value in {'definition':definition,'provenance':'derived historical proxy from observed records',
        'source':'frozen v3; independently reproduced from raw CVD/TIMECVD/DEATH/TIMEDTH',
        'encoding':'0-3652.5 days' if field=='analysis_time_days' else '0/1/2' if field=='event_type' else '0/1',
        'missing_handling':'No imputation; complete historical proxy; exact-endpoint counterpart remains NA',
        'limitations':'Not the exact MI/stroke/HF/CV-death endpoint; death cause unverified; exclude from predictor matrix'}.items():
        dictionary.loc[ix,key]=value
dictionary.loc[dictionary.column.isin(['participant_id','outer_fold']),'limitations']='Exclude from predictor matrix; retain exact source linkage and frozen folds'
dictionary.to_csv(report/'pintig_26predictors_PROXY_data_dictionary.csv',index=False)
assert all(digest(ROOT/p)==h for p,h in protected.items())
result={'status':'PASS','csv_paths':[str(proxyfile),str(exactfile)],'participants':4191,'columns':32,
 'event_counts':{'recorded_cvd_proxy':369,'death_before_cvd_cause_unknown':218,'censored':3604},
 'missing_proxy_survival_values':0,'duplicate_participants':0,'outcome_discrepancies':0,
 'all_26_predictors_and_folds_preserved':True,'raw_observed_predictors_unchanged':True,
 'exact_endpoint_all_four_fields_missing':True,'existing_validator':checks,
 'questionnaire_tests':'7 passed','RSF_smoke_test':'PASS; 650 training records, 40 trees, 20 held-out predictions',
 'leakage':'No new predictor construction or outcome-conditioned imputation; recovery only restores outcomes by verified ID. Six inherited synthetic recipes remain unresolved, so their original leakage status cannot be certified.',
 'protected_files_unchanged':len(protected),'commands_executed':commands,
 'sha256':{p.name:digest(p) for p in [proxyfile,exactfile]},'full_model_evaluation':'Not performed'}
(report/'validation.json').write_text(json.dumps(result,indent=2))
(report/'PINTIG_26PREDICTOR_FINAL_VALIDATION.md').write_text('''# Final recovered dataset verification

Existing CSVs reused unchanged; no duplicate dataset generated. Each has 4,191 unique participants and 32 columns.
All 26 features, including four questionnaire-informed additions, equal the reconstruction exactly.
Proxy outcomes and folds equal frozen v3 for every ID and independently match raw event construction.
Counts: 369 recorded-CVD proxy events, 218 all-cause deaths before recorded CVD (cause unknown), 3,604 censored.
No missing proxy outcomes, duplicated IDs, inconsistent event indicators or modified observed predictors.
All four exact-endpoint outcome columns remain missing in the separate exact-endpoint CSV.

Existing questionnaire validation and seven unit tests passed. Existing R compatibility smoke test passed:
650 training participants, 40 trees, 20 held-out predictions, finite bounded competing-risk CIFs.
Imputation uses only the outer training partition; the subsequent 650-record subsample is for the smoke test.
This is not nested CV or a performance evaluation. No AUC/Brier/IBS/calibration metrics were recalculated.
For subsequent experiments reuse corrected horizon handling and fold-specific preprocessing/tuning.

Ready for the next explicitly labeled provisional recorded-CVD/death-before-CVD competing-risk experiment.
Not evidence of a verified MI/stroke/HF/CV-death composite or confirmed non-CVD competing deaths.
The legacy outcome column names are compatibility names; use the updated proxy dictionary.
Sixteen predictors remain simulated. No new outcome leakage is introduced by the ID-matched restoration;
the original recipes of six inherited synthetic predictors remain unresolved and cannot be certified leakage-free.
No Philippine external validation or clinical superiority is established.

The original generation script recover_proxy_outcomes.py is preserved. Its overwrite guard was respected;
this finalization script reuses existing validation functions and verifies existing files instead of regenerating them.
See validation.json for commands, hashes and results, and rsf_smoke_test.log for actual R output.
''',encoding='utf-8')
print(json.dumps(result,indent=2))
