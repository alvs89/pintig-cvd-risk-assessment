from pathlib import Path
import pandas as pd,numpy as np,hashlib,json
ROOT=Path(__file__).resolve().parents[3]
src=ROOT/'data/processed/questionnaire_26_20261101_v1'
v3=ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv'
out=ROOT/'data/processed/questionnaire_26_outcome_recovered_20261101_v1'
rep=ROOT/'analysis/reports/questionnaire_26_outcome_recovered_20261101_v1'
assert not out.exists() and not rep.exists(),'Refuse to overwrite recovery artifacts'
out.mkdir(parents=True);rep.mkdir(parents=True)
a=pd.read_csv(src/'pintig_framingham_26predictors_provisional.csv')
b=pd.read_csv(v3)
c=pd.read_csv(src/'recorded_cvd_proxy_DO_NOT_RELABEL.csv')
raw=pd.read_csv(ROOT/'data/raw/framingham.csv')
assert len(a)==len(b)==len(c)==4191 and all(t.participant_id.is_unique for t in [a,b,c])
a=a.sort_values('participant_id').reset_index(drop=True)
b=b.sort_values('participant_id').reset_index(drop=True)
c=c.sort_values('participant_id').reset_index(drop=True)
assert a.participant_id.equals(b.participant_id) and a.participant_id.equals(c.participant_id)
fields=['analysis_time_days','event_type','event_major_cvd_10y','event_competing_death_10y']
for field in fields:
 assert a[field].isna().all(),field
 pd.testing.assert_series_equal(b[field],c['proxy_'+field],check_names=False)
