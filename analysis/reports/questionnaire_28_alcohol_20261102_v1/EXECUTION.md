# Execution and delivered artifacts

Executed in the PINTIG workspace on 2026-11-02 (Asia/Manila):

```powershell
python -m unittest discover -s analysis/scripts/reconstruction_26 -p test_alcohol_28.py -v
python analysis/scripts/reconstruction_26/expand_alcohol_28.py
python analysis/scripts/reconstruction_26/expand_alcohol_28.py --verify
npm run check
npm run build
git diff --check
git check-ignore data/processed/questionnaire_28_alcohol_20261102_v1/pintig_framingham_28predictors_PROXY_EXPERIMENTAL.csv
```

Results: five new semantic tests passed; generation and independent saved-CSV verification passed;
66 application tests passed; production build and Git whitespace checks passed. npm check used permitted
child-process access. Git confirmed the participant-level CSV is ignored.
No model fitting or clinical performance evaluation was performed.

Created files:
- data/processed/questionnaire_28_alcohol_20261102_v1/pintig_framingham_28predictors_PROXY_EXPERIMENTAL.csv
- analysis/scripts/reconstruction_26/expand_alcohol_28.py
- analysis/scripts/reconstruction_26/test_alcohol_28.py
- analysis/reports/questionnaire_28_alcohol_20261102_v1/pintig_28predictors_data_dictionary.csv
- analysis/reports/questionnaire_28_alcohol_20261102_v1/metadata.json
- analysis/reports/questionnaire_28_alcohol_20261102_v1/validation.json
- analysis/reports/questionnaire_28_alcohol_20261102_v1/alcohol_summary.csv
- analysis/reports/questionnaire_28_alcohol_20261102_v1/protected_sha256.json
- analysis/reports/questionnaire_28_alcohol_20261102_v1/REPORT.md
- analysis/reports/questionnaire_28_alcohol_20261102_v1/EXECUTION.md

No existing source file modified. All1,295 protected data/research/script/frontend files retained hashes.
The original26-predictor proxy and exact-endpoint files remain unchanged.

Generated categories: none1545, beer1437, wine514, spirits555, country_liquor140.
The none category denotes zero weekly intake under the existing synthetic convention, not verified lifetime abstention.
Source-specific serving sizes and nominal-category preprocessing requirements are explained in REPORT.md.
