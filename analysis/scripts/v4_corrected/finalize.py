"""Verify artifacts, draw aggregate calibration plots, write an auditable report."""
from pathlib import Path
import json, hashlib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from prepare import ROOT,OUT,digest
from evaluate import score_run

REPORT=ROOT/'analysis/reports/v4_corrected_20261031_v1'

def table(frame):
    # No optional tabulate dependency; aggregates only.
    cols=list(frame.columns)
    def fmt(v):return f'{v:.6f}' if isinstance(v,(float,np.floating)) else str(v)
    return '\n'.join(['| '+' | '.join(cols)+' |','|'+'|'.join(['---']*len(cols))+'|']+['| '+' | '.join(fmt(v) for v in row)+' |' for row in frame.itertuples(index=False,name=None)])

def main():
    REPORT.mkdir(parents=True,exist_ok=True)
    old=json.loads((OUT/'protected_sha256.json').read_text())
    changed=[p for p,h in old.items() if not (ROOT/p).exists() or digest(ROOT/p)!=h]
    assert not changed,changed
    cfg=json.loads((OUT/'configurations.json').read_text())
    m=pd.read_csv(OUT/'corrected_metrics.csv');curves=pd.read_csv(OUT/'corrected_metric_curves.csv')
    ci=pd.read_csv(OUT/'metric_confidence_intervals.csv');diff=pd.read_csv(OUT/'paired_differences_vs_n16.csv')
    rb=pd.read_csv(OUT/'robustness_metrics.csv')
    aj=pd.read_csv(OUT/'calibration_AJ_deciles.csv')
    ra=pd.read_csv(OUT/'riskRegression_auc.csv').rename(columns={'model':'configuration','times':'horizon_days'})
    rr=pd.read_csv(OUT/'riskRegression_brier.csv').rename(columns={'model':'configuration','times':'horizon_days'})
    ac=curves.merge(ra,on=['configuration','horizon_days'],validate='one_to_one')
    bc=curves.merge(rr,on=['configuration','horizon_days'],validate='one_to_one')
    assert len(ac)==440 and len(bc)==440
    da=float(abs(ac.auc-ac.AUC).max());db=float(abs(bc.brier-bc.Brier).max())
    assert da<1e-8 and db<1e-8
    r_ibs={nm:float(np.trapezoid(np.r_[0,g.sort_values('horizon_days').Brier],np.r_[0,g.sort_values('horizon_days').horizon_days])/3652.5) for nm,g in rr.groupby('configuration',observed=True)}
    dibs=float(max(abs(row.ibs_0_10y-r_ibs[row.configuration]) for row in m.itertuples()))
    assert dibs<1e-8
    rc=pd.read_csv(OUT/'calibration_R_reference.csv');cc=m.merge(rc,on='configuration',validate='one_to_one')
    ds=float(abs(cc.calibration_slope-cc.slope_R).max());dc=float(abs(cc.calibration_in_large_logit-cc.citl_R).max())
    assert ds<1e-5 and dc<1e-5 and cc.converged.all()
    assert len(m)==11 and ci.valid_replicates.eq(500).all() and diff.valid_replicates.eq(500).all()
    frozen=pd.read_csv(ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv')
    inner=pd.read_csv(ROOT/'analysis/modeling/v3_16predictors/v3_inner_fold_assignments.csv')
    audit=[];normalized_imputers=[]
    for outer in range(1,6):
        inf=inner[inner.outer_fold==outer];tr=frozen[frozen.outer_fold!=outer]
        assert inf.participant_id.is_unique and set(inf.participant_id)==set(tr.participant_id)
        for nm in cfg:
            prefix=OUT/'primary_train20265000'/f'{nm}_fold{outer}'
            tuning=pd.read_csv(str(prefix)+'_tuning.csv');imps=pd.read_csv(str(prefix)+'_imputation.csv');sel=pd.read_csv(str(prefix)+'_selected.csv')
            if 'V5' in imps:
                # data.table expanded the logged named list into three ordered
                # scalar rows. Preserve logs; normalize using the shared helper's
                # explicit list order, then verify each scalar against training.
                normalized=[]
                for key,g in imps.groupby(['configuration','outer_fold','inner_fold','candidate'],sort=False):
                    assert len(g)==3
                    normalized.append(dict(zip(['configuration','outer_fold','inner_fold','candidate'],key))|dict(zip(['bp_medication_mode','current_smoker_cigarettes_per_day_median','heart_rate_bpm_median'],g.V5)))
                imps=pd.DataFrame(normalized)
            normalized_imputers.append(imps)
            assert len(tuning)==6 and set(tuning.inner_fold)=={1,2,3} and set(tuning.candidate)=={1,2}
            best=tuning.groupby('candidate').brier.mean().sort_values(kind='stable').index[0]
            assert best==sel.candidate.iloc[0]
            for row in imps.itertuples():
                source=tr if row.inner_fold==0 else tr[tr.participant_id.isin(inf.loc[inf.inner_fold!=row.inner_fold,'participant_id'])]
                expected=[source.bp_medication.mode().iloc[0],source.loc[source.current_smoker==1,'cigarettes_per_day'].median(),source.heart_rate_bpm.median()]
                actual=[row.bp_medication_mode,row.current_smoker_cigarettes_per_day_median,row.heart_rate_bpm_median]
                np.testing.assert_allclose(actual,expected,rtol=0,atol=1e-12)
            audit.append({'configuration':nm,'outer_fold':outer,'inner_tuning_rows':6,'training_only_imputation':'PASS','selected_hyperparameters':'PASS'})
    pd.DataFrame(audit).to_csv(OUT/'leakage_audit.csv',index=False)
    pd.concat(normalized_imputers).to_csv(OUT/'training_imputers_normalized.csv',index=False)
    selected=json.loads((OUT/'robustness_selected.json').read_text())['configurations']
    expected_runs=['primary_train20265000','original_draw_train20265001']+[f'seed{s}_{regime}_train{seed}' for s in [20261031,20261101] for regime in ['original','weakdependence'] for seed in [20265000,20265001]]
    assert set(rb.run)==set(expected_runs) and len(rb)==len(selected)*10
    robust_audit=[]
    for run in expected_runs[1:]:
        for nm in selected:
            for outer in range(1,6):
                tr=frozen[frozen.outer_fold!=outer]
                log=pd.read_csv(OUT/run/f'{nm}_fold{outer}_imputation.csv')
                vals=log.V5.to_numpy() if 'V5' in log else log[['bp_medication_mode','current_smoker_cigarettes_per_day_median','heart_rate_bpm_median']].iloc[0].to_numpy()
                expected=[tr.bp_medication.mode().iloc[0],tr.loc[tr.current_smoker==1,'cigarettes_per_day'].median(),tr.heart_rate_bpm.median()]
                np.testing.assert_allclose(vals,expected,rtol=0,atol=1e-12)
                assert log.inner_fold.eq(0).all()
                hp=pd.read_csv(OUT/run/f'{nm}_fold{outer}_selected.csv')
                refhp=pd.read_csv(OUT/'primary_train20265000'/f'{nm}_fold{outer}_selected.csv')
                pd.testing.assert_frame_equal(hp,refhp)
                robust_audit.append({'run':run,'configuration':nm,'outer_fold':outer,'training_only_imputation':'PASS','fixed_primary_hyperparameters':'PASS'})
    pd.DataFrame(robust_audit).to_csv(OUT/'robustness_leakage_audit.csv',index=False)
    # Same baseline predictors and same training RNG must reproduce baseline OOF.
    _,baseline,_m,_c=score_run(OUT/'primary_train20265000',['n16'])
    _,baseline2,_m,_c=score_run(OUT/'original_draw_train20265001',['n16'])
    baseline_repro=[]
    for run in expected_runs[2:]:
        _,p,_,_=score_run(OUT/run,['n16'])
        ref=baseline if run.endswith('20265000') else baseline2
        delta=float(np.max(abs(p['n16']-ref['n16'])))
        # rfsrc OpenMP scheduling can introduce tiny float variation.
        assert delta<1e-10,(run,delta)
        baseline_repro.append({'run':run,'maximum_baseline_prediction_difference':delta})
    pd.DataFrame(baseline_repro).to_csv(OUT/'training_rng_isolation.csv',index=False)
    comparisons=[];training_effects=[]
    metric_names=['auc_10y','brier_10y','ibs_0_10y']
    for run,g in rb.groupby('run'):
        seed=run.rsplit('_train',1)[1]
        ref_run='primary_train20265000' if seed=='20265000' else 'original_draw_train20265001'
        base=g.set_index('configuration').loc['n16']
        ref=rb[rb.run==ref_run].set_index('configuration')
        for row in g.itertuples():
            comparisons.append({'run':run,'configuration':row.configuration,**{f'delta_{k}_vs_n16':getattr(row,k)-base[k] for k in metric_names},**{f'synthetic_change_{k}_same_training_seed':getattr(row,k)-ref.loc[row.configuration,k] for k in metric_names}})
    scenarios=['original_draw']+[f'seed{s}_{regime}' for s in [20261031,20261101] for regime in ['original','weakdependence']]
    for scenario in scenarios:
        r0='primary_train20265000' if scenario=='original_draw' else scenario+'_train20265000'
        r1=scenario+'_train20265001';a=rb[rb.run==r0].set_index('configuration');b=rb[rb.run==r1].set_index('configuration')
        for nm in selected:training_effects.append({'scenario':scenario,'configuration':nm,**{f'training_seed_delta_{k}':b.loc[nm,k]-a.loc[nm,k] for k in metric_names}})
    comp=pd.DataFrame(comparisons);comp.to_csv(OUT/'robustness_paired_comparisons.csv',index=False)
    pd.DataFrame(training_effects).to_csv(OUT/'training_seed_effects.csv',index=False)
    checks={'protected_files_checked':len(old),'protected_files_changed':changed,'outer_fits':55,'inner_fits':330,
            'robustness_fits':9*5*len(selected),'auc_reference_max_abs_difference':da,'brier_reference_max_abs_difference':db,
            'ibs_reference_max_abs_difference':dibs,'slope_reference_max_abs_difference':ds,'citl_reference_max_abs_difference':dc,'bootstrap_replicates':500,
            'all_metric_ci_replicates_valid':True,'training_only_imputation_and_fold_audit':'PASS','robustness_imputation_and_fixed_hyperparameters':'PASS','baseline_rng_isolation':'PASS'}
    (OUT/'final_verification.json').write_text(json.dumps(checks,indent=2))
    # Aalen-Johansen calibration plots; no participant records are plotted.
    plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False})
    fig,axes=plt.subplots(3,4,figsize=(15,11),sharex=True,sharey=True)
    for ax,nm in zip(axes.flat,cfg):
        g=aj[aj.configuration==nm]
        ax.plot([0,.4],[0,.4],color='#89939c',ls='--',lw=1)
        ax.plot(g.mean_predicted,g.observed_AJ,'o-',color='#087e8b',ms=4,lw=1.2)
        ax.set_title(f'{nm[1:]} predictors');ax.set_xlim(0,.4);ax.set_ylim(0,.4);ax.grid(alpha=.15)
    axes.flat[-1].axis('off');fig.supxlabel('Mean predicted ten-year probability');fig.supylabel('Observed ten-year CVD CIF (Aalen–Johansen)')
    fig.suptitle('Corrected out-of-fold calibration · semi-synthetic Framingham',fontsize=16)
    fig.tight_layout(rect=(.02,.02,1,.96));fig.savefig(REPORT/'calibration.png',dpi=180);fig.savefig(REPORT/'calibration.svg');plt.close(fig)
    # Compact complete comparison with confidence intervals for every requested metric.
    ciidx=ci.set_index(['configuration','metric']);display=[]
    for row in m.sort_values('n_predictors').itertuples():
        rr={'Predictors':row.n_predictors}
        for label,k in [('AUC','auc_10y'),('Brier','brier_10y'),('IBS 0–10y','ibs_0_10y'),('Calibration slope','calibration_slope'),('CITL (logit)','calibration_in_large_logit')]:
            lim=ciidx.loc[(row.configuration,k)];rr[label]=f'{getattr(row,k):.5f} [{lim.lower95:.5f}, {lim.upper95:.5f}]'
        display.append(rr)
    pd.DataFrame(display).to_csv(REPORT/'comparison_with_95CI.csv',index=False)
    m.to_csv(REPORT/'corrected_metrics.csv',index=False);diff.to_csv(REPORT/'paired_differences_vs_n16.csv',index=False)
    pd.read_csv(OUT/'configurations.csv').to_csv(REPORT/'configurations.csv',index=False)
    ranked=m.sort_values(['ibs_0_10y','brier_10y','n_predictors']);leader=ranked.configuration.iloc[0]
    robust_summary=comp.groupby('configuration').agg(auc_delta_min=('delta_auc_10y_vs_n16','min'),auc_delta_max=('delta_auc_10y_vs_n16','max'),brier_delta_min=('delta_brier_10y_vs_n16','min'),brier_delta_max=('delta_brier_10y_vs_n16','max'),ibs_delta_min=('delta_ibs_0_10y_vs_n16','min'),ibs_delta_max=('delta_ibs_0_10y_vs_n16','max')).reset_index()
    robust_summary.to_csv(REPORT/'robustness_summary.csv',index=False)
    significant=[]
    for nm in selected:
        if nm=='n16':continue
        di=diff[(diff.configuration==nm)&(diff.metric=='ibs_0_10y')].iloc[0]
        rg=comp[comp.configuration==nm]
        if di.upper95<0 and rg.delta_ibs_0_10y_vs_n16.max()<0 and rg.delta_brier_10y_vs_n16.max()<0:significant.append(nm)
    recommendation=next((nm for nm in ranked.configuration if nm in significant),'n16')
    text=f'''# PINTIG corrected v4 evaluation — 2026-10-31, version 1

## Execution status
Completed {checks['inner_fits']} inner fits and {checks['outer_fits']} outer fits for all 11 configurations; {checks['robustness_fits']} fixed-hyperparameter robustness fits; 500 paired participant bootstrap resamples. No deployed model, questionnaire, clinical thresholds, raw/frozen dataset, or previous experiment output was changed. This is a semi-synthetic methodological experiment, not clinical validation.

## Horizon investigation and endpoint
Raw baseline linkage reconstructed every stored analysis time and event code without mismatch. All 3,588 administratively censored records at day 3652.5 have both raw TIMECVD and TIMEDTH beyond that day (minimum 3655). Thus they are known event-free through ten years for the recorded CVD endpoint. Sixteen other participants were censored earlier. Recorded totals remain 369 CVD events, 218 deaths before CVD and 3,604 censored. CVD-first precedence is retained for 55 same-day CVD/death records.

The original CVD composite and unclassified competing death are retained. They do not establish the intended PURE composite including heart failure or verified non-CVD death. The official teaching dataset documentation also identifies its anonymization and publication-use limitations; this work must be described accordingly.

## Corrections and protocol
- Cases are cause 1 at or before h; controls include competing events at or before h and participants known event-free through h. Early-censored observations receive zero horizon weight. Verified terminal censoring at h receives the event-free weight. Ordinary unverified censoring exactly at h is not silently presumed complete.
- IPCW uses reverse Kaplan–Meier with event-before-censor tie ordering: event weights use G(T-); horizon controls use G(h), or G(h-) at the verified terminal administrative cut. No artificial clipping hides positivity failures.
- For the independent R reference only, an explicit evaluation view places verified administrative censoring at h+1 day, within documented raw follow-up. This is a numerical transport convention, not a replacement clinical event or censoring record. All scoring horizons remain <=h.
- Identical five outer folds and the saved v3 three-way inner assignments are reused for every configuration. Original v4 generated different inner assignments; this run deliberately reuses the established saved v3 assignments. No outer test record participates in inner tuning.
- The existing v3 imputer learns BP-medication mode, smoker-specific cigarettes/day median and heart-rate median from each training partition. No global imputation or outcome imputation is used. Inner IPCW censoring distributions are also fitted on inner training data only.
- Every configuration uses the same two-candidate tuning budget: mtry=floor(sqrt(p)), nodesize=15, nsplit=10; or mtry=floor(p/3), nodesize=10, nsplit=5. Inner forests have 100 trees; outer forests 200, with logrankCR/cause 1. Select minimum mean inner IPCW ten-year Brier. This is focused tuning, not exhaustive optimization. All candidate scores, selected parameters and imputers are saved.
- Predictions are target-event CIFs at zero plus 40 quarterly horizons. IBS uses trapezoidal integration from 0 to 10 years, including zero baseline risk; it is a numerical approximation on this grid, not exact continuous integration.
- AUC controls include competing events (cumulative/dynamic competing-risk AUC). Outer OOF evaluation estimates the censoring distribution on the evaluation cohort; this is outcome-based scoring, not training leakage.
- Calibration slope is an IPCW-weighted logistic regression of the ten-year indicator on logit(predicted CIF), jointly estimating intercept and slope. CITL separately fits an intercept with slope fixed to one; ideal slope=1 and CITL=0. This differs from both the former approximate cloglog regression and the v3 Fine–Gray coefficient. Aalen–Johansen risk-decile plots provide an independent descriptive calibration check. Plot points have no confidence bands.
- Paired 95% percentile intervals use the SAME 500 participant resamples for all configurations and re-estimate censoring weights. All intervals below are conditional on fitted OOF models and this synthetic draw. Models are not refitted in the bootstrap, and intervals do not cover full development/selection/simulation uncertainty or multiplicity.

## Complete corrected comparison
Values are estimate [95% conditional percentile CI].

{table(pd.DataFrame(display))}

## Predictor configurations
{table(pd.read_csv(OUT/'configurations.csv'))}

The 18- and 20-predictor configurations preserve the earlier smoking and behavior groups; the sequence is NOT a monotonic forward-selection path. Six of the baseline predictors and all ten extra candidate fields are synthetic. Observed measurements, derived sex coding, training-fold imputation and synthetic generation remain distinct in the audit.

## Paired differences versus n16
Negative Brier/IBS differences favor the expanded configuration; positive AUC differences favor it. All five metrics and intervals are in paired_differences_vs_n16.csv.

{table(diff[diff.metric.isin(['auc_10y','brier_10y','ibs_0_10y'])][['configuration','metric','point_difference','lower95','upper95']])}

## Robustness and isolated sources of variation
The baseline plus the two lowest-IBS configurations (duplicates removed) were selected for exploratory robustness: {', '.join(selected)}. This post-OOF choice is exploratory and does not create a new unbiased validation sample.

Two existing synthetic-data seeds (20261031, 20261101) are reused. A second per-participant generator preserves established formulas/bounds but halves the specified baseline-dependence coefficients and increases continuous noise SD by 25%; these are illustrative assumption checks, not empirically established joint distributions. Every scenario is fitted under two training seeds with original outer-fold selected hyperparameters held fixed. This cleanly exposes simulation and fitting changes but does not repeat nested hyperparameter selection under each scenario. A second training seed on the original draw isolates algorithm variability. Baseline predictions reproduce at each fixed training seed when only added synthetic fields change.

{table(robust_summary)}

Detailed same-training-seed simulation changes are in robustness_paired_comparisons.csv; same-scenario training-seed changes are in training_seed_effects.csv. Preliminary stratified donor-permutation scenario files were prepared but NOT used for training; independent per-participant weak-dependence scenarios avoid donor transfer across folds. All prepared files remain separately versioned and labeled in the manifest.

## Provisional decision
The lowest corrected single-draw IBS is from **{leader}**. Under the hypothetical assumption that all predictors were genuine measurements, the conservative provisional recommendation is **{recommendation}**: the smallest reference is retained unless an expanded candidate has a paired IBS interval entirely below zero and improves IBS and Brier throughout the evaluated robustness runs. This decision rule is exploratory, not a confirmatory model-selection test. The counterfactual cannot turn synthetic evidence into evidence about real measured predictor utility; independent observed-data validation is still necessary.

For the actual experiment, no expanded questionnaire or deployed model is justified. The frozen 16-predictor configuration remains a research reference and itself contains six synthetic fields. Apparent gains in simulated extra fields describe this generator and training procedure, not clinical incremental value in PURE Philippines.

## Verification
{table(pd.DataFrame([checks]))}

Every primary configuration has complete, unique held-out predictions for all 4,191 participants with preserved outcomes/folds, finite bounded monotone CIFs, and all 330 inner scores. Independent R riskRegression AUC/Brier checks cover 440 model/horizon combinations; R calibration fits converge. Protected-file hashes cover datasets, prior experiments, fitted artifacts and frontend/legacy sources. Boundary tests exercise censoring/CVD/competing events at time<h, time=h and time>h, including training-only weighting and imputation safeguards. Final frontend/test command outcomes are recorded in COMMANDS.md and final_checks.json.

## Remaining limitations and next steps
- No Philippine external validation, verified complete target endpoint, measured replacement for synthetic fields, or empirically justified synthetic joint distribution.
- The original six synthetic features are inherited from the frozen cohort; their original generation process was not independently reconstructed. The established added-feature generator uses a zero fallback for missing cigarette rate when synthesizing pack-years; this is a simulation assumption, not an observed zero or an imputation of the measured cigarettes/day field.
- Small fixed tuning grid, 200-tree final forests, five fixed outer folds, only two alternative simulation seeds and two training seeds; no full model-refit bootstrap or repeated full nested robustness runs.
- All 11 configurations are inspected on the same outer results. Conditional unadjusted intervals cannot certify the chosen winner; selection uncertainty and multiple comparisons remain.
- Marginal independent censoring is assumed. Early censoring is rare (16 participants), but no covariate-dependent censoring sensitivity was run.
- IBS is quarterly-grid numerical integration. Calibration plots are decile summaries, not smooth nonparametric curves with simultaneous bands. No net-benefit or clinical-utility claim is made.
- v3 historical evaluation also passed capped follow-up directly to Score; its previously reported metrics are not independently cleared by this v4 correction. Prior tables remain historical and require separate audited reevaluation before cross-version comparisons.
- Obtain the actual PURE dictionary and longitudinal endpoint/cause-of-death data, validate an observed-only baseline, and preregister the next independently evaluated configuration before any clinical implementation decision.

## Sources
- [Official Framingham teaching-data dictionary](https://biolincc.nhlbi.nih.gov/media/teachingstudies/FHS_Teaching_Longitudinal_Data_Documentation_2021a.pdf), event/time definitions and dataset-use limitations.
- [riskRegression Score](https://search.r-project.org/CRAN/refmans/riskRegression/html/Score.html) and [IPCW](https://search.r-project.org/CRAN/refmans/riskRegression/html/ipcw.html), independent package checks and censor-weight conventions.
- [Pate et al., calibration plots for multistate risk prediction models](https://onlinelibrary.wiley.com/doi/full/10.1002/sim.10094), IPCW binary logistic calibration framework.

Exact commands, actual output manifest and source/output SHA-256 values accompany this report. Participant-level outputs remain local and Git-ignored.
'''
    (REPORT/'REPORT.md').write_text(text,encoding='utf-8')
    actual=[]
    for folder in [OUT,REPORT,ROOT/'analysis/scripts/v4_corrected']:
        for p in sorted(folder.rglob('*')):
            if p.is_file() and '__pycache__' not in p.parts and p.name!='artifact_manifest.json':actual.append({'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
    for name in ['.gitignore','README.md','docs/CIF_INTEGRATION.md','docs/KNOWN_LIMITATIONS.md','docs/RESEARCH_ANALYSIS_STATUS.md']:
        p=ROOT/name;actual.append({'path':name,'bytes':p.stat().st_size,'sha256':digest(p),'change':'created' if name.endswith('RESEARCH_ANALYSIS_STATUS.md') else 'modified'})
    (REPORT/'artifact_manifest.json').write_text(json.dumps(actual,indent=2))
    print(json.dumps({'report':str(REPORT/'REPORT.md'),'leader':leader,'recommendation':recommendation,'checks':checks,'artifact_count':len(actual)},indent=2))

if __name__=='__main__':main()
