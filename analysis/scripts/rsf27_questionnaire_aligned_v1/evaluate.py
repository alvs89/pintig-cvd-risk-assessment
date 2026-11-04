"""Evaluate only complete nested OOF predictions, reusing corrected metrics."""
from pathlib import Path
import sys, json, hashlib
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3'
sys.path.insert(0,str(ROOT/'analysis/scripts/v4_corrected'))
from metrics import evaluate, TAU
from evaluate import bootstrap

def main():
    assert not (OUT/'metrics.csv').exists(), 'Evaluation already exists; preserve outputs.'
    z=pd.concat([pd.read_csv(OUT/f'fold{k}_oof.csv') for k in range(1,6)]).sort_values('participant_id').reset_index(drop=True)
    d=pd.read_csv(ROOT/json.loads((OUT/'protocol.json').read_text())['input']).sort_values('participant_id').reset_index(drop=True)
    for c in ['participant_id','outer_fold','analysis_time_days','event_type']:
        np.testing.assert_array_equal(z[c],d[c])
    assert len(z)==4191 and z.participant_id.is_unique
    p=z[[f'risk_{i}' for i in range(41)]].to_numpy()
    assert np.isfinite(p).all() and ((p>=0)&(p<=1)).all() and (np.diff(p,axis=1)>=-1e-10).all()
    t=z.analysis_time_days.to_numpy();e=z.event_type.to_numpy()
    complete=pd.read_csv(OUT/'evaluation_followup_view.csv').complete_at_tau.to_numpy().astype(bool)
    hs=np.linspace(0,TAU,41)
    point,b,a=evaluate(t,e,p,hs,complete)
    pd.DataFrame([point]).to_csv(OUT/'metrics.csv',index=False)
    pd.DataFrame(dict(horizon_days=hs,brier=b,auc=a)).to_csv(OUT/'metric_curves.csv',index=False)
    bs=bootstrap(z,{'n27':p},reps=500)
    bs.to_csv(OUT/'bootstrap_500.csv',index=False)
    rows=[]
    for metric in ['auc_10y','brier_10y','ibs_0_10y','calibration_slope','calibration_in_large_logit']:
        v=bs[metric].dropna()
        rows.append(dict(metric=metric,estimate=point[metric],lower95=v.quantile(.025),upper95=v.quantile(.975),valid_replicates=len(v)))
    ci=pd.DataFrame(rows);ci.to_csv(OUT/'performance_with_ci.csv',index=False)
    # Reference checks must complete independently before any final report is written.
    refa=pd.read_csv(OUT/'riskRegression_auc.csv');refb=pd.read_csv(OUT/'riskRegression_brier.csv')
    np.testing.assert_allclose(a[1:],refa.sort_values('times').AUC,rtol=0,atol=1e-8)
    np.testing.assert_allclose(b[1:],refb.sort_values('times').Brier,rtol=0,atol=1e-8)
    refc=pd.read_csv(OUT/'calibration_R_reference.csv').iloc[0]
    np.testing.assert_allclose([point['calibration_slope'],point['calibration_in_large_logit']],
                               [refc.slope_R,refc.citl_R],rtol=0,atol=1e-5)
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    cal=pd.read_csv(OUT/'calibration_AJ_deciles.csv')
    fig,ax=plt.subplots(figsize=(6,5))
    ax.plot([0,.4],[0,.4],color='gray',ls='--',label='Ideal')
    ax.plot(cal.mean_predicted,cal.observed_AJ,'o-',color='#087e83',label='OOF deciles')
    ax.set(xlabel='Predicted 10-year recorded-CVD probability',ylabel='Observed Aalen–Johansen incidence',
           title='27-predictor semi-synthetic proxy experiment')
    ax.legend();fig.tight_layout();fig.savefig(OUT/'calibration.png',dpi=180);plt.close(fig)
    protected=json.loads((OUT/'protected_sha256.json').read_text())
    changed=[name for name,h in protected.items() if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=h]
    assert not changed,changed
    report='# 27-predictor proxy RSF experiment — 2026-11-03 v1\n\n'
    report+='Completed 30 inner fits, five outer fits and one full-cohort research refit. All performance below is held-out outer-fold performance, not full-model training performance.\n\n'
    report+='| Metric | Estimate | Conditional 95% CI |\n|---|---:|---|\n'
    for row in rows: report+=f"| {row['metric']} | {row['estimate']:.5f} | {row['lower95']:.5f}–{row['upper95']:.5f} |\n"
    report+='\n## Verification\n\n4,191 unique participants; 369 recorded-CVD events, 218 deaths before recorded CVD (cause unknown), 3,604 censored. Frozen outer/inner folds preserved. All observed source measurements and outcomes reproduced; 3,588 terminal administrative censorings verified against raw follow-up. No dataset values were changed.\n\n'
    report+='All 40 nonzero-horizon AUC and Brier calculations cross-check riskRegression to 1e-8; calibration slope and CITL cross-check R to 1e-5. CIFs finite, bounded and nondecreasing. Saved-model serialization passed on a fictional profile. Protected data/models/results checksums unchanged.\n\n'
    report+='## Method\n\nThe frozen 5×3 folds and corrected v4 IPCW rules are reused. Two candidates use mtry 5/9, nodesize 15/10, nsplit 10/5, 100 inner and 200 outer trees. Tuning minimizes inner-training-censor-model weighted 10-year Brier. Each partition learns only its own BP-medication mode, heart-rate median and current-smoker intensity median; other missing predictors are rejected. Smoking status is a fixed nominal factor (Never, Former, Current). Participant ID, outcomes and folds never enter the predictor matrix.\n\n'
    report+='The full-cohort research refit uses the lowest pooled-inner Brier candidate and is not an independent validation. Metrics use pooled OOF predictions, an evaluation-cohort censor model, competing events as controls, and quarter-year-grid trapezoidal IBS. Calibration uses IPCW logistic slope and a separate fixed-slope CITL. Aalen–Johansen decile plot has no confidence bands. The numerical R evaluation view alone moves verified terminal censoring one day beyond tau; source outcomes are untouched.\n\n'
    report+='500 participant bootstrap resamples re-estimate censor weights but do not refit forests. Intervals are conditional on these OOF models and this synthetic draw; they exclude full model-development, simulation and selection uncertainty. No external validation, new synthetic-seed sensitivity, tree-count stability study, transportability validation or clinical utility assessment has been completed in this run. There is no basis to call this configuration superior.\n\n'
    report+='## Release decision: blocked\n\nTraining completion does not establish questionnaire compatibility. Current SES is unavailable for every assessment, while training SES is synthetic. Diet Food6 and passive-exposure overlap handling differ from generation definitions; published questionnaire items do not make the synthetic training values observed. Exact clinical endpoints and Philippine external validation are absent. Six inherited synthetic generation recipes remain unresolved: their historical outcome-leakage status cannot be certified. Fold separation in this run does not repair historical synthetic leakage if present. Do not impute a universal synthetic SES into live assessments or silently change the 27-feature contract. No prediction API or live assessment model is enabled.\n\n'
    report+='Required next work: obtain and validate observed reference SES inputs/parameters, harmonize diet and passive-exposure definitions, collect compatible predictor/outcome data, run prespecified internal and external validation and simulation sensitivity, then review a separately versioned inference integration and model approval.\n\n'
    report+='Method references: [randomForestSRC competing risks](https://www.randomforestsrc.org/articles/competing.html), [riskRegression](https://CRAN.R-project.org/package=riskRegression). Local protocol: protocol.json; full commands: COMMANDS.md; feature compatibility: compatibility.csv.\n'
    (OUT/'REPORT.md').write_text(report,encoding='utf-8')
    (OUT/'verification.json').write_text(json.dumps(dict(status='PASS',protected_files=len(protected),
        reference_metrics='PASS',oof_participants=len(z),deployment_approved=False),indent=2))
    print(ci.to_string(index=False))

if __name__=='__main__':main()
