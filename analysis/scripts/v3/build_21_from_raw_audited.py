from pathlib import Path
import pandas as pd, numpy as np, json, csv, hashlib
root=Path(__file__).resolve().parents[3]
rawpath=root/'data/raw/framingham.csv'
oldpath=root/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv'
simpath=root/'data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv'
output=root/'data/processed/pintig_framingham_21predictors_provisional.csv'
reportdir=root/'analysis/reports/v4_21_provisional';reportdir.mkdir(parents=True,exist_ok=True)
raw=pd.read_csv(rawpath);old=pd.read_csv(oldpath);sim=pd.read_csv(simpath)
assert len(raw)==11627 and raw.RANDID.nunique()==4434 and len(old)==4191
rawfirst=raw.sort_values(['RANDID','PERIOD','TIME'],kind='stable').drop_duplicates('RANDID')
assert (rawfirst.PERIOD==1).all() and old.participant_id.is_unique and sim.participant_id.is_unique
old=old.merge(rawfirst,how='left',left_on='participant_id',right_on='RANDID',validate='one_to_one',indicator=True)
assert (old['_merge']=='both').all()
# Preserve v3 demographic and clinical observed values; check baseline original mapping.
checks={'age_years':'AGE','sbp_mmhg':'SYSBP','dbp_mmhg':'DIABP','current_smoker':'CURSMOKE','hypertension_history':'PREVHYP','diabetes':'DIABETES','heart_rate_bpm':'HEARTRTE','cigarettes_per_day':'CIGPDAY','bp_medication':'BPMEDS'}
observed_comparisons={}
for processed,original in checks.items():
 x=pd.to_numeric(old[processed],errors='coerce');y=pd.to_numeric(old[original],errors='coerce')
 diff=x.notna()&y.notna()&~np.isclose(x,y,rtol=0,atol=1e-8)
 assert not diff.any(),(processed,int(diff.sum()))
 observed_comparisons[processed]={'raw_column':original,'compared_both_observed':int((x.notna()&y.notna()).sum()),'mismatches':0,'raw_missing':int(y.isna().sum()),'processed_missing':int(x.isna().sum())}
sex=(old.SEX==1).astype(int)
assert np.array_equal(old.sex_male.to_numpy(),sex.to_numpy()),'sex encoding mismatch'
# Original Framingham eligibility checks
assert old.AGE.between(35,70).all() and (old.PREVCHD==0).all() and (old.PREVSTRK==0).all()
new=['smoking_pack_years','urban_rural_residence','sitting_minutes_day','heavy_episodic_alcohol','former_smoker']
sim=sim[['participant_id']+new]
joined=old.merge(sim,on='participant_id',how='left',validate='one_to_one',indicator='sim_merge')
assert (joined.sim_merge=='both').all() and joined[new].notna().all().all()
existing=['age_years','sex_male','sbp_mmhg','dbp_mmhg','waist_cm','current_smoker','hypertension_history','bp_medication','alcohol_drinks_week','activity_min_week','diet_score_0_100','ses_index_0_100','family_history_cvd','diabetes','cigarettes_per_day','heart_rate_bpm']
extra=['participant_id','analysis_time_days','event_type','event_major_cvd_10y','event_competing_death_10y','outer_fold']
columns=extra+existing+new;assert len(columns)==27 and len(set(columns))==27
d=joined[columns].copy().sort_values('participant_id').reset_index(drop=True)
assert len(d)==4191 and d.participant_id.is_unique and d.outer_fold.between(1,5).all()
assert set(d.event_type.unique())=={0,1,2}
assert np.array_equal(d.event_major_cvd_10y.to_numpy(),(d.event_type==1).astype(int).to_numpy())
assert np.array_equal(d.event_competing_death_10y.to_numpy(),(d.event_type==2).astype(int).to_numpy())
assert d.analysis_time_days.between(0,3652.5).all()
assert (d.groupby('participant_id').outer_fold.nunique()==1).all()
# compare with v3 original event data, no outcome reassignment
for c in extra:
 if c=='participant_id': continue
 a=d.set_index('participant_id')[c].sort_index()
 b=old.set_index('participant_id')[c].sort_index()
 assert a.equals(b),f'existing outcome/id/fold altered: {c}'
