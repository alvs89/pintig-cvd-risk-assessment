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
