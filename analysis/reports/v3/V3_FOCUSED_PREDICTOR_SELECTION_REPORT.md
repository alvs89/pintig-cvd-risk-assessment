# PINTIG focused candidate selection — 2026-10-28

## Reproducible execution
New script: `analysis/scripts/v3/run_v3_focused_selection.R`.
R executable: `C:/Program Files/R/R-4.6.1/bin/Rscript.exe`.
Outputs: `analysis/results/v3/V3_FOCUSED_SELECTION_OOF.csv` and `V3_FOCUSED_SELECTION_METRICS.csv`.
Both new candidate configurations use five original outer-fold assignments, separate training-only imputation, and 10-year competing-risk estimates for cause-specific Cox and Fine–Gray. These candidate regression fits are outer-fold evaluations, **not new nested RSF tuning experiments**.

## Discrimination / prediction error
| Predictors | Cox AUC | Cox Brier | FG AUC | FG Brier |
|---|---:|---:|---:|---:|
| Base 13 (prior validated output) | .597106 | .064069 | .597130 | .064215 |
| Base + diabetes (14) | .598604 | .063799 | .597024 | .063978 |
| Base + diabetes + cigarettes/day (15) | .597365 | .063577 | .596766 | .063807 |
| Base + all 3 (16; prior output) | .601706 | .063498 | .600784 | .063724 |

The 14- and 15-predictor candidate scores were obtained in the new run, while base 13 and all 16 use the earlier matching-fold regression ablation output. For the 15-predictor run, Cox slope=.940991 and Fine–Gray slope=.946833. For 14 predictors, Cox slope=.947297 and Fine–Gray slope=.949713.

## Interpretation
- Diabetes is a reasonable candidate: improves Cox AUC and Brier, and Fine–Gray Brier, but standalone Fine–Gray AUC changes negligibly.
- Adding cigarettes/day on top of diabetes reduces both AUCs but improves Brier and Harrell C, so the choice depends on multiple metrics and feasibility; avoid a single-metric verdict.
- The all-16 regression configuration gives the highest AUC among these candidate models, but modest differences need uncertainty analysis before selection.
- Existing full-16 RSF AUC=.593577, Brier=.063690, IBS=.036414; no nested RSF 14-/15-predictor comparator has been executed here.
- Original v2 results and questionnaire remain unchanged.

## Methodological cautions
1. These candidate results are exploratory model-selection evidence, not an unbiased final performance claim after selecting the best configuration on the same outer-fold data. After choosing the specification, use a new external cohort or a nested model-selection procedure for confirmation.
2. Baseline data include six synthetic/augmented predictors, requiring separate provenance and external-cohort feasibility review.
3. Resolve smoking status/intensity redundancy, heart-rate negative adjusted association, and the RSF versus regression performance discrepancy before deployment.
4. As currently written, the focused candidate R script gives NA in its delta-versus-base columns because the base13 row was deliberately not rerun in that script. Compare numeric absolute scores using the table above; do not interpret the NA deltas as missing model predictions.
5. Assess calibration confidence intervals and discrimination uncertainty, and check competing-risk time horizon and follow-up completeness.
