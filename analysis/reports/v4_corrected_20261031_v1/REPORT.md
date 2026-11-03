# PINTIG corrected v4 evaluation — 2026-10-31, version 1

## Execution status
Completed 330 inner fits and 55 outer fits for all 11 configurations; 135 fixed-hyperparameter robustness fits; 500 paired participant bootstrap resamples. No deployed model, questionnaire, clinical thresholds, raw/frozen dataset, or previous experiment output was changed. This is a semi-synthetic methodological experiment, not clinical validation.

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

| Predictors | AUC | Brier | IBS 0–10y | Calibration slope | CITL (logit) |
|---|---|---|---|---|---|
| 16 | 0.75261 [0.73075, 0.77758] | 0.07434 [0.06850, 0.08041] | 0.03661 [0.03302, 0.04085] | 0.91920 [0.81415, 1.05404] | -0.05195 [-0.15857, 0.06116] |
| 17 | 0.75209 [0.72970, 0.77678] | 0.07436 [0.06839, 0.08033] | 0.03661 [0.03308, 0.04087] | 0.91656 [0.80960, 1.05184] | -0.05605 [-0.16287, 0.05739] |
| 18 | 0.75416 [0.73163, 0.77993] | 0.07423 [0.06821, 0.08026] | 0.03660 [0.03310, 0.04091] | 0.92423 [0.81122, 1.05956] | -0.06057 [-0.16536, 0.05288] |
| 19 | 0.75666 [0.73481, 0.78113] | 0.07410 [0.06807, 0.08020] | 0.03651 [0.03292, 0.04078] | 0.97842 [0.86656, 1.11929] | -0.05740 [-0.16279, 0.05478] |
| 20 | 0.75182 [0.72942, 0.77665] | 0.07433 [0.06841, 0.08037] | 0.03662 [0.03307, 0.04092] | 0.97639 [0.86265, 1.12923] | -0.05305 [-0.15962, 0.06086] |
| 21 | 0.75588 [0.73380, 0.77988] | 0.07409 [0.06805, 0.08006] | 0.03652 [0.03295, 0.04079] | 0.99136 [0.87913, 1.13154] | -0.04778 [-0.15331, 0.06537] |
| 22 | 0.75761 [0.73564, 0.78017] | 0.07397 [0.06795, 0.08000] | 0.03649 [0.03293, 0.04078] | 1.00390 [0.88985, 1.13922] | -0.05512 [-0.16057, 0.05610] |
| 23 | 0.75477 [0.73235, 0.77818] | 0.07437 [0.06839, 0.08041] | 0.03659 [0.03303, 0.04088] | 0.99952 [0.88545, 1.13873] | -0.05747 [-0.16344, 0.05436] |
| 24 | 0.75332 [0.72995, 0.77725] | 0.07432 [0.06833, 0.08032] | 0.03659 [0.03301, 0.04089] | 0.99565 [0.87736, 1.13714] | -0.05105 [-0.15884, 0.06112] |
| 25 | 0.75313 [0.73127, 0.77749] | 0.07449 [0.06853, 0.08051] | 0.03666 [0.03309, 0.04087] | 0.94572 [0.83657, 1.08331] | -0.06436 [-0.17156, 0.04920] |
| 26 | 0.75359 [0.73101, 0.77720] | 0.07412 [0.06816, 0.08002] | 0.03648 [0.03296, 0.04076] | 0.99108 [0.88361, 1.12201] | -0.06140 [-0.16846, 0.05120] |

