"""Versioned 27-predictor proposed engineering; no fitting or source mutation.
Run with no arguments to create; --verify checks saved artifacts without writing.
"""
import argparse
import csv
import json
from pathlib import Path
import numpy as np
import pandas as pd
from build import ROOT, META, OBS, digest

VERSION='questionnaire_27_engineered_20261103_v1'
SOURCE=ROOT/'data/processed/questionnaire_28_alcohol_20261102_v1/pintig_framingham_28predictors_PROXY_EXPERIMENTAL.csv'
OUT=ROOT/'data/processed'/VERSION
REPORT=ROOT/'analysis/reports'/VERSION
DEST=OUT/'pintig_framingham_27predictors_ENGINEERED_PROXY_EXPERIMENTAL.csv'
PREDICTORS=['age_years','sex_male','ses_index_0_100','urban_rural_residence','waist_cm',
 'hip_circumference_cm','sbp_mmhg','dbp_mmhg','heart_rate_bpm','hypertension_history','bp_medication',
 'diabetes','diabetes_medication','lipid_lowering_medication','family_history_cvd','alcohol_ethanol_g_week',
 'heavy_episodic_alcohol','smoking_status','smoking_pack_years','current_smoking_intensity_cigs_day',
 'passive_smoking_childhood','passive_smoking_adult_years','activity_min_week','sitting_minutes_day',
 'diet_score_0_100','psychosocial_stress','sleep_duration_hours']
NEW=['alcohol_ethanol_g_week','smoking_status','current_smoking_intensity_cigs_day',
     'passive_smoking_childhood','passive_smoking_adult_years']
INPUTS=['age_years','current_smoker','former_smoker','cigarettes_per_day',
        'alcohol_drinks_week','alcohol_beverage_type','alcohol_serving_size_ml']
ABV={'none':0.0,'beer':0.05,'wine':0.12,'spirits':0.40,'country_liquor':0.40}
SEED=20261103
DENSITY=0.789 # g/mL approximate ethanol density, fixed computational convention.

def union_years(intervals):
    """Integer-year intervals [start,end); overlap counted once."""
    return len(set().union(*(set(range(int(a),int(b))) for a,b in intervals))) if intervals else 0

def engineer(x,seed=SEED):
    if list(x.columns)!=INPUTS: raise ValueError('Only allowlisted baseline inputs permitted')
    if x.drop(columns='cigarettes_per_day').isna().any().any(): raise ValueError('Missing baseline input; no global imputation')
    if not x.current_smoker.isin([0,1]).all() or not x.former_smoker.isin([0,1]).all(): raise ValueError('Invalid status')
    if (x.current_smoker+x.former_smoker>1).any(): raise ValueError('Contradictory smoking statuses')
    if not x.age_years.between(35,70).all() or (x.age_years%1!=0).any(): raise ValueError('Unsupported baseline age')
    if not x.alcohol_beverage_type.isin(ABV).all(): raise ValueError('Unknown beverage')
    if (x.alcohol_drinks_week<0).any() or (x.cigarettes_per_day.dropna()<0).any(): raise ValueError('Negative exposure')
    if not x.alcohol_beverage_type.eq('none').equals(x.alcohol_drinks_week.eq(0)): raise ValueError('Conflicting drinking status')
    sizes={'none':0,'beer':375,'wine':125,'spirits':30,'country_liquor':30}
    if not x.alcohol_serving_size_ml.eq(x.alcohol_beverage_type.map(sizes)).all(): raise ValueError('Unexpected serving convention')
    if (x.loc[x.current_smoker.eq(0),'cigarettes_per_day'].fillna(0)!=0).any(): raise ValueError('Noncurrent intensity conflict')
    rng=np.random.default_rng(seed); rows=[]
    for age in x.age_years.astype(int):
        row={}
        childhood=rng.random(3)<[0.30,0.50,0.15]
        row['childhood_response']=int(childhood.any())
        for domain,v in zip(['mother','father','others'],childhood): row['childhood_'+domain]=int(v) if childhood.any() else np.nan
        row['childhood_other_count']=int(rng.integers(1,4)) if childhood[2] else np.nan
        intervals=[]
        for domain,p in zip(['partner','household_other','work','other_indoor'],[0.35,0.20,0.30,0.15]):
            exposed=int(rng.random()<p)
            start=int(rng.integers(18,age)) if exposed else None
            # Outside-home items ask about current exposure; those intervals end at baseline.
            end=(age if domain in ['work','other_indoor'] else int(rng.integers(start+1,age+1))) if exposed else None
            row[domain+'_response']=exposed
            row[domain+'_start_age']=start;row[domain+'_end_age']=end
            row[domain+'_years']=end-start if exposed else np.nan
            if exposed:intervals.append((start,end))
        row['adult_home_response']=int(row['partner_response'] or row['household_other_response'])
        row['adult_indoor_response']=int(row['work_response'] or row['other_indoor_response'])
        # Follow-up questions are skipped if the corresponding main response is No.
        for gate,domains in [('adult_home_response',['partner','household_other']),('adult_indoor_response',['work','other_indoor'])]:
            if not row[gate]:
                for domain in domains:row[domain+'_response']=np.nan
        row['adult_union_years']=union_years(intervals)
        rows.append(row)
    q=pd.DataFrame(rows,index=x.index)
    abv=x.alcohol_beverage_type.map(ABV)
    ethanol=(x.alcohol_drinks_week*x.alcohol_serving_size_ml*abv*DENSITY).round(4)
    status=np.where(x.current_smoker.eq(1),'Current',np.where(x.former_smoker.eq(1),'Former','Never'))
    intensity=x.cigarettes_per_day.where(x.current_smoker.eq(1),0)
    f=pd.DataFrame({NEW[0]:ethanol,NEW[1]:status,NEW[2]:intensity,
       NEW[3]:q.childhood_response,NEW[4]:q.adult_union_years},index=x.index)
    q['assumed_abv_fraction']=abv
    q['assumed_weekly_serving_count']=x.alcohol_drinks_week
    q['ethanol_g_week_alternative_14g_per_legacy_drink']=(x.alcohol_drinks_week*14).round(4)
    return f,q

