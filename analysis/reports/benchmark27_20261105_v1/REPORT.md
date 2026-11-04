# PINTIG latest 27-predictor benchmark — 2026-11-05 v1

Completed benchmarking only: cause-specific Cox, Fine–Gray and reused RSF outer-fold predictions. No RSF retraining, model replacement, source-data change or prediction integration is part of this benchmark.

All models use the same 4,191 participants, 27 named predictors, recorded-CVD proxy events (369), death-before-CVD events with unverified cause (218), censoring (3,604), 3,652.5-day horizon, five frozen outer folds and three frozen inner folds.

| Model | 10-year AUC (95% CI) | Brier (95% CI) | IBS (95% CI) | Calibration slope (95% CI) |
|---|---|---|---|---|
| RSF | 0.74004 (0.71380–0.76674) | 0.07460 (0.06862–0.08086) | 0.03675 (0.03318–0.04109) | 0.90532 (0.78834–1.04312) |
| Cox | 0.74829 (0.72536–0.77190) | 0.07461 (0.06843–0.08076) | 0.03660 (0.03320–0.04065) | 0.83882 (0.75008–0.94342) |
| FineGray | 0.74942 (0.72619–0.77308) | 0.07457 (0.06845–0.08073) | 0.03657 (0.03314–0.04070) | 0.84748 (0.75873–0.95406) |

## Timing

| Model | Inner fitting (s) | Outer fitting (s) | Total fold pipelines (s) |
|---|---:|---:|---:|
| RSF | Unavailable | Unavailable | 98.28 |
| Cox | 1.16 | 0.26 | 6.51 |
| FineGray | 29.46 | 8.99 | 41.97 |

New Cox/Fine–Gray timing covers 30 inner and five outer fits per model, with preprocessing and prediction overhead reported separately through pipeline elapsed time. RSF time is historical fold elapsed (98.28 s), including preprocessing, tuning and prediction; pure RSF fitting time is unavailable. These are not controlled same-session speed comparisons. No timing confidence interval is justified by a single execution. No full-cohort refit was needed for benchmarking.

## Comparable evaluation and leakage controls

- The RSF dataset SHA-256 matches its recorded protocol. All OOF IDs, folds, times and event codes match exactly. The saved RSF metrics reproduce to 1e-10; reuse is supported for predictive performance.
- The benchmark evaluates only the exact `fit_ses` and `impute` definitions from the existing RSF training script. Each training partition independently fits education one-hot/income PCA and its percentile reference, and the mode/median imputers. No full-cohort descriptor SES enters fitting.
- Cox fits separate proportional-hazards models for both causes and combines their hazards into cause-1 CIF; it does not use 1 minus cause-1 survival. Fine–Gray fits the cause-1 subdistribution hazard with cause 2 retained as competing events.
- Each regression model compares two prespecified candidates: all 27 predictors with linear continuous effects, or natural splines (3 df) for age and SBP with the other effects unchanged. Smoking remains nominal. Spline knots and boundaries are estimated only from each training partition. These are basis transformations of the same predictors, not added patient variables.
- Selection minimizes mean inner-fold corrected IPCW ten-year Brier, with linear candidate preferred on ties. Two candidates match the RSF search count, but do not imply equal model complexity or search difficulty.
- Outer-fold evaluation uses the same corrected reverse-KM IPCW convention, competing events as controls, 41 time points from 0 to 10 years, and trapezoidal IBS. Only verified terminal administrative censoring is treated as complete through the horizon.
- Independent riskRegression checks match all three models’ 40 nonzero-time AUC/Brier values within 1e-8; weighted calibration slopes match within 1e-5.
- All 500 paired participant bootstrap replicates are usable for all metrics. They re-estimate censoring weights but do not refit models. Intervals condition on fitted OOF models and this synthetic draw.

## Paired comparisons against RSF

| Model | Metric | Difference (model minus RSF) | Paired 95% CI |
|---|---|---:|---|
| Cox | auc_10y | 0.00825 | -0.00540–0.02256 |
| Cox | brier_10y | 0.00001 | -0.00127–0.00121 |
| Cox | ibs_0_10y | -0.00015 | -0.00071–0.00041 |
| Cox | calibration_slope | -0.06650 | -0.13766–0.00758 |
| FineGray | auc_10y | 0.00938 | -0.00373–0.02320 |
| FineGray | brier_10y | -0.00003 | -0.00132–0.00128 |
| FineGray | ibs_0_10y | -0.00018 | -0.00076–0.00039 |
| FineGray | calibration_slope | -0.05784 | -0.13280–0.01393 |

## Limitations and interpretation

Small AUC improvements do not establish overall superiority; inspect paired differences and calibration together. Lower Brier/IBS is better; calibration slope is interpreted relative to 1, not maximized.
Cox emitted 4 warnings in outer fold 2 / inner fold 3 across the two candidate specifications (duplicate warnings during fitting): coefficients may be infinite because of sparse event/covariate patterns. Fitted coefficients and predictions remained finite, but the instability is material and is retained in warnings.csv. No failed fit was silently dropped.
Post-fit Cox PH diagnostics: 10 global tests, minimum p=0.227912. Tests are descriptive, not tuning criteria, and correlated across folds. Fine–Gray proportional subdistribution-hazard assumptions were not formally tested in this benchmark.
The cohort is semi-synthetic and the outcomes are proxies. No independent Philippine validation, clinical utility assessment, simulation-seed sensitivity, full development bootstrap or tree-count stability analysis was performed. Training-fold preprocessing cannot make synthetic baseline data genuine observations.
The dataset generator used a full-cohort synthetic SES descriptor when generating other synthetic features; this fixed generation assumption is shared by all models and is distinct from training-time SES fitting. Uncertainty from that synthetic generation is not represented by these intervals.
The historical RSF report contains copied text and stale compatibility explanations. This benchmark relies on the actual saved protocol, code, hashes and OOF predictions, not that narrative. Existing artifacts were preserved.
CIG integration is audited separately. The current frontend SES, grain-portion scoring and exposure definitions do not establish exact compatibility with this trained model; benchmarking does not authorize a patient graph.

## Reproduction

1. `python analysis/scripts/benchmark27_20261105_v1/prepare.py`
2. `& "C:\Program Files\R\R-4.6.1\bin\Rscript.exe" analysis/scripts/benchmark27_20261105_v1/train.R`
3. `python analysis/scripts/benchmark27_20261105_v1/evaluate.py`
4. `& "C:\Program Files\R\R-4.6.1\bin\Rscript.exe" analysis/scripts/benchmark27_20261105_v1/reference.R`
5. `python analysis/scripts/benchmark27_20261105_v1/finalize.py`

Use a new version directory to repeat; scripts refuse to overwrite completed artifacts. Final files are enumerated in files_manifest.csv.

Method reference: https://cran.r-project.org/package=riskRegression (CSC, FGR, predictRisk, Score).