d.to_csv(output,index=False,float_format='%.12g')
missing=d[existing+new].isna().sum().astype(int)
events=d.event_type.value_counts().sort_index()
qa={'participants':len(d),'predictor_count':21,'additional_column_count':6,'total_columns':27,'source_exam_records':len(raw),'source_unique_participants':int(raw.RANDID.nunique()),'age_range':list(map(float,[d.age_years.min(),d.age_years.max()])), 'event_types':{str(int(k)):int(v) for k,v in events.items()},'missing_by_predictor':missing.to_dict(),'fold_counts':{str(int(k)):int(v) for k,v in d.outer_fold.value_counts().sort_index().items()},'followup_days':{'min':float(d.analysis_time_days.min()),'median':float(d.analysis_time_days.median()),'mean':float(d.analysis_time_days.mean()),'max':float(d.analysis_time_days.max())},'observed_value_checks':observed_comparisons,'new_fields':'all five simulated, not clinically observed','original_six_fields':'synthetic augmentations carried over from v3','outcomes':'existing v3 provisional CVD/death proxy unchanged; CHF and CV-specific death not verifiable; type2 cannot confirm non-CVD death','raw_file_sha256':hashlib.sha256(rawpath.read_bytes()).hexdigest(),'v3_file_sha256':hashlib.sha256(oldpath.read_bytes()).hexdigest(),'output_file_sha256':hashlib.sha256(output.read_bytes()).hexdigest()}
(reportdir/'quality_assurance.json').write_text(json.dumps(qa,indent=2),encoding='utf-8')
lineage={'age_years':('AGE','years','observed'),'sex_male':('SEX','0 female, 1 male','derived'),'sbp_mmhg':('SYSBP','mmHg','observed'),'dbp_mmhg':('DIABP','mmHg','observed'),'waist_cm':('no raw Framingham column','cm','simulated'),'current_smoker':('CURSMOKE','0/1','observed'),'hypertension_history':('PREVHYP','0/1','observed'),'bp_medication':('BPMEDS','0/1','observed with missing'),'alcohol_drinks_week':('no raw Framingham column','standard drinks/week','simulated'),'activity_min_week':('no raw Framingham column','min/week','simulated'),'diet_score_0_100':('no raw Framingham column','0-100 arbitrary exploratory score','simulated'),'ses_index_0_100':('no raw Framingham column','0-100 arbitrary exploratory score','simulated'),'family_history_cvd':('no raw Framingham column','0/1','simulated'),'diabetes':('DIABETES','0/1','observed'),'cigarettes_per_day':('CIGPDAY','cigarettes/day','observed with missing'),'heart_rate_bpm':('HEARTRTE','beats/min','observed with missing'),'smoking_pack_years':('no raw smoking duration','pack-years','simulated'),'urban_rural_residence':('no raw community identifier','0 rural / 1 urban','simulated'),'sitting_minutes_day':('no raw IPAQ sitting','min/day','simulated'),'heavy_episodic_alcohol':('no raw heavy episode data','0/1 simulated proxy, no validated threshold','simulated'),'former_smoker':('CURSMOKE insufficient','0/1 simulated former smoker','simulated')}
with (reportdir/'data_dictionary.csv').open('w',newline='',encoding='utf-8') as f:
 w=csv.writer(f);w.writerow(['column','origin_or_basis','unit_or_encoding','provenance','missing_strategy','limitation'])
 for c in columns:
  if c in lineage:
   src,unit,status=lineage[c]
   method='Preserve missing in CSV; fit fold-specific mode for BP meds, smoker-group median for cigarettes/day, overall training median for heart rate' if c in ['bp_medication','cigarettes_per_day','heart_rate_bpm'] else 'Do not impute; simulator-generated values are complete' if status=='simulated' else 'Preserve measured values'
   limit='Generated assumption only; must not treat as measured' if status=='simulated' else ''
  else:
   src,unit,status=('Original RANDID','integer identifier','derived') if c=='participant_id' else ('Existing frozen v3 outcome derivation; raw indicators not independently sufficient for target 4-component event','days capped at 3652.5' if c=='analysis_time_days' else '0/1/2' if c=='event_type' else '0/1 or 1..5','provisional_proxy' if c.startswith('event_') or c in ['event_type','analysis_time_days'] else 'derived')
   method='Not imputed';limit='Not validated as CHF/MI/stroke/CVD-death composite; death cause unclassified' if status=='provisional_proxy' else ''
  w.writerow([c,src,unit,status,method,limit])