def read(p):
    d=pd.read_csv(p);assert d.participant_id.notna().all() and d.participant_id.is_unique
    return d.sort_values('participant_id').reset_index(drop=True)

def verify():
    b=read(SOURCE);d=read(DEST);q=read(OUT/'SYNTHETIC_engineering_inputs.csv')
    assert d.shape==(4191,33) and list(d.columns)==PREDICTORS+META
    retained=[c for c in PREDICTORS+META if c not in NEW]
    pd.testing.assert_frame_equal(d[retained],b[retained])
    f,expected=engineer(b[INPUTS]);pd.testing.assert_frame_equal(d[NEW],f)
    np.testing.assert_array_equal(q.participant_id,d.participant_id)
    pd.testing.assert_frame_equal(q.drop(columns='participant_id'),expected,check_dtype=False)
    frozen=read(ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv')
    pd.testing.assert_frame_equal(d[META],frozen[META]);assert d[META].notna().all().all()
    assert d.event_type.value_counts().to_dict()=={0:3604,1:369,2:218}
    raw=pd.read_csv(ROOT/'data/raw/framingham.csv');raw=raw.loc[raw.PERIOD==1].set_index('RANDID').loc[d.participant_id].reset_index()
    for c,r in OBS.items():
        if c in d:np.testing.assert_allclose(d[c],raw[r],equal_nan=True,rtol=0,atol=0)
    np.testing.assert_array_equal(d.sex_male,raw.SEX.eq(1))
    np.testing.assert_allclose(d.current_smoking_intensity_cigs_day,raw.CIGPDAY.where(raw.CURSMOKE.eq(1),0),equal_nan=True)
    assert d.passive_smoking_adult_years.between(0,d.age_years-18).all()
    assert d.passive_smoking_childhood.isin([0,1]).all()
    assert d.loc[d.smoking_status.ne('Current'),'current_smoking_intensity_cigs_day'].eq(0).all()
    assert d.loc[d.current_smoking_intensity_cigs_day.isna(),'smoking_status'].eq('Current').all()
    assert d.alcohol_ethanol_g_week.ge(0).all()
    for _,r in q.iterrows():
        intervals=[(r[z+'_start_age'],r[z+'_end_age']) for z in ['partner','household_other','work','other_indoor'] if pd.notna(r[z+'_start_age'])]
        assert r.adult_union_years==union_years(intervals)
    hashes=json.loads((REPORT/'protected_sha256.json').read_text());assert all(digest(ROOT/p)==h for p,h in hashes.items())
    return {'status':'PASS','participants':4191,'columns':33,'predictors':27,
      'event_counts':d.event_type.value_counts().sort_index().to_dict(),'fold_counts':d.outer_fold.value_counts().sort_index().to_dict(),
      'smoking_status_counts':d.smoking_status.value_counts().to_dict(),'missing_by_predictor':d[PREDICTORS].isna().sum().to_dict(),
      'protected_files_unchanged':len(hashes),'source_predictors_retained':22,'derived_or_new_features':NEW,
      'raw_measurements_outcomes_folds_and_sidecar_derivations':'PASS','sha256':digest(DEST)}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--verify',action='store_true');args=ap.parse_args()
    if args.verify:print(json.dumps(verify(),indent=2));return
    if OUT.exists() or REPORT.exists():raise FileExistsError('Outputs exist; use --verify')
    b=read(SOURCE);f,q=engineer(b[INPUTS])
    protected={}
    for folder in ['data','analysis/results','analysis/modeling','analysis/reports','analysis/scripts','src','legacy']:
        for p in (ROOT/folder).rglob('*'):
            if p.is_file() and '__pycache__' not in p.parts:protected[p.relative_to(ROOT).as_posix()]=digest(p)
    OUT.mkdir(parents=True);REPORT.mkdir(parents=True)
    (REPORT/'protected_sha256.json').write_text(json.dumps(protected,indent=2))
    # Original strings are retained verbatim for unchanged fields.
    with SOURCE.open(newline='',encoding='utf-8-sig') as h: originals={int(r['participant_id']):r for r in csv.DictReader(h)}
    with DEST.open('x',newline='',encoding='utf-8') as h:
        w=csv.DictWriter(h,fieldnames=PREDICTORS+META);w.writeheader()
        for i,pid in enumerate(b.participant_id):
            row={c:originals[int(pid)][c] for c in PREDICTORS+META if c not in NEW}
            row.update({c:('' if pd.isna(f.loc[i,c]) else f.loc[i,c]) for c in NEW});w.writerow(row)
    q.insert(0,'participant_id',b.participant_id);q.to_csv(OUT/'SYNTHETIC_engineering_inputs.csv',index=False)
    old=pd.read_csv(ROOT/'analysis/reports/questionnaire_28_alcohol_20261102_v1/pintig_28predictors_data_dictionary.csv').fillna('').set_index('column')
    definitions={
      NEW[0]:('Proposed weekly servings x source-specific mL x assumed ABV x0.789; rounded4 decimals','g/week','derived from synthetic inputs',
       'PURE PDF19 Q28(c) plus assumed ABV; legacy drink-count interpretation is unverified'),
      NEW[1]:('Current if current_smoker=1; otherwise Former if former_smoker=1; otherwise Never','nominal Never/Former/Current','mixed observed and synthetic derivation',
       'CURSMOKE observed; former_smoker simulated. Never is inferred from this simulation, not observed lifetime abstinence'),
      NEW[2]:('Observed CIGPDAY for current smokers, including missing; structural0 for noncurrent smokers','cigarettes/day','derived from observed inputs',
       'No imputation exported; fit current-smoker median within training folds only'),
      NEW[3]:('Simulated childhood main response: any household smoker','binary0/1','simulated',
       'Gen-3-Exam-1.pdf PDF29 MD08 childhood passive-smoking question'),
      NEW[4]:('Union of synthetic adult exposure year intervals across four locations, adulthood starts18','years','derived from synthetic inputs',
       'Gen3 PDF29 MD08 provides domain years; interval timing and overlap-union calculation are PINTIG adaptations')}
    rows=[]
    for c in PREDICTORS+META:
        if c in NEW:
            definition,unit,provenance,source=definitions[c]
            rows.append({'column':c,'role':'predictor','definition':definition,'units':unit,'provenance':provenance,'source':source,
             'encoding':unit,'missing_handling':'Preserve unknown; no global imputation','limitations':'Proposed research engineering, not validated clinical measurements'})
        else:rows.append({'column':c,**old.loc[c].to_dict()})
    pd.DataFrame(rows).to_csv(REPORT/'data_dictionary.csv',index=False)
    (REPORT/'metadata.json').write_text(json.dumps({'seed':SEED,'rng':'numpy default_rng PCG64','numpy':np.__version__,
      'predictors':PREDICTORS,'excluded_columns':META,'generation_inputs':INPUTS,'source_sha256':digest(SOURCE),
      'abv_assumptions':ABV,'ethanol_density_g_ml':DENSITY,'removed_from_matrix_but_preserved_in_source':list(set(b.columns)-set(PREDICTORS+META)),
      'source_documents':{name:digest(Path.home()/'Downloads'/name) for name in ['Gen-3-Exam-1.pdf','pone.0271169.s001.pdf']},
      'source_urls':['https://www.niaaa.nih.gov/alcohols-effects-health/what-standard-drink']},indent=2))
    facts=verify();(REPORT/'validation.json').write_text(json.dumps(facts,indent=2))
    d=read(DEST);summary=d[PREDICTORS].describe(include='all').T
    summary['missing']=d[PREDICTORS].isna().sum();summary.to_csv(REPORT/'predictor_summary.csv',index_label='predictor')
    print(json.dumps(facts,indent=2))

if __name__=='__main__':main()
