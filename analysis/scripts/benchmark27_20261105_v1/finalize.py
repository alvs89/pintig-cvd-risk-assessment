from pathlib import Path
import json,hashlib
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'analysis/results/benchmark27_20261105_v1'
def main():
    assert not (OUT/'REPORT.md').exists()
    curves=pd.read_csv(OUT/'metric_curves.csv');m=pd.read_csv(OUT/'metrics.csv').set_index('model')
    errors={}
    for metric,column in [('auc','AUC'),('brier','Brier')]:
        ref=pd.read_csv(OUT/f'riskRegression_{metric}.csv')
        for name in m.index:
            a=curves[(curves.model==name)&(curves.days>0)].sort_values('days')[metric].to_numpy()
            b=ref[ref.model==name].sort_values('times')[column].to_numpy()
            np.testing.assert_allclose(a,b,rtol=0,atol=1e-8);errors[f'{name}_{metric}']=float(np.max(abs(a-b)))
    cal=pd.read_csv(OUT/'calibration_R_reference.csv').set_index('model')
    np.testing.assert_allclose(m.loc[cal.index,'calibration_slope'],cal.slope_R,atol=1e-5,rtol=0)
    protected=json.loads((OUT/'protected_sha256.json').read_text())
    assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in protected.items())
    ci=pd.read_csv(OUT/'performance_with_ci.csv');times=pd.read_csv(OUT/'training_time_summary.csv').set_index('model')
    report=['# PINTIG latest 27-predictor benchmark — 2026-11-05 v1','',
    'Completed benchmarking only: cause-specific Cox, Fine–Gray and reused RSF outer-fold predictions. No RSF retraining, model replacement, source-data change or prediction integration is part of this benchmark.','',
    'All models use the same 4,191 participants, 27 named predictors, recorded-CVD proxy events (369), death-before-CVD events with unverified cause (218), censoring (3,604), 3,652.5-day horizon, five frozen outer folds and three frozen inner folds.','',
    '| Model | 10-year AUC (95% CI) | Brier (95% CI) | IBS (95% CI) | Calibration slope (95% CI) |',
    '|---|---|---|---|---|']
    for name in ['RSF','Cox','FineGray']:
        cells=[]
        for metric in ['auc_10y','brier_10y','ibs_0_10y','calibration_slope']:
            r=ci[(ci.model==name)&(ci.metric==metric)].iloc[0];cells.append(f'{r.estimate:.5f} ({r.lower95:.5f}–{r.upper95:.5f})')
        report.append('| '+' | '.join([name]+cells)+' |')
    report+=['','## Timing','', '| Model | Inner fitting (s) | Outer fitting (s) | Total fold pipelines (s) |','|---|---:|---:|---:|']
    for name in ['RSF','Cox','FineGray']:
        r=times.loc[name];fmt=lambda x:'Unavailable' if pd.isna(x) else f'{x:.2f}'
        report.append(f'| {name} | {fmt(r.inner_fit_seconds)} | {fmt(r.outer_fit_seconds)} | {r.pipeline_seconds:.2f} |')
    report+=['','New Cox/Fine–Gray timing covers 30 inner and five outer fits per model, with preprocessing and prediction overhead reported separately through pipeline elapsed time. RSF time is historical fold elapsed (98.28 s), including preprocessing, tuning and prediction; pure RSF fitting time is unavailable. These are not controlled same-session speed comparisons. No timing confidence interval is justified by a single execution. No full-cohort refit was needed for benchmarking.','',
    '## Comparable evaluation and leakage controls','',
    '- The RSF dataset SHA-256 matches its recorded protocol. All OOF IDs, folds, times and event codes match exactly. The saved RSF metrics reproduce to 1e-10; reuse is supported for predictive performance.',
    '- The benchmark evaluates only the exact `fit_ses` and `impute` definitions from the existing RSF training script. Each training partition independently fits education one-hot/income PCA and its percentile reference, and the mode/median imputers. No full-cohort descriptor SES enters fitting.',
    '- Cox fits separate proportional-hazards models for both causes and combines their hazards into cause-1 CIF; it does not use 1 minus cause-1 survival. Fine–Gray fits the cause-1 subdistribution hazard with cause 2 retained as competing events.',
    '- Each regression model compares two prespecified candidates: all 27 predictors with linear continuous effects, or natural splines (3 df) for age and SBP with the other effects unchanged. Smoking remains nominal. Spline knots and boundaries are estimated only from each training partition. These are basis transformations of the same predictors, not added patient variables.',
    '- Selection minimizes mean inner-fold corrected IPCW ten-year Brier, with linear candidate preferred on ties. Two candidates match the RSF search count, but do not imply equal model complexity or search difficulty.',
    '- Outer-fold evaluation uses the same corrected reverse-KM IPCW convention, competing events as controls, 41 time points from 0 to 10 years, and trapezoidal IBS. Only verified terminal administrative censoring is treated as complete through the horizon.',
    '- Independent riskRegression checks match all three models’ 40 nonzero-time AUC/Brier values within 1e-8; weighted calibration slopes match within 1e-5.',
    '- All 500 paired participant bootstrap replicates are usable for all metrics. They re-estimate censoring weights but do not refit models. Intervals condition on fitted OOF models and this synthetic draw.','',
    '## Paired comparisons against RSF','',
    '| Model | Metric | Difference (model minus RSF) | Paired 95% CI |','|---|---|---:|---|']
    diff=pd.read_csv(OUT/'paired_differences_vs_RSF.csv')
    for _,r in diff[(diff.model!='RSF')&(diff.metric.isin(['auc_10y','brier_10y','ibs_0_10y','calibration_slope']))].iterrows():report.append(f'| {r.model} | {r.metric} | {r.difference:.5f} | {r.lower95:.5f}–{r.upper95:.5f} |')
    warnings=pd.read_csv(OUT/'warnings.csv') if (OUT/'warnings.csv').exists() else pd.DataFrame()
    ph=pd.read_csv(OUT/'cox_ph_diagnostics.csv');globalph=ph[ph.term=='GLOBAL']
    report+=['','## Limitations and interpretation','',
    'Small AUC improvements do not establish overall superiority; inspect paired differences and calibration together. Lower Brier/IBS is better; calibration slope is interpreted relative to 1, not maximized.',
    f'Cox emitted {len(warnings)} warnings in outer fold 2 / inner fold 3 across the two candidate specifications (duplicate warnings during fitting): coefficients may be infinite because of sparse event/covariate patterns. Fitted coefficients and predictions remained finite, but the instability is material and is retained in warnings.csv. No failed fit was silently dropped.',
    f'Post-fit Cox PH diagnostics: {len(globalph)} global tests, minimum p={globalph.p.min():.6g}. Tests are descriptive, not tuning criteria, and correlated across folds. Fine–Gray proportional subdistribution-hazard assumptions were not formally tested in this benchmark.',
    'The cohort is semi-synthetic and the outcomes are proxies. No independent Philippine validation, clinical utility assessment, simulation-seed sensitivity, full development bootstrap or tree-count stability analysis was performed. Training-fold preprocessing cannot make synthetic baseline data genuine observations.',
    'The dataset generator used a full-cohort synthetic SES descriptor when generating other synthetic features; this fixed generation assumption is shared by all models and is distinct from training-time SES fitting. Uncertainty from that synthetic generation is not represented by these intervals.',
    'The historical RSF report contains copied text and stale compatibility explanations. This benchmark relies on the actual saved protocol, code, hashes and OOF predictions, not that narrative. Existing artifacts were preserved.',
    'CIG integration is audited separately. The current frontend SES, grain-portion scoring and exposure definitions do not establish exact compatibility with this trained model; benchmarking does not authorize a patient graph.',
    '', '## Reproduction','',
    '1. `python analysis/scripts/benchmark27_20261105_v1/prepare.py`',
    '2. `& "C:\\Program Files\\R\\R-4.6.1\\bin\\Rscript.exe" analysis/scripts/benchmark27_20261105_v1/train.R`',
    '3. `python analysis/scripts/benchmark27_20261105_v1/evaluate.py`',
    '4. `& "C:\\Program Files\\R\\R-4.6.1\\bin\\Rscript.exe" analysis/scripts/benchmark27_20261105_v1/reference.R`',
    '5. `python analysis/scripts/benchmark27_20261105_v1/finalize.py`','',
    'Use a new version directory to repeat; scripts refuse to overwrite completed artifacts. Final files are enumerated in files_manifest.csv.',
    '', 'Method reference: https://cran.r-project.org/package=riskRegression (CSC, FGR, predictRisk, Score).']
    (OUT/'REPORT.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
    import matplotlib;matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plot=pd.read_csv(OUT/'calibration_deciles.csv');fig,ax=plt.subplots(figsize=(7,5))
    ax.plot([0,.4],[0,.4],'--',color='gray')
    for name,g in plot.groupby('model'):ax.plot(g.predicted,g.observed,'o-',label=name)
    ax.set(xlabel='Mean OOF predicted 10-year probability',ylabel='Observed Aalen–Johansen incidence',title='27-predictor proxy benchmark: calibration');ax.legend();fig.tight_layout();fig.savefig(OUT/'calibration.png',dpi=180);plt.close(fig)
    verification=json.loads((OUT/'verification.json').read_text());verification['riskRegression_max_abs_errors']=errors;verification['calibration_reference']='PASS';verification['cox_warning_count']=len(warnings)
    (OUT/'verification.json').write_text(json.dumps(verification,indent=2))
    pd.DataFrame([{'file':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.iterdir()) if p.is_file()]).to_csv(OUT/'files_manifest.csv',index=False)
    print('REFERENCE CHECKS AND REPORT PASS')
if __name__=='__main__':main()
