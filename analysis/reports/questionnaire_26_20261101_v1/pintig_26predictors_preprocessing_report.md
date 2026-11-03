# PINTIG 26-predictor reconstruction

Provisional questionnaire-informed simulation; not clinically validated Philippine longitudinal data.
The main CSV contains 4,191 participants, 26 predictors and six metadata/outcome fields (32 columns).
Nine predictors are observed, one is derived from observed sex, and 16 are simulated. No imputed values are exported.
The exact four-component survival endpoint is **unavailable**: its four columns are blank NA, not negative events.
This dataset must not be passed directly to an RSF trainer expecting complete survival outcomes.

## Established configuration and preservation
The n22 and n26 lists in `analysis/results/v4_corrected_20261031_v1/configurations.json`
identify exactly hip_circumference_cm, diabetes_medication, psychosocial_stress and sleep_duration_hours.
The first 22 values are copied from the established original v4 simulation, after joining and checking RANDID.
Nine observed columns and sex encoding are independently compared with raw baseline records, including missingness.
The 12 synthetic fields among those first 22 are retained unchanged, not newly asserted questionnaire-equivalent.
In particular diet_score_0_100 and ses_index_0_100 remain arbitrary exploratory indices, not validated PURE/FFQ scores.
The old heavy-episodic proxy is not retrospectively relabeled as the PURE >5 drinks/day question.
All 39 raw baseline fields are preserved in `original_baseline_records.csv`; the original full raw file is unchanged.

## Eligibility and folds
Raw rows: 11627; unique baseline participants: 4434.
Exclude 24 outside age 35-70, then 219 with prior CHD/stroke.
All 4,191 eligible PERIOD=1 records match the frozen cohort exactly. Other required history (e.g. prior HF) cannot be screened.
Reuse the five frozen participant folds (839, 838, 838, 838, 838) to preserve experimental comparability.
The originating outer-fold random seed was not established from the audited files; no new seed is falsely claimed.
The frozen assignment file and its SHA-256 are the reproducible fold authority. Simulation seeds: [20261101, 20261102, 20261103].
Participant ordering is ascending original identifier. Identifiers only align rows; they do not enter the simulation function.

## Source verification
Exact source/page/item/wording/options/limitations are in `pintig_26predictors_questionnaire_mapping.csv`.
PURE is the South African form. PDF physical pages differ from printed pages.
Gen-3-Exam-1.pdf is available; Gen-3-Exam-1 (1).pdf was not found. No byte-equivalence claim is made.
PURE PDF pp25,34,35 and Gen3 pp10,23 were visually read; supporting Offspring p73 was also inspected.
All eleven supplied document filenames found locally are inventoried with hashes and page counts.
Questionnaire support establishes constructs, not actual participant responses or validated simulation distributions.
The hip mean and stress threshold are explicit PINTIG adaptations. The missing PURE measurement manual remains a limitation.

## Fixed simulation assumptions, not fitted epidemiology
All draws use NumPy default_rng; no outcome, time, fold, cohort-fitted statistic or donor record is supplied to the generator.
Only age, sex, synthetic waist, observed diabetes, synthetic SES and synthetic urban status may enter it.
- Hip latent cm: clipped normal with mean 100 + 0.6*(waist-90) - 2*male, SD6, bounds66-159.
  Two independent measurement errors N(0,0.4), clip65-160, round0.1; minimal/no clothing assumed for both.
  Final feature is their mean rounded0.1. Hip need not exceed waist. No missing protocol details are invented.
- Diabetes current treatment among DIABETES=1: logistic(0.4+0.02*(age-50)); among untreated diabetics, past-use probability0.10.
  DIABETES=0 => response0 (simulation restriction). Original response1 maps1; 0/2 map0;9 mapsNA.
  Unneeded clinical follow-up histories are not generated.
- Work applicable: probability0.75 below60, otherwise0.35. Home/work ordinal categories have reference weights
  [0.25,0.40,0.25,0.10], multiplied by exp(-0.01*(SES-50)*rank), then normalized.
  Applicable home and work draws independent conditional on SES; nonworking work response is Not applicable.
  Binary stress=1 for either applicable Several/Permanent; otherwise0 when all applicable responses known, elseNA.
- Sleep: direct typical-day response, rounded0.1, clipped3.5-10.5,
  N(7.1-0.24*stress-0.05*urban,1). Remaining24-hour time allocated by Dirichlet[5,4,2,0.5]
  to sedentary/slight/moderate/heavy. These auxiliary PAI domains are not replacements for inherited weekly activity/sitting constructs.
- Weak-dependence regime halves baseline coefficients, increases hip SD to8 and sleep SD to1.25.
- Alternative-prevalence regime adds3cm to hip mean, subtracts0.7 from treatment logit,
  uses stress base weights[0.15,0.35,0.30,0.20], and subtracts0.5h from sleep mean.
All assumptions are plausible experimental perturbations, not empirically calibrated population distributions.
No refusal/unknown responses are drawn in these scenarios; handling is unit-tested but missingness sensitivity is not evaluated.

## Missingness and training
Preserve missing BP medication (52), cigarettes/day (29), heart rate (1). No whole-cohort fitting or imputation occurs.
Reuse `scripts/pintig_v3_modeling_config.R` only inside each inner/outer training partition:
training mode for BP medication, current-smoker training median for cigarette count, training median for heart rate.
Missing cigarettes for known nonsmokers may be structural zero; current missing records are smokers.
Diabetes is complete; future unknown diabetes must not be silently filled.
All six metadata/outcome columns are excluded via the explicit predictor list in run_manifest.json.
New questionnaire definitions require new model experiments; previous v4 metrics do not describe this reconstruction.

## Endpoint restriction
Raw CVD and all-cause death flags/times are preserved. MI/stroke-related records exist, but HF onset and
adjudicated cause-specific deaths are insufficient for the exact MI/stroke/HF/CV-death composite.
All-cause death before recorded CVD is not proven non-CVD death. Thus all four exact outcome fields are NA.
The unchanged old endpoint is separately stored with `proxy_` prefixes and cannot be relabeled as the requested target.
The IHD project title is narrower than the requested major-CVD composite; resolve this protocol inconsistency separately.

## Sensitivity and interpretation
Nine complete feature datasets (3 seeds x3 assumptions) and questionnaire-response sidecars were generated and validated.
`simulation_sensitivity_summary.csv` reports distributions; no model was trained and no new performance conclusion is claimed.
Sensitivity here concerns feature generation, not model rankings. Predictive robustness of this reconstruction remains untested.
The exact endpoint is unavailable, so no valid exact-endpoint performance table can be produced.
Previous corrected proxy experiments remain separate historical results. Authentic questionnaire wording does not validate simulated measurements.
Next: obtain HF and adjudicated death linkage, settle endpoint/title, obtain the anthropometry manual and Philippine instrument,
approve adaptations, collect genuine responses, then perform nested fold-specific training and independent external validation.
