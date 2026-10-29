# PINTIG v2 vs v3 Provisional Model Comparison

## Scope
- v2: 13 predictors, 4,191 participants.
- v3: same 4,191 participants and outcomes, plus diabetes, cigarettes_per_day, and heart_rate_bpm (16 predictors total).
- Same five frozen outer folds and 10-year competing-risk target.
- All v3 predictor imputation is learned from training partitions only.
- Existing v2 files/results were not overwritten.

## Pooled performance
- Cox: AUC 0.5971 -> 0.6017 (+0.0046); Brier 0.06407 -> 0.06350 (-0.00057); IBS 0.03627 -> 0.03610 (-0.00016); C 0.7547 -> 0.7599 (+0.0052); calibration slope 0.949 -> 0.937.
- FineGray: AUC 0.5971 -> 0.6008 (+0.0037); Brier 0.06422 -> 0.06372 (-0.00049); IBS 0.03627 -> 0.03608 (-0.00019); C 0.7544 -> 0.7595 (+0.0051); calibration slope 0.946 -> 0.943.
- RSF: AUC 0.5895 -> 0.5936 (+0.0041); Brier 0.06449 -> 0.06369 (-0.00080); IBS 0.03656 -> 0.03641 (-0.00015); C 0.7416 -> 0.7498 (+0.0082); calibration slope 0.921 -> 0.975.

Interpretation: v3 modestly improves discrimination and prediction error for all three model families. Cox and Fine-Gray remain slightly better than RSF in pooled AUC/IBS tradeoffs; RSF calibration slope moves materially closer to 1.

## Added-predictor evidence
- diabetes: Cox AUC delta +0.0015; Fine-Gray AUC delta -0.0001; Cox Brier delta -0.00027; Fine-Gray Brier delta -0.00024; RSF VIMP rank 7/16 (importance 0.006807).
- cigarettes_per_day: Cox AUC delta -0.0011; Fine-Gray AUC delta -0.0010; Cox Brier delta -0.00021; Fine-Gray Brier delta -0.00016; RSF VIMP rank 8/16 (importance 0.003848).
- heart_rate_bpm: Cox AUC delta +0.0027; Fine-Gray AUC delta +0.0025; Cox Brier delta -0.00008; Fine-Gray Brier delta -0.00007; RSF VIMP rank 12/16 (importance 0.000175).

### Recommendation
- diabetes: RETAIN as a high-priority candidate. It has strong, directionally consistent regression effects across all five folds, improves prediction error and concordance, and ranks 7/16 in RSF permutation importance. Its single-variable AUC effect is small, so the evidence is supportive rather than proof of a large standalone gain.
- cigarettes_per_day: INVESTIGATE / DO NOT LOCK YET. It improves Brier and concordance modestly but slightly reduces AUC when added alone; it also pushes current_smoker to near-zero/negative RSF importance, indicating redundancy between smoking status and intensity. Consider a smoking representation strategy rather than automatically keeping both.
- heart_rate_bpm: INVESTIGATE FURTHER. It gives a small AUC gain in Cox/Fine-Gray but slightly worsens concordance/calibration and has very low RSF importance (rank 12/16). Its adjusted regression coefficient is consistently slightly negative for major CVD, which warrants clinical/methodological review before inclusion.

## Important limitation
The v3 all-16 model improves over v2, but the gain is from the three-variable bundle. The one-at-a-time ablation helps isolate incremental effects in Cox/Fine-Gray, while RSF importance is exploratory full-data importance rather than an independent held-out effect estimate. These provisional Framingham teaching-data results do not establish Philippine clinical validity.

## Files
- Metric comparison: analysis/reports/v3/V2_V3_METRIC_COMPARISON.csv
- Fold stability: analysis/reports/v3/V2_V3_FOLD_STABILITY_COMPARISON.csv
- Computational comparison: analysis/reports/v3/V2_V3_COMPUTATIONAL_COMPARISON.csv
- Added-predictor evidence: analysis/reports/v3/V3_NEW_PREDICTOR_EVIDENCE_SUMMARY.csv
- Coefficient stability: analysis/reports/v3/V3_NEW_PREDICTOR_COEFFICIENT_STABILITY.csv
- RSF importance ranks: analysis/reports/v3/V3_RSF_IMPORTANCE_RANKS.csv
- Ablation metrics: analysis/results/v3/V3_INCREMENTAL_PREDICTOR_ABLATION_METRICS.csv
