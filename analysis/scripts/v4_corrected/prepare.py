"""Freeze audit manifest and prepare a new versioned run, never overwrite inputs."""
from pathlib import Path
import hashlib, json, sys, platform
import pandas as pd
import numpy as np

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'analysis/results/v4_corrected_20261031_v1'

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    if OUT.exists(): raise SystemExit('Run directory already exists; use a new version.')
    OUT.mkdir(parents=True)
    protected={}
    for name in ['data','analysis/results','analysis/modeling','analysis/reports','src','legacy','model']:
        for p in (ROOT/name).rglob('*'):
            if p.is_file() and OUT not in p.parents: protected[p.relative_to(ROOT).as_posix()]=digest(p)
    (OUT/'protected_sha256.json').write_text(json.dumps(protected,indent=2))
    raw=pd.read_csv(ROOT/'data/raw/framingham.csv')
    d=pd.read_csv(ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv').sort_values('participant_id').reset_index(drop=True)
    b=raw[raw.PERIOD==1].set_index('RANDID').loc[d.participant_id].reset_index(drop=True)
    t=np.minimum(np.minimum(b.TIMECVD,b.TIMEDTH),3652.5)
    e=np.where((b.CVD==1)&(b.TIMECVD<=3652.5)&(b.TIMECVD<=b.TIMEDTH),1,np.where((b.DEATH==1)&(b.TIMEDTH<=3652.5),2,0))
    assert np.array_equal(t,d.analysis_time_days) and np.array_equal(e,d.event_type)
    admin=d.event_type.eq(0)&d.analysis_time_days.eq(3652.5)
    assert (b.loc[admin,['TIMECVD','TIMEDTH']]>3652.5).all().all()
    mapping={'age_years':'AGE','sbp_mmhg':'SYSBP','dbp_mmhg':'DIABP','current_smoker':'CURSMOKE','hypertension_history':'PREVHYP','diabetes':'DIABETES','heart_rate_bpm':'HEARTRTE','cigarettes_per_day':'CIGPDAY','bp_medication':'BPMEDS'}
    for c,r in mapping.items(): np.testing.assert_allclose(d[c],b[r],equal_nan=True,rtol=0,atol=1e-8)
    assert np.array_equal(d.sex_male,(b.SEX==1).astype(int))
    assert b.AGE.between(35,70).all() and b.PREVCHD.eq(0).all() and b.PREVSTRK.eq(0).all()
    validation=[]
    for p in (ROOT/'data/processed').glob('*.csv'):
        z=pd.read_csv(p).sort_values('participant_id').reset_index(drop=True)
        assert z.participant_id.is_unique and np.array_equal(z.participant_id,d.participant_id)
        for c in d.columns.intersection(z.columns): np.testing.assert_allclose(z[c],d[c],equal_nan=True,rtol=0,atol=1e-8)
        validation.append({'file':p.name,'rows':len(z),'columns':len(z.columns),'missing':z.isna().sum().to_dict(),'linkage_outcomes_folds_shared_fields':'PASS'})
    # Only an evaluation view: retain all original follow-up and outcome fields.
    pd.DataFrame({'participant_id':d.participant_id,'complete_at_tau':admin.astype(int),
                  'evaluation_time_days':np.where(admin,3653.5,d.analysis_time_days)}).to_csv(OUT/'evaluation_followup_view.csv',index=False)
    facts={'participants':len(d),'raw_rows':len(raw),'raw_participants':int(raw.RANDID.nunique()),
           'administratively_censored_at_tau':int(admin.sum()),'minimum_raw_followup_admin':int(b.loc[admin,['TIMECVD','TIMEDTH']].min().min()),
           'early_censored':int(((d.event_type==0)&~admin).sum()),'event_counts':d.event_type.value_counts().to_dict(),
           'raw_reconstruction':'PASS; CVD has priority over death on same day',
           'same_day_cvd_death_within_tau':int(((b.CVD==1)&(b.DEATH==1)&(b.TIMECVD==b.TIMEDTH)&(b.TIMECVD<=3652.5)).sum()),
           'datasets':validation,'python':sys.version,'platform':platform.platform()}
    (OUT/'data_validation.json').write_text(json.dumps(facts,indent=2))
    base=[c for c in d.columns if c not in ['participant_id','analysis_time_days','event_type','event_major_cvd_10y','event_competing_death_10y','outer_fold']]
    added=['smoking_pack_years','urban_rural_residence','sitting_minutes_day','heavy_episodic_alcohol','former_smoker','lipid_lowering_medication','hip_circumference_cm','diabetes_medication','psychosocial_stress','sleep_duration_hours']
    cfg={f'n{n}':base+added[:n-16] for n in range(16,27)}
    cfg['n18']=base+[added[i] for i in [0,4]];cfg['n20']=base+[added[i] for i in [2,3,8,9]]
    (OUT/'configurations.json').write_text(json.dumps(cfg,indent=2))
    pd.DataFrame([{'configuration':k,'predictor_count':len(v),'predictors':';'.join(v)} for k,v in cfg.items()]).to_csv(OUT/'configurations.csv',index=False)
    print(json.dumps({k:v for k,v in facts.items() if k!='datasets'},indent=2))

if __name__=='__main__':main()