assert a.outer_fold.equals(b.outer_fold) and a.outer_fold.equals(c.outer_fold)
first=raw.loc[raw.PERIOD==1].set_index('RANDID').loc[a.participant_id]
t=np.minimum(np.minimum(first.TIMECVD.to_numpy(),first.TIMEDTH.to_numpy()),3652.5)
ev=np.where((first.CVD.to_numpy()==1)&(first.TIMECVD.to_numpy()<=3652.5)&(first.TIMECVD.to_numpy()<=first.TIMEDTH.to_numpy()),1,np.where((first.DEATH.to_numpy()==1)&(first.TIMEDTH.to_numpy()<=3652.5),2,0))
assert np.array_equal(t,b.analysis_time_days.to_numpy())
assert np.array_equal(ev,b.event_type.to_numpy())
proxy=a.copy()
for field in fields:proxy[field]=b[field].to_numpy()
assert (proxy[fields[0]].between(0,3652.5)).all() and set(proxy.event_type)=={0,1,2}
assert (proxy.event_major_cvd_10y.to_numpy()==(proxy.event_type==1).to_numpy()).all()
assert (proxy.event_competing_death_10y.to_numpy()==(proxy.event_type==2).to_numpy()).all()
assert (proxy.event_major_cvd_10y*proxy.event_competing_death_10y==0).all()
assert (proxy.iloc[:,:26].equals(a.iloc[:,:26])) and (proxy.outer_fold.equals(a.outer_fold))
exact=a.copy()
exactfile=out/'pintig_framingham_26predictors_exact_endpoint.csv'
proxyfile=out/'pintig_framingham_26predictors_PROXY_EXPERIMENTAL.csv'
exact.to_csv(exactfile,index=False)
proxy.to_csv(proxyfile,index=False)
comparison=pd.DataFrame({'participant_id':a.participant_id,'source_v3_status':b.event_type,'recovered_proxy_status':proxy.event_type,'source_v3_days':b.analysis_time_days,'recovered_proxy_days':proxy.analysis_time_days,'source_v3_fold':b.outer_fold,'recovered_fold':proxy.outer_fold,'survival_match':(b[fields].eq(proxy[fields])).all(axis=1),'predictors_preserved':True})
comparison.to_csv(rep/'PINTIG_FROZEN_VS_26PREDICTOR_COMPARISON.csv',index=False)
counts=proxy.event_type.value_counts().sort_index().to_dict()
meta={'source':str(v3.relative_to(ROOT)),'source_proxy':str((src/'recorded_cvd_proxy_DO_NOT_RELABEL.csv').relative_to(ROOT)),'source_reconstruction':str((src/'pintig_framingham_26predictors_provisional.csv').relative_to(ROOT)),'proxy_event_definition':'1=recorded Framingham CVD first by day 3652.5; 2=recorded ALL-CAUSE death before CVD by day 3652.5, cause unknown; 0=censored','does_not_establish':'MI/stroke/HF/CVD-death exact composite or adjudicated non-CVD competing death','counts':counts,'n':len(proxy),'all_records_match':bool(comparison.survival_match.all()),'num_admin_censored_day3652_5':int(((proxy.event_type==0)&(proxy.analysis_time_days==3652.5)).sum()),'sha256':{x.name:hashlib.sha256(x.read_bytes()).hexdigest() for x in [exactfile,proxyfile]}}
(rep/'proxy_metadata.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
stat='\n'.join(f'- event_type={k}: {v}' for k,v in counts.items())
audit=f'''# PINTIG outcome recovery audit
## Why the old file had outcomes
The original frozen v3 file stored a provisional competing-risk proxy derived from raw Framingham `CVD`, `TIMECVD`, `DEATH`, and `TIMEDTH`. The exact preprocessing script first constructing the frozen v2 outcome could not be uniquely verified by this audit; the calculation itself is explicitly reproduced and checked by `analysis/scripts/reconstruction_26/build.py` lines 153-164 and this recovery script.
Time = min(TIMECVD,TIMEDTH,3652.5). Status=1 when recorded CVD first by 3652.5 (ties favor CVD); status=2 for recorded all-cause death before CVD by 3652.5; status=0 otherwise. Flags follow status.
## Why the new file had missing outcomes
`analysis/scripts/reconstruction_26/build.py` deliberately creates `output_base=base[predictors+META].copy()` and then `output_base[META[1:5]]=np.nan` (in the inspected section around lines 167–170). This is intentional, because recorded CVD and all-cause death do not identify the entire MI/stroke/HF/CVD-death clinical endpoint or verified non-CVD death.
## Recovery
Matched 4,191 IDs by participant_id (not row order) between original v3, reconstruction, and separately saved proxy. Independently reproduced provisional event time and status from raw first exam event fields. Every recovered time, status, indicator and fold equals v3, and all 26 predictors are byte-value-equivalent at the DataFrame level to the questionnaire reconstruction. No source file overwritten.
{stat}
- Missing event times/status in proxy: 0/0
- Missing event times/status in exact endpoint: 4,191/4,191
- Follow-up: min {proxy.analysis_time_days.min()}, median {proxy.analysis_time_days.median()}, mean {proxy.analysis_time_days.mean():.4f}, max {proxy.analysis_time_days.max()} days
- Administrative 10-year censored participants: {meta['num_admin_censored_day3652_5']}
- 5 folds: {proxy.outer_fold.value_counts().sort_index().to_dict()}
- Zero unmatched participants; zero event/fold discrepancies.
## Important labeling
The proxy columns in the experimental CSV keep legacy six-field schema ONLY for compatibility with the old RSF pipeline. They are NOT clinical non-CVD death or the exact requested composite. Metadata and file names explicitly forbid interpreting them as adjudicated endpoints. The exact-endpoint file keeps all four fields NA.
## Training and validity limitations
No outcome is fabricated; the recovery is strictly a join of the existing v3 proxy. Six legacy and ten expanded predictors are simulated; recent four were questionnaire-informed but new model fit must be performed. Corrected v4 metrics cannot be transferred to this modified predictor simulation. Training should use cause 1 competing-risk CIF with documented horizon boundary handling and fold-only imputation. Any fit is a software smoke test, NOT clinical validation.
'''
(rep/'PINTIG_OUTCOME_RECOVERY_AUDIT.md').write_text(audit,encoding='utf-8')
(rep/'PINTIG_26PREDICTOR_OUTCOME_VALIDATION.md').write_text('# Recovered proxy validation\n\n'+audit.split('## Recovery')[1].split('## Training')[0],encoding='utf-8')
print(json.dumps(meta,indent=2));print('OUTPUTS',str(out),str(rep))
