# Local research analysis status

The frontend primary estimate remains illustrative. Local Framingham research
datasets and fitted artifacts exist under ignored `data/`, `analysis/modeling/`
and `analysis/results/` directories. Their existence does not authorize clinical
deployment or establish Philippine external validation.

The frozen 16-predictor reference includes six synthetic baseline fields. The
expanded 26-field simulation adds ten synthetic fields. These are generated
assumptions, not recovered measurements or ordinary missing-value imputations.
The provisional 21-field export also contains synthetic predictors.

The recorded endpoint is the teaching dataset's CVD composite; death before
recorded CVD is the competing event, with cause unverified. This is not the full
intended PURE endpoint including heart failure and verified cardiovascular death.

## Corrected evaluation

The previous v4 scripts excluded event-free participants administratively
censored exactly at day 3652.5 from ten-year tuning/evaluation. Raw TIMECVD and
TIMEDTH establish follow-up beyond that day for all 3,588 affected participants.
The correction is isolated in `analysis/scripts/v4_corrected/`, with outputs in
`analysis/results/v4_corrected_20261031_v1/`. Previous scripts and experiment
outputs are retained for provenance; do not use their v4 rankings as final
predictor-selection evidence. The corrected report records execution status,
reference-package comparisons, confidence intervals and remaining limitations.

Participant-level outputs remain local and ignored by Git. The completed
[corrected comparison report](../analysis/reports/v4_corrected_20261031_v1/REPORT.md)
documents all 11 nested configurations, 500 conditional paired bootstrap
resamples and 135 fixed-hyperparameter robustness fits. Expanded candidates did
not establish robust superiority over the 16-predictor research reference.

## Questionnaire-informed reconstruction

The separate `data/processed/questionnaire_26_20261101_v1/` export preserves the
established first 22 predictors and reconstructs the four established additions
from explicitly simulated questionnaire responses. It includes 26 predictors and
six metadata/outcome columns. The exact requested MI/stroke/HF/CV-death and
non-CVD-death endpoint cannot be established from this source: its four outcome
fields are intentionally unavailable. A separately labeled sidecar preserves
the earlier recorded-CVD/death-before-CVD proxy without claiming cause of death.

The [reconstruction report](../analysis/reports/questionnaire_26_20261101_v1/pintig_26predictors_preprocessing_report.md)
provides source pages, proposed hip/stress adaptations, retained legacy synthetic
limitations and nine generation-sensitivity scenarios. These new definitions
have not been model-evaluated; earlier v4 performance does not apply to this
reconstruction. The PURE source is the South African questionnaire, not a verified
Philippine edition. No deployed model, clinical thresholds or frontend questionnaire
was changed.

## 27-predictor engineered proxy experiment (2026-11-03)

The separate `analysis/scripts/rsf27_v1/` runner completed 30 inner fits, five
outer fits and one full-cohort research refit on the preserved 4,191-person,
27-feature dataset. It reused frozen 5-by-3 participant folds and corrected
ten-year IPCW evaluation. The offline model is **not approved for deployment**.

Outputs are local in `analysis/results/rsf27_proxy_20261103_v1/`: `REPORT.md`,
`performance_with_ci.csv`, `calibration.png`, `compatibility.csv`,
`model_RESEARCH_ONLY.rds`, `verification.json`, and `COMMANDS.md`, plus individual
fold predictions, tuning/imputer records, bootstrap draws and R-reference results.

| Held-out metric | Estimate | Conditional 95% bootstrap CI |
|---|---:|---|
| Ten-year AUC | 0.75808 | 0.73556–0.78252 |
| Ten-year Brier | 0.07384 | 0.06779–0.07981 |
| IBS, 0–10 years | 0.03638 | 0.03292–0.04071 |
| Calibration slope | 1.01988 | 0.90545–1.16856 |
| Calibration-in-the-large, logit | -0.05904 | -0.16523–0.05302 |

All 40 nonzero-horizon AUC/Brier values matched riskRegression within 1e-8;
calibration matched R within 1e-5. All 500 bootstrap replicates were usable.
These intervals condition on fitted OOF models and this synthetic draw, and do
not cover full model-development or simulation uncertainty. No new synthetic-seed
sensitivity or external validation was performed. No superiority claim follows.

The 27-feature questionnaire remains unable to produce a compatible validated
patient risk estimate: SES reference parameters are unavailable, Food6 diet and
passive-exposure calculations differ from synthetic definitions, and six inherited
synthetic generation recipes have unresolved historical leakage provenance.
Recorded CVD and death before recorded CVD are proxy outcomes, not the intended
adjudicated clinical endpoint. A fitted research forest does not remove these
limitations. No questionnaire prediction route, clinical thresholds, source
datasets, prior models or previous experiments were modified by this run.
