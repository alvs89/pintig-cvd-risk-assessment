"""Read-only audit and new versioned benchmark; never regenerate input data."""
from pathlib import Path
import hashlib, json
import pandas as pd
ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT/'analysis/results/benchmark27_20261105_v1'
RSF = ROOT/'analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    if OUT.exists(): raise FileExistsError('Benchmark exists; use a new version')
    protocol=json.loads((RSF/'protocol.json').read_text())
    data=ROOT/protocol['input']; d=pd.read_csv(data).sort_values('participant_id').reset_index(drop=True)
    assert sha(data)==protocol['input_sha256']
    cols=json.loads((RSF/'predictors.json').read_text())
    assert len(cols)==27 and d.shape==(4191,33) and d.participant_id.is_unique
    assert d.event_type.value_counts().to_dict()=={0:3604,1:369,2:218}
    assert (d.event_major_cvd_10y==d.event_type.eq(1)).all()
    assert (d.event_competing_death_10y==d.event_type.eq(2)).all()
    z=pd.concat([pd.read_csv(RSF/f'fold{k}_oof.csv') for k in range(1,6)]).sort_values('participant_id').reset_index(drop=True)
    pd.testing.assert_frame_equal(d[['participant_id','outer_fold','analysis_time_days','event_type']],z[['participant_id','outer_fold','analysis_time_days','event_type']])
    inner=ROOT/'analysis/modeling/v3_16predictors/v3_inner_fold_assignments.csv'
    f=pd.read_csv(inner)
    for k in range(1,6):
        a=f[f.outer_fold==k]
        assert a.participant_id.is_unique and set(a.inner_fold)=={1,2,3}
        assert set(a.participant_id)==set(d.loc[d.outer_fold!=k,'participant_id'])
    paths=[data,inner,ROOT/'data/processed/questionnaire_27_questionnaire_aligned_20261103_v1/SYNTHETIC_questionnaire_responses.csv',ROOT/'analysis/scripts/rsf27_questionnaire_aligned_v1/train.R']+list(RSF.glob('*'))
    OUT.mkdir(parents=True)
    (OUT/'protected_sha256.json').write_text(json.dumps({str(p.relative_to(ROOT)):sha(p) for p in paths if p.is_file()},indent=2))
    (OUT/'protocol.json').write_text(json.dumps({
        'source_protocol':protocol,'rsf_reused':str(RSF.relative_to(ROOT)),
        'models':['Cause-specific Cox (both causes)','Fine-Gray (cause 1)','RSF (existing OOF)'],
        'candidates':['Linear main effects, smoking nominal','Natural splines df=3 for age and SBP; other main effects unchanged'],
        'selection':'Minimum mean inner-fold corrected IPCW Brier at 3652.5 days; ties prefer linear.',
        'preprocessing':'Reuse exact saved RSF training script fit_ses/impute functions, evaluated as definitions only. PCA, imputation, spline knots and boundary knots learned in each training split.',
        'evaluation':'Same 41 times 0..3652.5 days, corrected IPCW, competing events as controls; paired 500 participant bootstrap conditional on fitted OOF models.',
        'timing':'New model fit seconds recorded separately from preprocessing/prediction. Existing RSF fold elapsed includes tuning, preprocessing and prediction; not pure fit timing or a controlled speed benchmark.',
        'no_rsf_retraining':True,'research_only':True},indent=2))
    d[cols].describe(include='all').to_csv(OUT/'predictor_summary.csv')
    d[cols].isna().sum().to_csv(OUT/'missingness.csv',header=['missing'])
    (OUT/'data_validation.json').write_text(json.dumps({'participants':4191,'predictors':cols,'event_counts':{'0':3604,'1':369,'2':218},'fold_counts':d.outer_fold.value_counts().sort_index().to_dict(),'rsf_oof_linkage':'PASS','inner_fold_separation':'PASS','dataset_hash_verified':True},indent=2))
    print(OUT)
if __name__=='__main__': main()
