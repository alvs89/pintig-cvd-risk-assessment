# PINTIG v3 Three-Predictor Integration Audit

## Files
- Raw reference: C:\Users\Alvin Guillermo\Downloads\PINTIG System\data\raw\framingham.csv
- Existing frozen v2 (unchanged): C:\Users\Alvin Guillermo\Downloads\PINTIG System\data\processed\pintig_frozen_clean_analysis_v2_13predictors.csv
- New frozen v3: C:\Users\Alvin Guillermo\Downloads\PINTIG System\data\processed\pintig_frozen_clean_analysis_v3_16predictors.csv

## Structure
- Raw: 11,627 rows x 39 columns.
- Frozen v2: 4,191 rows x 19 columns (13 predictors).
- Frozen v3: 4,191 rows x 22 columns (16 predictors).
- Participant IDs, event fields, and outer-fold assignments are unchanged from v2.

## Added baseline predictors from raw Period 1
- diabetes <- DIABETES: missing 0 (0.000%). Binary 0/1; no imputation needed.
- cigarettes_per_day <- CIGPDAY: missing 29 (0.692%). All missing cases are current smokers.
- heart_rate_bpm <- HEARTRTE: missing 1 (0.024%).

## Missing-data policy
The frozen v3 dataset is intentionally not globally imputed. Missingness is preserved so each resampling split learns imputation from its training partition only.
- diabetes: no missing values; no imputation.
- cigarettes_per_day: keep observed 0 for non-current smokers. For a current smoker with missing cigarettes/day, use the median among observed current smokers in the training partition only.
- heart_rate_bpm: use the training-partition median.
- bp_medication: retain the established training-partition mode imputation.
- Outcomes, follow-up time, participant ID, and fold assignments are never imputed.
- No participant rows are deleted for predictor missingness.
Across the fixed outer folds, the training smoker-specific cigarettes/day median is 20 and heart-rate median is 75 bpm in every outer training partition. Inner-CV tuning must recompute them within each inner-training fold.

## Integrity
- v2 SHA-256: c63ea78507f03939ac8f76a3ab8bd16ee934879dade09f4ba3884a7a42dec519
- v3 SHA-256: ab99d521ed85e2d022bee51c3e645ccb3976dea4ef3afd13acc972371bf9fd32
- v2 remains unchanged and preserved as the Thesis 1 provisional baseline.
