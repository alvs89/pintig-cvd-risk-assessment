# Questionnaire-aligned 27-feature proxy experiment

Run from the repository root in this order. Every output location is versioned;
the source dataset and earlier proxy experiment are read only.

```powershell
python analysis/scripts/rsf27_questionnaire_aligned_v1/build_dataset.py
python analysis/scripts/rsf27_questionnaire_aligned_v1/verify_dataset.py
python analysis/scripts/rsf27_questionnaire_aligned_v1/prepare.py
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/rsf27_questionnaire_aligned_v1/train.R
python analysis/scripts/rsf27_questionnaire_aligned_v1/seal_run.py
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/rsf27_questionnaire_aligned_v1/reference.R
python analysis/scripts/rsf27_questionnaire_aligned_v1/evaluate.py
npm run start:experimental-proxy-model
```

The local service is not a clinical API. It requires the completed versioned
research fit and produces only a recorded-CVD proxy probability.