## Predictor configurations
| configuration | predictor_count | predictors |
|---|---|---|
| n16 | 16 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm |
| n17 | 17 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm;smoking_pack_years |
| n18 | 18 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm;smoking_pack_years;former_smoker |
| n19 | 19 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm;smoking_pack_years;urban_rural_residence;sitting_minutes_day |
| n20 | 20 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm;sitting_minutes_day;heavy_episodic_alcohol;psychosocial_stress;sleep_duration_hours |
| n21 | 21 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm;smoking_pack_years;urban_rural_residence;sitting_minutes_day;heavy_episodic_alcohol;former_smoker |
| n22 | 22 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm;smoking_pack_years;urban_rural_residence;sitting_minutes_day;heavy_episodic_alcohol;former_smoker;lipid_lowering_medication |
| n23 | 23 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm;smoking_pack_years;urban_rural_residence;sitting_minutes_day;heavy_episodic_alcohol;former_smoker;lipid_lowering_medication;hip_circumference_cm |
| n24 | 24 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm;smoking_pack_years;urban_rural_residence;sitting_minutes_day;heavy_episodic_alcohol;former_smoker;lipid_lowering_medication;hip_circumference_cm;diabetes_medication |
| n25 | 25 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm;smoking_pack_years;urban_rural_residence;sitting_minutes_day;heavy_episodic_alcohol;former_smoker;lipid_lowering_medication;hip_circumference_cm;diabetes_medication;psychosocial_stress |
| n26 | 26 | age_years;sex_male;sbp_mmhg;dbp_mmhg;waist_cm;current_smoker;hypertension_history;bp_medication;alcohol_drinks_week;activity_min_week;diet_score_0_100;ses_index_0_100;family_history_cvd;diabetes;cigarettes_per_day;heart_rate_bpm;smoking_pack_years;urban_rural_residence;sitting_minutes_day;heavy_episodic_alcohol;former_smoker;lipid_lowering_medication;hip_circumference_cm;diabetes_medication;psychosocial_stress;sleep_duration_hours |

The 18- and 20-predictor configurations preserve the earlier smoking and behavior groups; the sequence is NOT a monotonic forward-selection path. Six of the baseline predictors and all ten extra candidate fields are synthetic. Observed measurements, derived sex coding, training-fold imputation and synthetic generation remain distinct in the audit.

## Paired differences versus n16
Negative Brier/IBS differences favor the expanded configuration; positive AUC differences favor it. All five metrics and intervals are in paired_differences_vs_n16.csv.

| configuration | metric | point_difference | lower95 | upper95 |
|---|---|---|---|---|
| n16 | auc_10y | 0.000000 | 0.000000 | 0.000000 |
| n16 | brier_10y | 0.000000 | 0.000000 | 0.000000 |
| n16 | ibs_0_10y | 0.000000 | 0.000000 | 0.000000 |
| n17 | auc_10y | -0.000519 | -0.006626 | 0.006017 |
| n17 | brier_10y | 0.000015 | -0.000403 | 0.000451 |
| n17 | ibs_0_10y | 0.000003 | -0.000158 | 0.000169 |
| n18 | auc_10y | 0.001543 | -0.004204 | 0.007439 |
| n18 | brier_10y | -0.000115 | -0.000503 | 0.000326 |
| n18 | ibs_0_10y | -0.000013 | -0.000164 | 0.000149 |
| n19 | auc_10y | 0.004051 | -0.001832 | 0.010127 |
| n19 | brier_10y | -0.000249 | -0.000678 | 0.000168 |
| n19 | ibs_0_10y | -0.000100 | -0.000252 | 0.000048 |
| n20 | auc_10y | -0.000791 | -0.006553 | 0.005373 |
| n20 | brier_10y | -0.000015 | -0.000410 | 0.000389 |
| n20 | ibs_0_10y | 0.000007 | -0.000155 | 0.000168 |
| n21 | auc_10y | 0.003270 | -0.003486 | 0.010411 |
| n21 | brier_10y | -0.000253 | -0.000696 | 0.000188 |
| n21 | ibs_0_10y | -0.000092 | -0.000270 | 0.000081 |
| n22 | auc_10y | 0.004998 | -0.002251 | 0.011913 |
| n22 | brier_10y | -0.000372 | -0.000814 | 0.000075 |
| n22 | ibs_0_10y | -0.000117 | -0.000278 | 0.000061 |
| n23 | auc_10y | 0.002155 | -0.005009 | 0.009788 |
| n23 | brier_10y | 0.000030 | -0.000417 | 0.000505 |
| n23 | ibs_0_10y | -0.000018 | -0.000197 | 0.000169 |
| n24 | auc_10y | 0.000709 | -0.006668 | 0.007834 |
| n24 | brier_10y | -0.000029 | -0.000454 | 0.000404 |
| n24 | ibs_0_10y | -0.000021 | -0.000205 | 0.000138 |
| n25 | auc_10y | 0.000513 | -0.006111 | 0.008172 |
| n25 | brier_10y | 0.000150 | -0.000304 | 0.000570 |
| n25 | ibs_0_10y | 0.000050 | -0.000112 | 0.000221 |
| n26 | auc_10y | 0.000978 | -0.006588 | 0.009355 |
| n26 | brier_10y | -0.000228 | -0.000742 | 0.000249 |
| n26 | ibs_0_10y | -0.000127 | -0.000334 | 0.000047 |

