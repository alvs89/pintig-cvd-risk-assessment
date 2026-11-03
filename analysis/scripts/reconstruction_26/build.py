"""Source-audited, non-overwriting provisional export. No fitting or global imputation.

Run from repository root: python analysis/scripts/reconstruction_26/build.py
Use --version NEW_NAME for another immutable run, --sources DIR for supplied PDFs.
"""
from pathlib import Path
import argparse
import hashlib
import json
import sys
import platform
import numpy as np
import pandas as pd
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
META = ['participant_id', 'analysis_time_days', 'event_type', 'event_major_cvd_10y',
        'event_competing_death_10y', 'outer_fold']
NEW = ['hip_circumference_cm', 'diabetes_medication', 'psychosocial_stress', 'sleep_duration_hours']
OBS = {'age_years':'AGE','sbp_mmhg':'SYSBP','dbp_mmhg':'DIABP','current_smoker':'CURSMOKE',
       'hypertension_history':'PREVHYP','bp_medication':'BPMEDS','diabetes':'DIABETES',
       'cigarettes_per_day':'CIGPDAY','heart_rate_bpm':'HEARTRTE'}
ALLOWED = ['age_years','sex_male','waist_cm','diabetes','ses_index_0_100','urban_rural_residence']
CATEGORIES = ['Never Experienced Stress','Some Period of Stress','Several Periods of Stress','Permanent Stress']
SEEDS = [20261101,20261102,20261103]
REGIMES = ['reference','weak_dependence','alternative_prevalence']
SOURCE_NAMES = ['pone.0271169.s001.pdf','IPAQ_English_self-admin_long.pdf','scoring_protocol.pdf',
 'Gen-3-Exam-1.pdf','Annotated-Form-Offspring-Exam-10-Omni-1-Exam-5.pdf',
 'Annotated-Form-Original-Cohort-Exam-32.pdf','Exam-7-Food-Frequency-Questionnaire.pdf',
 'Gen-3-Exam-3-Onsite-Sec-19.pdf','GetPdf.pdf','JAH3-10-e021245.pdf','socioeconomic.pdf']

