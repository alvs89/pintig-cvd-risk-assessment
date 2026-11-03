# PINTIG — PURE-target questionnaire and provisional Framingham predictor alignment

## Decision (research design, not clinical validation)

**Primary prospective collection framework:** PURE baseline questionnaire domains, preferably the **exact Philippine PURE baseline forms and data dictionary** once obtained. Use published PURE constructs only as interim guidance. **Provisional historical training source:** the original Framingham 39-column CSV and its frozen v3 16-predictor dataset. Framingham Generation 3 forms are supporting measurement references but **are not interchangeable with the source cohort in framingham.csv**, whose exact exam cycle and provenance must be verified.

PURE Southeast Asia collects standardized baseline questionnaires and physical measurements, including abdominal obesity, alcohol, diet, physical activity and education. The exact questionnaire instruments/units must be verified from the approved Philippine PURE data dictionary before final harmonization.

## Audit of six synthetic fields (2026-10)

| v3 synthetic predictor | Proposed PURE-aligned construct / collection | Alignment to current v3 | Decision |
|---|---|---|---|
| `waist_cm` | **Measured** waist circumference in centimeters using the approved PURE anthropometry protocol (not a self-report questionnaire) | Current `SYN_WAIST_CM` is synthetic; no observed measurements in 39-column source | Keep existing value *synthetic*, never claim observed PURE-equivalent; retain cm for future measured data |
| `alcohol_drinks_week` | Frequency and quantity of alcohol over a defined recall period; convert drink counts to per-week only after verifying local drink units/form definitions | Current `SYN_ALCOHOL_DRINKS_WEEK` is synthetic | Keep synthetic; provisional unit compatible in name only, no verified instrument equivalence |
| `activity_min_week` | PURE-reported physical activity items with defined domains, intensity and reference period; preserve raw questionnaire answers and score using actual PURE algorithm | Current `SYN_ACTIVITY_MIN_WEEK` is synthetic; **minutes/week is NOT MET-min/week**, and intensity-weighted measures cannot be converted without input detail | Keep synthetic; do not relabel to MET-min/week; future migration may require new feature and retraining |
| `diet_score_0_100` | PURE food-frequency items; if using the published 2023 PURE Healthy Diet Score use exact six-food 0–6 definition, cohort-median rules and availability of original food intake responses | Current 0–100 synthetic score **not equivalent** to 0–6 PURE score | NOT harmonized; preserve existing synthetic variable solely for the current provisional model, plan a separately named future `pure_healthy_diet_score_0_6` |
| `ses_index_0_100` | PURE household assets/wealth index or education variable with its exact form and scoring/coding; retain separate raw components | Current arbitrary synthetic 0–100 index has no established PURE wealth-index mapping | NOT harmonized; do not equate education with SES or fabricate a PURE wealth index; plan re-specification and retraining |
| `family_history_cvd` | Document first-degree relatives, event/diagnosis, and (if instrument captures) age at onset; binary indicator only with an explicit pre-specified definition | Current `SYN_FAMILYHX_CVD` is synthetic; source 39 fields lack this history | Definition can be specified, values are NOT observed; do not mark as a genuine family history record |

## Current model handling

1. **Do not rewrite** `data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv` or earlier frozen v2, model outputs, outcomes, fold IDs, or metrics. Such recoding would invalidate the previously reported 13/14/15/16 comparisons.
2. Preserve all six predictors as **synthetic augmentations** and report this limitation prominently. The three additional v3 variables — `diabetes`, `cigarettes_per_day` and `heart_rate_bpm` — are sourced from observed raw Framingham columns; they are not part of this synthetic harmonization.
3. For any eventual model trained on PURE/Philippine records, build a **new versioned dataset** with raw questionnaire answers, instrument edition, coded derived features, missing/unknown flags, provenance, and scoring algorithms. Refit/revalidate the model; do not substitute values in a previously trained RSF.
4. For user interface: do not ask a patient to self-compute diet/SES scores. Ask raw items matching the approved instrument, compute model-ready features reproducibly, and prevent predictions when incompatible inputs are used.
5. Family history and anthropometric measurement protocols are not merely wording choices: changing definitions changes the actual feature distribution.
6. Harmonization is **not possible from the 39-column Framingham extract alone**: absent baseline source measurements cannot be recovered by choosing a questionnaire.

## Minimum new schema for future PURE data

- `waist_cm_measured`; measurement protocol version/source.
- `alcohol_<beverage>_frequency`, `alcohol_<beverage>_quantity`, recall period, standardized-drink conversion metadata; derive `alcohol_drinks_week` only with verified rules.
- `activity_<domain>_<intensity>_days`, `activity_<domain>_<intensity>_minutes_per_day`, recall period; separate `activity_min_week` from `activity_met_min_week`.
- Raw diet food group frequency/portion variables plus optional derived `pure_healthy_diet_score_0_6` (score algorithm and cohort-median reference documented).
- Education and household asset items separately; exact, pre-specified wealth score only with approved PURE coding.
- `family_relation`, `family_cvd_event_type`, `family_age_at_event`, and a defined derived binary `family_history_cvd` where instrument permits.

## Research sources

- PURE Southeast Asia CVD substudy (JACC: Asia, 2024): https://www.jacc.org/doi/10.1016/j.jacasi.2024.05.008
- PURE 2023 Healthy Diet Score primary paper: https://academic.oup.com/eurheartj/article/44/28/2560/7192512
- PURE risk-score study from Brazil (2025): https://pmc.ncbi.nlm.nih.gov/articles/PMC11959376/
- Framingham official Gen 3 Examination 1 form: https://www.framinghamheartstudy.org/files/2017/08/Gen-3-Exam-1.pdf
- Framingham examination forms and protocols: https://www.framinghamheartstudy.org/fhs-for-researchers/exam-forms/

**Status:** Instrument framework chosen; field-to-questionnaire design specified; **existing synthetic values are not scientifically harmonized**, pending exact PURE Philippine questionnaire and underlying real observations. No claim of clinical validation.
