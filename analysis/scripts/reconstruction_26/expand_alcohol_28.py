"""Add two explicitly synthetic alcohol fields; never alter prior datasets.
python analysis/scripts/reconstruction_26/expand_alcohol_28.py
python analysis/scripts/reconstruction_26/expand_alcohol_28.py --verify
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd
from build import ROOT, META, OBS, digest

VERSION='questionnaire_28_alcohol_20261102_v1'
SEED=20261102
NEW=['alcohol_beverage_type','alcohol_serving_size_ml']
ALLOWED=['alcohol_drinks_week','heavy_episodic_alcohol']
SIZES={'none':0,'beer':375,'wine':125,'spirits':30,'country_liquor':30}
PROBS=[0.55,0.20,0.20,0.05]  # Fixed exploratory assumptions, not population estimates.
SOURCE=ROOT/'data/processed/questionnaire_26_outcome_recovered_20261101_v1/pintig_framingham_26predictors_PROXY_EXPERIMENTAL.csv'
OUT=ROOT/'data/processed'/VERSION
REPORT=ROOT/'analysis/reports'/VERSION
CSV=OUT/'pintig_framingham_28predictors_PROXY_EXPERIMENTAL.csv'

def generate(x,seed=SEED):
    if list(x.columns)!=ALLOWED: raise ValueError('Only baseline alcohol fields may enter generation')
    if x.isna().any().any() or not np.isfinite(x.to_numpy()).all(): raise ValueError('Unknown alcohol status must not be treated as abstinence')
    if (x.alcohol_drinks_week<0).any() or not x.heavy_episodic_alcohol.isin([0,1]).all(): raise ValueError('Invalid alcohol encoding')
    if ((x.alcohol_drinks_week==0)&(x.heavy_episodic_alcohol==1)).any(): raise ValueError('Zero intake with heavy episode requires review; do not silently repair')
    rng=np.random.default_rng(seed)
    drinker=x.alcohol_drinks_week.gt(0)
    beverage=pd.Series('none',index=x.index,dtype=object)
    beverage.loc[drinker]=rng.choice(['beer','wine','spirits','country_liquor'],size=int(drinker.sum()),p=PROBS)
    return pd.DataFrame({NEW[0]:beverage,NEW[1]:beverage.map(SIZES)})

def read(path):
    d=pd.read_csv(path)
    assert d.participant_id.is_unique and d.participant_id.notna().all()
    return d.sort_values('participant_id').reset_index(drop=True)

def verify():
    base=read(SOURCE);d=read(CSV)
    assert base.shape==(4191,32) and d.shape==(4191,34)
    features=json.loads((ROOT/'analysis/results/v4_corrected_20261031_v1/configurations.json').read_text())['n26']
    assert list(d.columns)==features+NEW+META
    pd.testing.assert_frame_equal(d[base.columns],base)
    pd.testing.assert_frame_equal(d[NEW],generate(base[ALLOWED]))
    assert d[NEW].notna().all().all()
    assert d.alcohol_serving_size_ml.equals(d.alcohol_beverage_type.map(SIZES))
    assert d.alcohol_beverage_type.eq('none').equals(d.alcohol_drinks_week.eq(0))
    assert d.loc[d.heavy_episodic_alcohol.eq(1),'alcohol_serving_size_ml'].gt(0).all()
    frozen=read(ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv')
    pd.testing.assert_frame_equal(d[META],frozen[META])
    assert d[META].notna().all().all() and d.event_type.value_counts().to_dict()=={0:3604,1:369,2:218}
    assert d.event_major_cvd_10y.eq(d.event_type.eq(1)).all()
    assert d.event_competing_death_10y.eq(d.event_type.eq(2)).all()
    raw=pd.read_csv(ROOT/'data/raw/framingham.csv');b=raw.loc[raw.PERIOD==1]
    assert b.RANDID.is_unique
    b=b.set_index('RANDID').loc[d.participant_id].reset_index()
    for c,r in OBS.items(): np.testing.assert_allclose(d[c],b[r],equal_nan=True,rtol=0,atol=0)
    np.testing.assert_array_equal(d.sex_male,(b.SEX==1).astype(int))
    np.testing.assert_array_equal(d.analysis_time_days,np.minimum(np.minimum(b.TIMECVD,b.TIMEDTH),3652.5))
    e=np.where((b.CVD==1)&(b.TIMECVD<=3652.5)&(b.TIMECVD<=b.TIMEDTH),1,np.where((b.DEATH==1)&(b.TIMEDTH<=3652.5),2,0))
    np.testing.assert_array_equal(e,d.event_type)
    # Verify original serialized field values too, not just numeric equivalence.
    def strings(p):
        with p.open(newline='',encoding='utf-8-sig') as f:return {r['participant_id']:r for r in csv.DictReader(f)}
    a,z=strings(SOURCE),strings(CSV)
    assert a.keys()==z.keys() and all(all(z[k][c]==v for c,v in row.items()) for k,row in a.items())
    protected=json.loads((REPORT/'protected_sha256.json').read_text())
    assert all(digest(ROOT/p)==h for p,h in protected.items())
    return {'status':'PASS','rows':len(d),'columns':len(d.columns),'predictors':28,
      'event_counts':d.event_type.value_counts().sort_index().to_dict(),
      'fold_counts':d.outer_fold.value_counts().sort_index().to_dict(),
      'beverage_counts':d.alcohol_beverage_type.value_counts().to_dict(),
      'missing_new_predictors':d[NEW].isna().sum().to_dict(),
      'original_32_columns':'Exact serialized values preserved, including all 26 predictors, missingness, outcomes and folds',
      'raw_measurements_and_proxy_reconstruction':'PASS','protected_existing_files_unchanged':len(protected),
      'new_feature_generation':'Reproduced exactly from fixed seed and two permitted alcohol inputs',
      'sha256':digest(CSV)}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--verify',action='store_true');args=ap.parse_args()
    if args.verify: print(json.dumps(verify(),indent=2));return
    if OUT.exists() or REPORT.exists(): raise FileExistsError('Do not overwrite; use --verify for this version')
    base=read(SOURCE)
    cfg=json.loads((ROOT/'analysis/results/v4_corrected_20261031_v1/configurations.json').read_text())['n26']
    assert list(base.columns)==cfg+META
    extra=generate(base[ALLOWED])
    pdf=Path.home()/'Downloads/pone.0271169.s001.pdf'
    inventory=json.loads((ROOT/'analysis/reports/questionnaire_26_20261101_v1/source_inventory.json').read_text())
    assert digest(pdf)==next(x['sha256'] for x in inventory if x['filename']==pdf.name),'Questionnaire changed; re-review source'
    protected={}
    for folder in ['data','analysis/results','analysis/modeling','analysis/reports','analysis/scripts','src','legacy']:
        for p in (ROOT/folder).rglob('*'):
            if p.is_file() and '__pycache__' not in p.parts: protected[p.relative_to(ROOT).as_posix()]=digest(p)
    OUT.mkdir(parents=True);REPORT.mkdir(parents=True)
    (REPORT/'protected_sha256.json').write_text(json.dumps(protected,indent=2))
    # Preserve every original field's text, including recorded precision and blanks.
    with SOURCE.open(newline='',encoding='utf-8-sig') as f: records={int(r['participant_id']):r for r in csv.DictReader(f)}
    with CSV.open('x',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=cfg+NEW+META);w.writeheader()
        for i,pid in enumerate(base.participant_id):
            row=records[int(pid)].copy();row.update({NEW[0]:extra.iloc[i,0],NEW[1]:int(extra.iloc[i,1])});w.writerow(row)
    dictionary=pd.read_csv(ROOT/'analysis/reports/questionnaire_26_outcome_recovered_20261101_v1/finalization_v1/pintig_26predictors_PROXY_data_dictionary.csv').fillna('')
    additions=[]
    for name in NEW:
        additions.append({'column':name,'role':'predictor','definition':'Simulated predominant current beverage' if name==NEW[0] else 'Simulated usual single serving, using PURE approximate drink size for assigned beverage',
        'units':'nominal category' if name==NEW[0] else 'mL of beverage, not ethanol',
        'provenance':'simulated','source':'pone.0271169.s001.pdf PDF19 / printed9, Q28(c); single-beverage PINTIG adaptation',
        'encoding':'none; beer; wine; spirits; country_liquor' if name==NEW[0] else 'none=0; beer=375; wine=125; spirits=30; country_liquor=30',
        'missing_handling':'No missing generated; none/0 mean no current consumption under the legacy weekly-intake convention, not unknown',
        'limitations':'Synthetic, not observed Framingham or PURE responses; no clinical validation; not independently measured information'})
    dictionary=pd.concat([dictionary,pd.DataFrame(additions)],ignore_index=True).set_index('column').loc[cfg+NEW+META].reset_index()
    dictionary.to_csv(REPORT/'pintig_28predictors_data_dictionary.csv',index=False)
    facts=verify();(REPORT/'validation.json').write_text(json.dumps(facts,indent=2))
    d=read(CSV)
    d.groupby(['alcohol_beverage_type','alcohol_serving_size_ml','heavy_episodic_alcohol']).agg(
      participants=('participant_id','size'),weekly_drinks_min=('alcohol_drinks_week','min'),
      weekly_drinks_mean=('alcohol_drinks_week','mean'),weekly_drinks_max=('alcohol_drinks_week','max')).to_csv(REPORT/'alcohol_summary.csv')
    (REPORT/'metadata.json').write_text(json.dumps({'seed':SEED,'rng':'NumPy default_rng PCG64','numpy_version':np.__version__,
      'source':str(SOURCE.relative_to(ROOT)),'source_sha256':digest(SOURCE),'questionnaire':pdf.name,'questionnaire_sha256':digest(pdf),
      'predictors':cfg+NEW,'excluded_metadata':META,'probabilities_among_positive_weekly_drinkers':dict(zip(list(SIZES)[1:],PROBS)),
      'serving_sizes_ml':SIZES,'generation_inputs':ALLOWED,'participant_order':'ascending participant_id; ID only orders RNG draws',
      'script':'analysis/scripts/reconstruction_26/expand_alcohol_28.py','synthetic_predictors_total':18},indent=2))
    (REPORT/'REPORT.md').write_text('''# PINTIG 28-predictor alcohol expansion

New dataset: data/processed/questionnaire_28_alcohol_20261102_v1/pintig_framingham_28predictors_PROXY_EXPERIMENTAL.csv.
4,191 unique participants, 28 predictors +6 metadata/outcome columns =34 columns.
All original 32 field values are preserved exactly, including missing values and recorded numeric precision.
No original data, exact-endpoint dataset, experiment, frontend questionnaire or deployed model is changed.

## Questionnaire traceability and adaptation
Primary source: South African PURE Adult Questionnaire, pone.0271169.s001.pdf, physical PDF page19,
printed page9, Q28(c): "What forms of alcohol have you regularly used? (check all that apply)".
Listed beverage categories and approximate size of one drink: Spirits (rum, whisky, gin, vodka etc)30ml;
Wine125ml; Beer375ml; Country liquor/arrack/sugar cane spirit30ml.
Q28(a) distinguishes former/current/never use; never use skips to29. We cannot infer lifetime status from weekly intake.
Q28(d) asks: "At least once a month, do you consume >5 alcoholic drinks/day?" with No=>29, Yes=>episode frequency/quantity.
The inherited heavy_episodic_alcohol is an arbitrary synthetic proxy, not a verified response to Q28(d).

Gen-3-Exam-1.pdf PDF30 MD09 and Annotated-Form-Original-Cohort-Exam-32.pdf PDF6 MD06
also collect beverage-specific weekly/monthly use but use different ounce-based servings.
These were inspected; their serving conventions are not silently combined with PURE sizes.
The original 39-column framingham.csv has no alcohol beverage/serving fields; neither new feature is observed or imputed.

PINTIG adaptation: simulate one predominant current beverage, not the source's multiple selections.
Among positive weekly intake, categorical probabilities beer55%, wine20%, spirits20%, country_liquor5%.
These are explicit engineering assumptions, not estimated Framingham, South African or Philippine prevalence.
Each participant's usual single serving uses the source's approximate reference size deterministically.
This intentionally omits person-to-person pour variation; it is not a recovered measurement.
No unsupported Philippine beverage categories or ethanol-concentration assumptions are introduced.

## Logical consistency and reproducibility
Seed20261102, NumPy default_rng; ascending participant_id ordering, no ID effect beyond reproducible draw order.
Only alcohol_drinks_week and heavy_episodic_alcohol enter the generator. No outcomes, times, validation folds,
training data statistics or other participants' measurements inform the assigned values.
Zero weekly drinks => none and0mL; positive weekly drinks => a listed beverage with positive matching size.
All1,545 zero-intake records already have heavy_episodic_alcohol=0; conflicting inputs are rejected rather than repaired.
Heavy-episodic participants may consume any beverage. Heavy use does not imply a larger single serving:
episode drink count and frequency are distinct quantities and cannot be reconstructed from these fields.
No heavy-dependent beverage preference is invented. Original weekly amount and heavy indicator remain unchanged.
Missing, nonfinite, negative or invalid alcohol inputs are rejected, never silently recoded as non-drinkers.
Unknown drinking status must remain missing in future data; zero currently means no consumption under the inherited simulation convention.

## Validation and future modeling
Exact source-field preservation, nine observed raw columns/sex encoding, missingness, participant linkage,
raw proxy event reconstruction, event indicators and frozen folds are checked in --verify.
Event counts remain369 recorded-CVD,218 death before recorded CVD (cause unverified),3604 censored.
Five folds remain839/838/838/838/838. Original exact-endpoint file is unchanged with its outcomes unavailable.
See validation.json and alcohol_summary.csv for actual results; metadata.json lists all28 predictors explicitly.

The beverage field is nominal. A future R pipeline must declare factor levels
none,beer,wine,spirits,country_liquor; do not treat these as an ordered numeric scale.
Use the explicit28-feature list, not legacy first26-column selection. Exclude all six metadata/outcome fields.
Keep existing preprocessing inside training folds. No global imputation, new model fitting or performance evaluation was performed.
Serving size is a deterministic function of beverage type in this version, so it supplies no independent information;
both new variables encode assumptions, and importance estimates could be redundant or simulator-dependent.
The legacy weekly-drinks unit has no verified harmonization with these PURE reference servings.
Do not multiply them to claim measured beverage volume or ethanol exposure, or recalculate the existing alcohol features.
Eighteen of28 predictors are now synthetic. Six inherited synthetic recipes remain unresolved;
no new outcome leakage is introduced, but their original leakage status cannot be independently certified.
These outcomes remain provisional recorded-CVD/all-cause-death proxies, not the exact MI/stroke/HF/CV-death or confirmed non-CVD-death endpoints.

## Reproduction
Run python analysis/scripts/reconstruction_26/expand_alcohol_28.py for initial creation (refuses existing outputs).
Run python analysis/scripts/reconstruction_26/expand_alcohol_28.py --verify for repeatable read-only validation.
Run python -m unittest discover -s analysis/scripts/reconstruction_26 -p test_alcohol_28.py -v for semantic tests.
No superiority or clinical-validity conclusion follows from this expansion.
''',encoding='utf-8')
    print(json.dumps(facts,indent=2))

if __name__=='__main__':main()