summary=f'''# PINTIG 21 predictors â€” Framingham-based provisional data audit

- Raw Framingham exam records: {len(raw):,}; unique participants: {raw.RANDID.nunique():,}
- Eligible baseline participants linked to prior frozen cohort: {len(d):,}
- Exactly 27 columns (21 predictors + 6 participant/outcome/fold fields).
- Outcomes copied unchanged from frozen v3: major-CVD-proxy={events.get(1,0)}, **death-before-proxy={events.get(2,0)}, cause unverified**, censored={events.get(0,0)}.
- 10-year followup: min {d.analysis_time_days.min():.1f}, median {d.analysis_time_days.median():.1f}, mean {d.analysis_time_days.mean():.1f}, max {d.analysis_time_days.max():.1f} days.
- Five added fields are the previously established 21-feature configuration: {', '.join(new)}.
- Six legacy variables remain synthetic: waist_cm, alcohol_drinks_week, activity_min_week, diet_score_0_100, ses_index_0_100, family_history_cvd.
- No missing predictor data were filled in the exported file. Fold-specific imputation occurs during model fitting, not before exporting this dataset.

## CRITICAL ENDPOINT LIMITATION
The name in the request says *Ischemic Heart Disease* (IHD), while the requested outcomes are a **major CVD composite** spanning MI, stroke, HF, and CVD death. Those are not the same endpoint. The supplied 39-column teaching Framingham file contains no adjudicated heart-failure onset event/time or verified cause-specific cardiovascular death classification. It **cannot establish** the exact requested four-component endpoint; nor can it determine which deaths were non-CVD. Existing event_type=1 and event_type=2 are copied verbatim from the earlier v3 **provisional proxy** and must not be relabeled as verified endpoint or verified non-CVD deaths. The event_competing_death_10y column name is preserved for compatibility, not clinical certification. Validated CHF, cause-of-death and sequence-of-events linked files would be needed.

## Quality gates
- Baseline PERIOD=1 matched; AGE 35â€“70, PREVCHD=0, PREVSTRK=0.
- Rows unique and each assigned exactly one existing outer fold.
- Type and binary outcome indicators mutually consistent, times in [0, 3652.5].
- All nine comparable numeric observed variables checked against original raw Framingham without mismatches; sex encoding verified.
- Training-fold-only imputation required; do not use a preimputed complete dataset for fitting unless the imputer was trained within that fold.
- Primary endpoint definitions and instrument coding require actual PURE PH codebook in Thesis 2.

See quality_assurance.json and data_dictionary.csv. Simulation algorithm: analysis/scripts/v3/generate_v4_simulation.py.
'''
(reportdir/'summary_report.md').write_text(summary,encoding='utf-8')
print(json.dumps({'csv':str(output),'dictionary':str(reportdir/'data_dictionary.csv'),'summary':str(reportdir/'summary_report.md'),'qa':str(reportdir/'quality_assurance.json'),'participants':len(d),'columns':len(columns),'events':qa['event_types'],'missing':{k:v for k,v in qa['missing_by_predictor'].items() if v}},indent=2))