## Robustness and isolated sources of variation
The baseline plus the two lowest-IBS configurations (duplicates removed) were selected for exploratory robustness: n16, n26, n22. This post-OOF choice is exploratory and does not create a new unbiased validation sample.

Two existing synthetic-data seeds (20261031, 20261101) are reused. A second per-participant generator preserves established formulas/bounds but halves the specified baseline-dependence coefficients and increases continuous noise SD by 25%; these are illustrative assumption checks, not empirically established joint distributions. Every scenario is fitted under two training seeds with original outer-fold selected hyperparameters held fixed. This cleanly exposes simulation and fitting changes but does not repeat nested hyperparameter selection under each scenario. A second training seed on the original draw isolates algorithm variability. Baseline predictions reproduce at each fixed training seed when only added synthetic fields change.

| configuration | auc_delta_min | auc_delta_max | brier_delta_min | brier_delta_max | ibs_delta_min | ibs_delta_max |
|---|---|---|---|---|---|---|
| n16 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| n22 | -0.005315 | 0.004998 | -0.000372 | 0.000275 | -0.000117 | 0.000125 |
| n26 | -0.006991 | 0.003863 | -0.000319 | 0.000394 | -0.000141 | 0.000054 |

Detailed same-training-seed simulation changes are in robustness_paired_comparisons.csv; same-scenario training-seed changes are in training_seed_effects.csv. Preliminary stratified donor-permutation scenario files were prepared but NOT used for training; independent per-participant weak-dependence scenarios avoid donor transfer across folds. All prepared files remain separately versioned and labeled in the manifest.

## Provisional decision
The lowest corrected single-draw IBS is from **n26**. Under the hypothetical assumption that all predictors were genuine measurements, the conservative provisional recommendation is **n16**: the smallest reference is retained unless an expanded candidate has a paired IBS interval entirely below zero and improves IBS and Brier throughout the evaluated robustness runs. This decision rule is exploratory, not a confirmatory model-selection test. The counterfactual cannot turn synthetic evidence into evidence about real measured predictor utility; independent observed-data validation is still necessary.

For the actual experiment, no expanded questionnaire or deployed model is justified. The frozen 16-predictor configuration remains a research reference and itself contains six synthetic fields. Apparent gains in simulated extra fields describe this generator and training procedure, not clinical incremental value in PURE Philippines.

## Verification
| protected_files_checked | protected_files_changed | outer_fits | inner_fits | robustness_fits | auc_reference_max_abs_difference | brier_reference_max_abs_difference | ibs_reference_max_abs_difference | slope_reference_max_abs_difference | citl_reference_max_abs_difference | bootstrap_replicates | all_metric_ci_replicates_valid | training_only_imputation_and_fold_audit | robustness_imputation_and_fixed_hyperparameters | baseline_rng_isolation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 301 | [] | 55 | 330 | 135 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 500 | True | PASS | PASS | PASS |

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