def digest(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def write_json(p, x):
    p.write_text(json.dumps(x, indent=2, default=lambda v: v.item() if isinstance(v,np.generic) else str(v)), encoding='utf-8')

def stress_binary(home, work, work_applicable):
    applicable = [home] + ([work] if work_applicable else [])
    if any(x in CATEGORIES[2:] for x in applicable): return 1.0
    if all(x in CATEGORIES[:2] for x in applicable): return 0.0
    return np.nan

def medication_binary(response):
    return {0:0.0,1:1.0,2:0.0}.get(response,np.nan)

def hip_mean(a,b):
    # PURE refusal uses zeros in every box. Do not mistake zero for a measurement.
    return round((a+b)/2,1) if np.isfinite(a) and np.isfinite(b) and a>0 and b>0 else np.nan

def derive(q):
    return pd.DataFrame({
        NEW[0]:[hip_mean(a,b) for a,b in zip(q.hip_1_cm,q.hip_2_cm)],
        NEW[1]:q.diabetes_medication_response.map(medication_binary),
        NEW[2]:[stress_binary(h,w,a) for h,w,a in zip(q.stress_home,q.stress_work,q.work_applicable)],
        NEW[3]:q.typical_day_sleep_hours.where(q.typical_day_sleep_hours.between(0,24))
    },index=q.index)

def simulate(baseline, seed, regime):
    """Pure function: receives six permitted baseline fields only, never IDs/outcomes/folds.
    All coefficients are fixed scenario assumptions, not estimated from any records.
    Stable participant ordering is established by caller before this function.
    """
    if list(baseline.columns) != ALLOWED: raise ValueError('Only allowlisted baseline columns permitted')
    if baseline.isna().any().any(): raise ValueError('No silent baseline fill permitted')
    if regime not in REGIMES: raise ValueError('Unknown regime')
    rng=np.random.default_rng(seed); n=len(baseline)
    age=baseline.age_years.to_numpy(); male=baseline.sex_male.to_numpy()
    waist=baseline.waist_cm.to_numpy(); ses=baseline.ses_index_0_100.to_numpy()
    diab=baseline.diabetes.to_numpy(); urban=baseline.urban_rural_residence.to_numpy()
    weak=regime=='weak_dependence'; alt=regime=='alternative_prevalence'
    factor=0.5 if weak else 1.0
    # No constraint that hip must exceed waist; such a rule is not in the questionnaire.
    latent=np.clip(rng.normal(100+factor*(0.6*(waist-90)-2*male)+(3 if alt else 0),8 if weak else 6,n),66,159)
    hip1=np.round(np.clip(latent+rng.normal(0,0.4,n),65,160),1)
    hip2=np.round(np.clip(latent+rng.normal(0,0.4,n),65,160),1)
    pcurrent=1/(1+np.exp(-(0.4+factor*0.02*(age-50)+(-0.7 if alt else 0))))
    current=(rng.random(n)<pcurrent)&(diab==1)
    past=(rng.random(n)<0.10)&(diab==1)&~current
    med=np.where(current,1,np.where(past,2,0))
    work=rng.random(n)<np.where(age<60,0.75,0.35)
    probs=np.array([0.25,0.40,0.25,0.10] if not alt else [0.15,0.35,0.30,0.20])
    # Ordinal item probabilities: softmax(log(base probabilities) + SES-dependent rank shift).
    tilt=-factor*0.01*(ses-50)
    weights=probs[None,:]*np.exp(tilt[:,None]*np.arange(4)[None,:]); weights/=weights.sum(axis=1)[:,None]
    def draw_stress(): return np.array(CATEGORIES)[(rng.random(n)[:,None]>weights.cumsum(axis=1)).sum(axis=1)]
    home=draw_stress(); job=draw_stress().astype(object); job[~work]='Not applicable'
    stress=np.array([stress_binary(h,w,a) for h,w,a in zip(home,job,work)])
    sleep=np.round(np.clip(rng.normal(7.1-factor*(0.24*stress+0.05*urban)+(-0.5 if alt else 0),1.25 if weak else 1.0,n),3.5,10.5),1)
    awake=24-sleep
    # Complete the 24-hour accounting with separate simulated PAI domains.
    # These are not claimed equivalent to legacy IPAQ-like weekly fields.
    parts=rng.dirichlet([5,4,2,0.5],size=n)*awake[:,None]
    q=pd.DataFrame({'hip_1_cm':hip1,'hip_2_cm':hip2,'hip_clothing':'minimal/no clothing',
        'diabetes_medication_response':med,'work_applicable':work,'stress_home':home,'stress_work':job,
        'typical_day_sleep_hours':sleep,'typical_day_sedentary_hours':parts[:,0],
        'typical_day_slight_hours':parts[:,1],'typical_day_moderate_hours':parts[:,2],
        'typical_day_heavy_hours':parts[:,3]},index=baseline.index)
    return q,derive(q)

def validate(d, q, base, raw_baseline, predictors):
    assert list(d.columns)==predictors+META and d.shape==(4191,32)
    assert d.participant_id.is_unique and d.participant_id.notna().all()
    pd.testing.assert_frame_equal(d[predictors[:22]],base[predictors[:22]])
    pd.testing.assert_series_equal(d.outer_fold,base.outer_fold)
    pd.testing.assert_series_equal(d.participant_id,base.participant_id)
    assert d.outer_fold.isin(range(1,6)).all()
    assert d[META[1:5]].isna().all().all(), 'Unavailable exact endpoints must not be fabricated'
    for c,r in OBS.items(): np.testing.assert_allclose(d[c],raw_baseline[r],rtol=0,atol=0,equal_nan=True)
    np.testing.assert_array_equal(d.sex_male,(raw_baseline.SEX==1).astype(int))
    pd.testing.assert_frame_equal(d[NEW],derive(q))
    assert q.loc[~q.work_applicable,'stress_work'].eq('Not applicable').all()
    assert q.loc[q.work_applicable,'stress_work'].isin(CATEGORIES).all()
    assert q.stress_home.isin(CATEGORIES).all() and q.diabetes_medication_response.isin([0,1,2,9]).all()
    assert d.loc[d.diabetes==0,'diabetes_medication'].eq(0).all()
    assert q[['hip_1_cm','hip_2_cm']].ge(65).all().all() and q[['hip_1_cm','hip_2_cm']].le(160).all().all()
    assert d.sleep_duration_hours.between(3.5,10.5).all()
    hours=[c for c in q if c.startswith('typical_day_')]
    np.testing.assert_allclose(q[hours].sum(axis=1),24,atol=1e-10)
    assert q[hours].ge(0).all().all()
    return {'participants':len(d),'columns':len(d.columns),'predictors':len(predictors),
      'linkage_observed_values_first22_folds_response_derivations':'PASS',
      'exact_endpoint':'UNAVAILABLE: four outcome fields intentionally missing for all participants',
      'predictor_missing':d[predictors].isna().sum().to_dict(),
      'fold_counts':d.outer_fold.value_counts().sort_index().to_dict()}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--version',default='questionnaire_26_20261101_v1')
    ap.add_argument('--sources',type=Path,default=Path.home()/'Downloads');a=ap.parse_args()
    if not a.version.replace('_','').isalnum(): raise ValueError('Version must contain only letters, digits, underscores')
    out=ROOT/'data/processed'/a.version; report=ROOT/'analysis/reports'/a.version
    if out.exists() or report.exists(): raise FileExistsError('Use a new version; outputs are immutable')
    configpath=ROOT/'analysis/results/v4_corrected_20261031_v1/configurations.json'
    config=json.loads(configpath.read_text());predictors=config['n26']
    assert len(predictors)==26 and predictors[:22]==config['n22'] and predictors[22:]==NEW
    spec=json.loads((HERE/'questionnaire_spec.json').read_text())
    assert [x['predictor_name'] for x in spec]==NEW and all(x['pdf_page'] and x['original_question_number'] for x in spec)
    source_inventory=[]
    for filename in SOURCE_NAMES:
        p=a.sources/filename
        source_inventory.append({'filename':filename,'sha256':digest(p),'pages':len(PdfReader(p).pages),
         'role':'primary item source' if filename in [s['source_file'] for s in spec] else 'supporting document reviewed; not used to invent a score'})
    rawpath=ROOT/'data/raw/framingham.csv'; frozenpath=ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv'
    basepath=ROOT/'data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv'
    raw=pd.read_csv(rawpath); frozen=pd.read_csv(frozenpath).sort_values('participant_id').reset_index(drop=True)
    base=pd.read_csv(basepath).sort_values('participant_id').reset_index(drop=True)
    assert base.participant_id.is_unique and frozen.participant_id.is_unique
    pd.testing.assert_frame_equal(base[frozen.columns],frozen)
    first=raw.loc[raw.PERIOD==1].copy(); assert first.RANDID.is_unique
    eligible=first.loc[first.AGE.between(35,70)&first.PREVCHD.eq(0)&first.PREVSTRK.eq(0)]
    assert set(eligible.RANDID)==set(base.participant_id)
    b=first.set_index('RANDID').loc[base.participant_id].reset_index()
    tau=3652.5
    proxy_time=np.minimum(np.minimum(b.TIMECVD,b.TIMEDTH),tau)
    proxy_event=np.where((b.CVD==1)&(b.TIMECVD<=tau)&(b.TIMECVD<=b.TIMEDTH),1,
                         np.where((b.DEATH==1)&(b.TIMEDTH<=tau),2,0))
    np.testing.assert_array_equal(proxy_time,base.analysis_time_days)
    np.testing.assert_array_equal(proxy_event,base.event_type)
    np.testing.assert_array_equal(base.event_major_cvd_10y,proxy_event==1)
    np.testing.assert_array_equal(base.event_competing_death_10y,proxy_event==2)
    # Hash every existing research artifact and protected application file before writing.
    protected={}
    for directory in ['data','analysis/results','analysis/modeling','analysis/reports','src','legacy','model']:
        for p in (ROOT/directory).rglob('*'):
            if p.is_file(): protected[p.relative_to(ROOT).as_posix()]=digest(p)
    out.mkdir(parents=True);report.mkdir(parents=True)
    write_json(out/'protected_input_sha256.json',protected)
    write_json(report/'source_inventory.json',source_inventory)
    pd.DataFrame(spec).to_csv(report/'pintig_26predictors_questionnaire_mapping.csv',index=False)
    # Preserve all 39 source fields in a linked sidecar; never recode raw observations.
    b.insert(0,'participant_id',base.participant_id);b.to_csv(out/'original_baseline_records.csv',index=False)
    proxy=base[META].rename(columns={c:'proxy_'+c for c in META[1:5]})
    proxy.to_csv(out/'recorded_cvd_proxy_DO_NOT_RELABEL.csv',index=False)
    output_base=base[predictors+META].copy(); output_base[META[1:5]]=np.nan
    scenario_rows=[];checks=[]
    for regime in REGIMES:
        for seed in SEEDS:
            q,features=simulate(base[ALLOWED],seed,regime)
            d=output_base.copy();d[NEW]=features
            check=validate(d,q,base,b,predictors);check.update(regime=regime,seed=seed);checks.append(check)
            primary=regime=='reference' and seed==SEEDS[0]
            tag=f'{regime}_{seed}'
            dataset_name='pintig_framingham_26predictors_provisional.csv' if primary else f'sensitivity_{tag}.csv'
            d.to_csv(out/dataset_name,index=False)
            q.insert(0,'participant_id',base.participant_id)
            q.to_csv(out/f'SIMULATED_questionnaire_responses_{tag}.csv',index=False)
            for c in NEW:
                scenario_rows.append({'scenario':tag,'predictor':c,'n':len(d),'missing':int(d[c].isna().sum()),
                 'mean':d[c].mean(),'sd':d[c].std(),'min':d[c].min(),'median':d[c].median(),'max':d[c].max()})
            if primary: primary_data=d
    # Repeat generation is bit-for-bit deterministic at the table level.
    q1,f1=simulate(base[ALLOWED],SEEDS[0],'reference');q2,f2=simulate(base[ALLOWED],SEEDS[0],'reference')
    pd.testing.assert_frame_equal(q1,q2);pd.testing.assert_frame_equal(f1,f2)
    summary=primary_data[predictors].describe().T
    summary['missing']=primary_data[predictors].isna().sum();summary.to_csv(report/'predictor_descriptive_summary.csv',index_label='predictor')
    pd.DataFrame(scenario_rows).to_csv(report/'simulation_sensitivity_summary.csv',index=False)
    primary_data.groupby('outer_fold').size().rename('participants').to_csv(report/'outer_fold_counts.csv')
    frequencies=[]
    for c in predictors:
        if primary_data[c].nunique()<=3:
            frequencies += [{'predictor':c,'value':str(k),'count':int(v)} for k,v in primary_data[c].value_counts(dropna=False).items()]
    pd.DataFrame(frequencies).to_csv(report/'categorical_frequencies.csv',index=False)
    write_json(report/'validation.json',{'scenarios':checks,'raw_rows':len(raw),'raw_participants':raw.RANDID.nunique(),
     'baseline_rows':len(first),'excluded_age':int((~first.AGE.between(35,70)).sum()),
     'excluded_prior_chd_or_stroke_after_age':int((first.AGE.between(35,70)&((first.PREVCHD!=0)|(first.PREVSTRK!=0))).sum()),
     'proxy_event_counts':pd.Series(proxy_event).value_counts().to_dict(),'proxy_followup_days':pd.Series(proxy_time).describe().to_dict(),
     'admin_at_tau':int(((proxy_event==0)&(proxy_time==tau)).sum()),'reproducibility':'PASS',
     'source_hashes_preserved':all(digest(ROOT/p)==h for p,h in protected.items())})
    # Existing dictionary supplies inherited meanings; never rescore inherited arbitrary indices.
    inherited=pd.read_csv(ROOT/'analysis/reports/v4_21_provisional/data_dictionary.csv').set_index('column').fillna('')
    rows=[]
    for c in predictors+META:
        row={'column':c,'role':'predictor' if c in predictors else 'excluded_from_predictor_matrix'}
        if c in NEW:
            s=spec[NEW.index(c)];row.update(definition=s['calculation_or_encoding'],units=s['measurement_unit'],
             provenance='simulated',source=f"{s['source_file']} PDF p{s['pdf_page']}: {s['original_question_number']}",
             encoding=s['expected_range'],missing_handling='Preserve missing; no global imputation; current generated responses complete',limitations=s['limitations'])
        elif c=='lipid_lowering_medication':
            row.update(definition='Legacy simulated current lipid-lowering treatment indicator',units='binary',provenance='simulated',
             source='generate_v4_simulation.py seed 20261030',encoding='0/1',missing_handling='Preserved unchanged',
             limitations='Arbitrary treatment probability from age, SBP and diabetes; not observed or questionnaire-verified')
        elif c in META:
            row.update(definition={'participant_id':'Original RANDID; one eligible PERIOD=1 record',
             'outer_fold':'Exact frozen v3 participant-level outer fold; original random seed not established by audited files',
             'analysis_time_days':'Time to first exact MI/stroke/HF/CV-death, non-CVD death or censoring; unavailable',
             'event_type':'Intended 0=censored,1=first major CVD,2=non-CVD death; all unavailable',
             'event_major_cvd_10y':'Intended exact composite by day 3652.5; unavailable',
             'event_competing_death_10y':'Intended verified non-CVD death before composite; unavailable'}[c],
             units='days' if c=='analysis_time_days' else 'identifier' if c=='participant_id' else 'code',
             provenance='observed identifier' if c=='participant_id' else 'derived fold assignment' if c=='outer_fold' else 'unavailable',
             source='raw RANDID / frozen v3 linkage' if c in ['participant_id','outer_fold'] else 'Required source information absent',
             encoding='1-5' if c=='outer_fold' else 'integer' if c=='participant_id' else 'blank NA',missing_handling='Never impute identifiers or outcomes',
             limitations='Exact endpoint training blocked; separately labeled proxy retained for audit')
        else:
            old=inherited.loc[c];row.update(definition=old.origin_or_basis,units=old.unit_or_encoding,
             provenance='observed' if c in OBS else 'derived' if c=='sex_male' else 'simulated',
             source='framingham.csv:'+OBS[c] if c in OBS else 'framingham.csv:SEX; 1 male, 2 female => binary male' if c=='sex_male' else 'Existing v3/v4 frozen augmentation copied unchanged',
             encoding=old.unit_or_encoding,missing_handling=old.missing_strategy,limitations=old.limitation)
        rows.append(row)
    pd.DataFrame(rows).to_csv(report/'pintig_26predictors_data_dictionary.csv',index=False)
    write_json(report/'run_manifest.json',{'version':a.version,'command':sys.argv,'python':sys.version,
      'platform':platform.platform(),'numpy':np.__version__,'pandas':pd.__version__,
      'seed_values':SEEDS,'regimes':REGIMES,'predictor_columns':predictors,'excluded_columns':META,
      'inputs':{str(p.relative_to(ROOT)):digest(p) for p in [rawpath,frozenpath,basepath,configpath,HERE/'build.py',HERE/'questionnaire_spec.json']},
      'dataset_directory':out.relative_to(ROOT).as_posix(),'report_directory':report.relative_to(ROOT).as_posix()})
    write_reports(report,out,summary,checks,source_inventory)
    assert all(digest(ROOT/p)==h for p,h in protected.items()),'Protected input changed'
    artifacts={p.relative_to(ROOT).as_posix():digest(p) for directory in [out,report] for p in directory.rglob('*') if p.is_file()}
    write_json(report/'artifact_manifest.json',artifacts)
    print(json.dumps({'dataset':str(out/'pintig_framingham_26predictors_provisional.csv'),'report':str(report),
     'participants':len(primary_data),'columns':len(primary_data.columns),'scenarios_validated':len(checks),
     'protected_files_unchanged':len(protected),'exact_endpoint':'unavailable; not fabricated'}))

def write_reports(report,out,summary,checks,inventory):
    facts=json.loads((report/'validation.json').read_text())
    (report/'pintig_26predictors_preprocessing_report.md').write_text(f'''# PINTIG 26-predictor reconstruction

Provisional questionnaire-informed simulation; not clinically validated Philippine longitudinal data.
The main CSV contains 4,191 participants, 26 predictors and six metadata/outcome fields (32 columns).
Nine predictors are observed, one is derived from observed sex, and 16 are simulated. No imputed values are exported.
The exact four-component survival endpoint is **unavailable**: its four columns are blank NA, not negative events.
This dataset must not be passed directly to an RSF trainer expecting complete survival outcomes.

## Established configuration and preservation
The n22 and n26 lists in `analysis/results/v4_corrected_20261031_v1/configurations.json`
identify exactly hip_circumference_cm, diabetes_medication, psychosocial_stress and sleep_duration_hours.
The first 22 values are copied from the established original v4 simulation, after joining and checking RANDID.
Nine observed columns and sex encoding are independently compared with raw baseline records, including missingness.
The 12 synthetic fields among those first 22 are retained unchanged, not newly asserted questionnaire-equivalent.
In particular diet_score_0_100 and ses_index_0_100 remain arbitrary exploratory indices, not validated PURE/FFQ scores.
The old heavy-episodic proxy is not retrospectively relabeled as the PURE >5 drinks/day question.
All 39 raw baseline fields are preserved in `original_baseline_records.csv`; the original full raw file is unchanged.

## Eligibility and folds
Raw rows: {facts['raw_rows']}; unique baseline participants: {facts['baseline_rows']}.
Exclude {facts['excluded_age']} outside age 35-70, then {facts['excluded_prior_chd_or_stroke_after_age']} with prior CHD/stroke.
All 4,191 eligible PERIOD=1 records match the frozen cohort exactly. Other required history (e.g. prior HF) cannot be screened.
Reuse the five frozen participant folds (839, 838, 838, 838, 838) to preserve experimental comparability.
The originating outer-fold random seed was not established from the audited files; no new seed is falsely claimed.
The frozen assignment file and its SHA-256 are the reproducible fold authority. Simulation seeds: {SEEDS}.
Participant ordering is ascending original identifier. Identifiers only align rows; they do not enter the simulation function.

## Source verification
Exact source/page/item/wording/options/limitations are in `pintig_26predictors_questionnaire_mapping.csv`.
PURE is the South African form. PDF physical pages differ from printed pages.
Gen-3-Exam-1.pdf is available; Gen-3-Exam-1 (1).pdf was not found. No byte-equivalence claim is made.
PURE PDF pp25,34,35 and Gen3 pp10,23 were visually read; supporting Offspring p73 was also inspected.
All eleven supplied document filenames found locally are inventoried with hashes and page counts.
Questionnaire support establishes constructs, not actual participant responses or validated simulation distributions.
The hip mean and stress threshold are explicit PINTIG adaptations. The missing PURE measurement manual remains a limitation.

## Fixed simulation assumptions, not fitted epidemiology
All draws use NumPy default_rng; no outcome, time, fold, cohort-fitted statistic or donor record is supplied to the generator.
Only age, sex, synthetic waist, observed diabetes, synthetic SES and synthetic urban status may enter it.
- Hip latent cm: clipped normal with mean 100 + 0.6*(waist-90) - 2*male, SD6, bounds66-159.
  Two independent measurement errors N(0,0.4), clip65-160, round0.1; minimal/no clothing assumed for both.
  Final feature is their mean rounded0.1. Hip need not exceed waist. No missing protocol details are invented.
- Diabetes current treatment among DIABETES=1: logistic(0.4+0.02*(age-50)); among untreated diabetics, past-use probability0.10.
  DIABETES=0 => response0 (simulation restriction). Original response1 maps1; 0/2 map0;9 mapsNA.
  Unneeded clinical follow-up histories are not generated.
- Work applicable: probability0.75 below60, otherwise0.35. Home/work ordinal categories have reference weights
  [0.25,0.40,0.25,0.10], multiplied by exp(-0.01*(SES-50)*rank), then normalized.
  Applicable home and work draws independent conditional on SES; nonworking work response is Not applicable.
  Binary stress=1 for either applicable Several/Permanent; otherwise0 when all applicable responses known, elseNA.
- Sleep: direct typical-day response, rounded0.1, clipped3.5-10.5,
  N(7.1-0.24*stress-0.05*urban,1). Remaining24-hour time allocated by Dirichlet[5,4,2,0.5]
  to sedentary/slight/moderate/heavy. These auxiliary PAI domains are not replacements for inherited weekly activity/sitting constructs.
- Weak-dependence regime halves baseline coefficients, increases hip SD to8 and sleep SD to1.25.
- Alternative-prevalence regime adds3cm to hip mean, subtracts0.7 from treatment logit,
  uses stress base weights[0.15,0.35,0.30,0.20], and subtracts0.5h from sleep mean.
All assumptions are plausible experimental perturbations, not empirically calibrated population distributions.
No refusal/unknown responses are drawn in these scenarios; handling is unit-tested but missingness sensitivity is not evaluated.

## Missingness and training
Preserve missing BP medication (52), cigarettes/day (29), heart rate (1). No whole-cohort fitting or imputation occurs.
Reuse `scripts/pintig_v3_modeling_config.R` only inside each inner/outer training partition:
training mode for BP medication, current-smoker training median for cigarette count, training median for heart rate.
Missing cigarettes for known nonsmokers may be structural zero; current missing records are smokers.
Diabetes is complete; future unknown diabetes must not be silently filled.
All six metadata/outcome columns are excluded via the explicit predictor list in run_manifest.json.
New questionnaire definitions require new model experiments; previous v4 metrics do not describe this reconstruction.

## Endpoint restriction
Raw CVD and all-cause death flags/times are preserved. MI/stroke-related records exist, but HF onset and
adjudicated cause-specific deaths are insufficient for the exact MI/stroke/HF/CV-death composite.
All-cause death before recorded CVD is not proven non-CVD death. Thus all four exact outcome fields are NA.
The unchanged old endpoint is separately stored with `proxy_` prefixes and cannot be relabeled as the requested target.
The IHD project title is narrower than the requested major-CVD composite; resolve this protocol inconsistency separately.

## Sensitivity and interpretation
Nine complete feature datasets (3 seeds x3 assumptions) and questionnaire-response sidecars were generated and validated.
`simulation_sensitivity_summary.csv` reports distributions; no model was trained and no new performance conclusion is claimed.
Sensitivity here concerns feature generation, not model rankings. Predictive robustness of this reconstruction remains untested.
The exact endpoint is unavailable, so no valid exact-endpoint performance table can be produced.
Previous corrected proxy experiments remain separate historical results. Authentic questionnaire wording does not validate simulated measurements.
Next: obtain HF and adjudicated death linkage, settle endpoint/title, obtain the anthropometry manual and Philippine instrument,
approve adaptations, collect genuine responses, then perform nested fold-specific training and independent external validation.
''',encoding='utf-8')
    lines=['# Dataset validation results','',f"Validated {len(checks)} generated datasets and all linked questionnaire response tables.",
      '',f"Raw/frozen/prior research/application hashes unchanged: {facts['source_hashes_preserved']}.",
      '', 'All 26 feature names and six metadata names match the schema; 32 columns; 4,191 unique linked eligible participants.',
      'Observed values/missingness, first22 values and folds match exactly. All four new transformations recompute from response sidecars.',
      'Hip repeats, original medication categories, work skip rule and 24-hour accounting pass for every scenario.',
      'Exact endpoint values: 4,191 unavailable in each of four columns. NA is not a censored event or a negative outcome.',
      '', '## Preserved recorded-CVD proxy only', '',f"Event counts: {facts['proxy_event_counts']} (0 censored;1 recorded CVD;2 death before recorded CVD, cause unknown).",
      f"Follow-up days: {facts['proxy_followup_days']}",f"Administrative censoring at3652.5 days: {facts['admin_at_tau']}.",
      'Raw reconstruction exactly matches the existing proxy. CVD takes priority on same-day CVD/death; this is not adjudication of cause.',
      '', '## Predictor distributions and missingness', '', summary.to_string(), '',
      'Categorical counts, outer-fold counts and all scenario summaries are supplied as separate CSVs.',
      'No clinical performance metrics or superiority claim: model training was not part of this reconstruction.',
      'See preprocessing report for unresolved endpoint, instrument, fold-seed and legacy synthetic-definition limitations.']
    (report/'pintig_26predictors_validation_report.md').write_text('\n'.join(lines),encoding='utf-8')

if __name__=='__main__': main()
