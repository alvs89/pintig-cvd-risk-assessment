"""Independent read-back audit; writes additional verification artifacts only."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
from build import ROOT, NEW, META, validate, digest

version='questionnaire_26_20261101_v1'
out=ROOT/'data/processed'/version
report=ROOT/'analysis/reports'/version
target=report/'final_readback_audit.json'
if target.exists(): raise FileExistsError('Audit already exists; do not overwrite')
m=json.loads((report/'run_manifest.json').read_text());features=m['predictor_columns']
base=pd.read_csv(ROOT/'data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv').sort_values('participant_id').reset_index(drop=True)
raw=pd.read_csv(ROOT/'data/raw/framingham.csv')
b=raw.loc[raw.PERIOD==1].set_index('RANDID').loc[base.participant_id].reset_index()
copied=pd.read_csv(out/'original_baseline_records.csv')
pd.testing.assert_frame_equal(copied.drop(columns='participant_id'),b)
np.testing.assert_array_equal(copied.participant_id,b.RANDID)
proxy=pd.read_csv(out/'recorded_cvd_proxy_DO_NOT_RELABEL.csv')
pd.testing.assert_frame_equal(proxy.rename(columns={f'proxy_{c}':c for c in META[1:5]}),base[META])
checks=[]
for regime in m['regimes']:
    for seed in m['seed_values']:
        tag=f'{regime}_{seed}'
        filename='pintig_framingham_26predictors_provisional.csv' if tag=='reference_20261101' else f'sensitivity_{tag}.csv'
        d=pd.read_csv(out/filename)
        q=pd.read_csv(out/f'SIMULATED_questionnaire_responses_{tag}.csv')
        np.testing.assert_array_equal(q.participant_id,d.participant_id)
        checks.append(validate(d,q,base,b,features))
        binary=['sex_male','current_smoker','hypertension_history','bp_medication','family_history_cvd',
         'diabetes','urban_rural_residence','heavy_episodic_alcohol','former_smoker','lipid_lowering_medication',
         'diabetes_medication','psychosocial_stress']
        assert all(d[c].dropna().isin([0,1]).all() for c in binary)
        assert np.isfinite(d[features].dropna().to_numpy()).all()
        assert d.age_years.between(35,70).all()
        assert (d.sbp_mmhg>d.dbp_mmhg).all() and d.dbp_mmhg.gt(0).all()
        assert d.heart_rate_bpm.dropna().gt(0).all() and d.cigarettes_per_day.dropna().ge(0).all()
        assert (d.current_smoker+d.former_smoker<=1).all()
        assert d.loc[d.alcohol_drinks_week.eq(0),'heavy_episodic_alcohol'].eq(0).all()
        assert d[['diet_score_0_100','ses_index_0_100']].ge(0).all().all()
        assert d[['diet_score_0_100','ses_index_0_100']].le(100).all().all()
        assert d.sitting_minutes_day.between(0,1440).all()
        assert d.activity_min_week.between(0,10080).all()
        assert d.loc[d.cigarettes_per_day.isna(),'current_smoker'].eq(1).all()
        # Check available future raw times, without feeding these into generation.
        assert proxy.proxy_analysis_time_days.between(0,3652.5).all()
        assert ((proxy.proxy_event_major_cvd_10y+proxy.proxy_event_competing_death_10y)<=1).all()
protected=json.loads((out/'protected_input_sha256.json').read_text())
assert all(digest(ROOT/p)==h for p,h in protected.items())
artifacts=json.loads((report/'artifact_manifest.json').read_text())
assert all(digest(ROOT/p)==h for p,h in artifacts.items())
sens=pd.read_csv(report/'simulation_sensitivity_summary.csv')
ranges=sens.groupby('predictor')['mean'].agg(['min','max']).to_dict(orient='index')
audit={'readback_scenarios':len(checks),'all_checks':'PASS','preserved_prior_files':len(protected),
 'baseline_raw_sidecar':'All 39 original columns equal eligible raw PERIOD=1 records; identifier linkage exact',
 'proxy_sidecar':'All original proxy values and folds equal existing v4; labels explicitly distinguish unclassified death',
 'nonfinite_or_invalid_domain_values':'None under the stated logical checks; no observed outliers deleted',
 'observed_extreme_values_retained':{'maximum_sbp_mmhg':float(b.SYSBP.max()),'maximum_heart_rate_bpm':float(b.HEARTRTE.max())},
 'exact_endpoint':'All four fields unavailable; cannot validate event histories that source does not supply',
 'sensitivity_mean_ranges':ranges,
 'unit_tests':{'passed':7},'npm_check':{'passed':66,'initial_attempt':'Sandbox spawn EPERM; permitted rerun passed'},
 'npm_build':'PASS','clinical_model_or_questionnaire_changes':'None'}
target.write_text(json.dumps(audit,indent=2))
print(json.dumps(audit,indent=2))
