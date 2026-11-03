"""Read-only source audit; create a new, non-deployable experimental run."""
from pathlib import Path
import hashlib, json, sys
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'analysis/results/rsf27_proxy_20261103_v1'
sys.path.insert(0, str(ROOT / 'analysis/scripts/reconstruction_26'))
from engineer_27 import PREDICTORS, DEST, SOURCE, INPUTS, NEW, META, OBS, engineer

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    assert not OUT.exists(), 'Use a new version directory; never overwrite an experiment.'
    d = pd.read_csv(DEST).sort_values('participant_id').reset_index(drop=True)
    assert d.shape==(4191,33) and d.participant_id.is_unique
    assert list(d.columns)==PREDICTORS+META and d[META].notna().all().all()
    original = pd.read_csv(SOURCE).sort_values('participant_id').reset_index(drop=True)
    retained=[c for c in PREDICTORS+META if c not in NEW]
    pd.testing.assert_frame_equal(d[retained],original[retained])
    derived,_=engineer(original[INPUTS])
    pd.testing.assert_frame_equal(d[NEW],derived)
    frozen=pd.read_csv(ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv').sort_values('participant_id').reset_index(drop=True)
    pd.testing.assert_frame_equal(d[META],frozen[META])
    old=json.loads((ROOT/'analysis/reports/questionnaire_27_engineered_20261103_v1/protected_sha256.json').read_text())
    changed=[p for p,h in old.items() if digest(ROOT/p)!=h]
    assert all(p.startswith('src/') for p in changed), changed
    validation=dict(status='PASS',participants=len(d),columns=len(d.columns),predictors=27,
        event_counts=d.event_type.value_counts().sort_index().to_dict(),
        fold_counts=d.outer_fold.value_counts().sort_index().to_dict(),
        missing_by_predictor=d[PREDICTORS].isna().sum().to_dict(),
        historical_verifier_note='Original broad checksum check fails only for subsequent frontend edits; all data/model/research checksums match.',
        changed_frontend_since_historical_audit=changed)
    raw = pd.read_csv(ROOT/'data/raw/framingham.csv')
    b = raw.loc[raw.PERIOD.eq(1)].set_index('RANDID').loc[d.participant_id].reset_index()
    for c,r in OBS.items():
        if c in d: np.testing.assert_allclose(d[c],b[r],equal_nan=True,rtol=0,atol=0)
    np.testing.assert_array_equal(d.sex_male,b.SEX.eq(1).astype(int))
    np.testing.assert_allclose(d.current_smoking_intensity_cigs_day,b.CIGPDAY.where(b.CURSMOKE.eq(1),0),equal_nan=True)
    assert b.AGE.between(35,70).all() and b.PREVCHD.eq(0).all() and b.PREVSTRK.eq(0).all()
    assert d.event_type.value_counts().to_dict()=={0:3604,1:369,2:218}
    t = np.minimum(np.minimum(b.TIMECVD, b.TIMEDTH), 3652.5)
    e = np.where(b.CVD.eq(1)&b.TIMECVD.le(3652.5)&b.TIMECVD.le(b.TIMEDTH), 1,
                 np.where(b.DEATH.eq(1)&b.TIMEDTH.le(3652.5), 2, 0))
    np.testing.assert_array_equal(t, d.analysis_time_days)
    np.testing.assert_array_equal(e, d.event_type)
    admin = d.event_type.eq(0)&d.analysis_time_days.eq(3652.5)
    assert b.loc[admin, ['TIMECVD','TIMEDTH']].gt(3652.5).all().all()
    inner = pd.read_csv(ROOT/'analysis/modeling/v3_16predictors/v3_inner_fold_assignments.csv')
    for k in range(1,6):
        f = inner.loc[inner.outer_fold.eq(k)]
        assert f.participant_id.is_unique and set(f.inner_fold)=={1,2,3}
        assert set(f.participant_id)==set(d.loc[d.outer_fold.ne(k),'participant_id'])
    OUT.mkdir(parents=True)
    protected = {}
    for folder in ['data','model','analysis/modeling','analysis/results','analysis/reports']:
        for p in (ROOT/folder).rglob('*'):
            if p.is_file() and OUT not in p.parents:
                protected[p.relative_to(ROOT).as_posix()] = digest(p)
    (OUT/'protected_sha256.json').write_text(json.dumps(protected, indent=2))
    (OUT/'predictors.json').write_text(json.dumps(PREDICTORS, indent=2))
    pd.DataFrame({'participant_id':d.participant_id,'complete_at_tau':admin.astype(int),
                  'evaluation_time_days':np.where(admin,3653.5,d.analysis_time_days)}).to_csv(OUT/'evaluation_followup_view.csv',index=False)
    validation.update(raw_outcome_reconstruction='PASS', inner_fold_separation='PASS',
                      complete_at_tau=int(admin.sum()), clinical_prediction_enabled=False)
    (OUT/'data_validation.json').write_text(json.dumps(validation,indent=2))
    d[PREDICTORS].describe(include='all').to_csv(OUT/'predictor_summary.csv')
    manifest = dict(input=str(DEST.relative_to(ROOT)), input_sha256=digest(DEST), seed=20261103,
        endpoint='Recorded CVD; competing death before recorded CVD, cause unknown',
        intended_use='Offline semi-synthetic proxy experiment only', deployment_approved=False,
        folds='Frozen participant-level 5 outer x 3 inner', inner_trees=100, outer_trees=200,
        candidates=[dict(mtry=5,nodesize=15,nsplit=10),dict(mtry=9,nodesize=10,nsplit=5)],
        selection='Minimum mean inner IPCW 10-year Brier; tie first candidate',
        final_fit='Candidate with minimum pooled inner Brier; 200 trees; not an evaluation',
        metrics='Corrected v4 IPCW; quarterly CIF grid, 500 conditional participant bootstrap replicates',
        release_blockers=['SES questionnaire score unavailable: no observed reference/scoring artifact',
            'Synthetic diet score is not equivalent to questionnaire Food6',
            'Synthetic union of passive exposure intervals is not identifiable from questionnaire durations',
            'No exact MI/stroke/HF/CVD-death endpoint or adjudicated non-CVD death',
            'No external observed target-population validation',
            'No backend model-serving infrastructure in current frontend-only phase'])
    (OUT/'protocol.json').write_text(json.dumps(manifest,indent=2))
    print(json.dumps(validation,indent=2))

if __name__=='__main__': main()
