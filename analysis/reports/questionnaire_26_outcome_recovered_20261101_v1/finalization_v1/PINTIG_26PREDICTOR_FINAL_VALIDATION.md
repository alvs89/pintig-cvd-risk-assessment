# Final recovered dataset verification

Existing CSVs reused unchanged; no duplicate dataset generated. Each has 4,191 unique participants and 32 columns.
All 26 features, including four questionnaire-informed additions, equal the reconstruction exactly.
Proxy outcomes and folds equal frozen v3 for every ID and independently match raw event construction.
Counts: 369 recorded-CVD proxy events, 218 all-cause deaths before recorded CVD (cause unknown), 3,604 censored.
No missing proxy outcomes, duplicated IDs, inconsistent event indicators or modified observed predictors.
All four exact-endpoint outcome columns remain missing in the separate exact-endpoint CSV.

Existing questionnaire validation and seven unit tests passed. Existing R compatibility smoke test passed:
650 training participants, 40 trees, 20 held-out predictions, finite bounded competing-risk CIFs.
Imputation uses only the outer training partition; the subsequent 650-record subsample is for the smoke test.
This is not nested CV or a performance evaluation. No AUC/Brier/IBS/calibration metrics were recalculated.
For subsequent experiments reuse corrected horizon handling and fold-specific preprocessing/tuning.

Ready for the next explicitly labeled provisional recorded-CVD/death-before-CVD competing-risk experiment.
Not evidence of a verified MI/stroke/HF/CV-death composite or confirmed non-CVD competing deaths.
The legacy outcome column names are compatibility names; use the updated proxy dictionary.
Sixteen predictors remain simulated. No new outcome leakage is introduced by the ID-matched restoration;
the original recipes of six inherited synthetic predictors remain unresolved and cannot be certified leakage-free.
No Philippine external validation or clinical superiority is established.

The original generation script recover_proxy_outcomes.py is preserved. Its overwrite guard was respected;
this finalization script reuses existing validation functions and verifies existing files instead of regenerating them.
See validation.json for commands, hashes and results, and rsf_smoke_test.log for actual R output.
