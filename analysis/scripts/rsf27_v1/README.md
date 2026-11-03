# 27-feature proxy RSF validation runner

This is an offline experiment, not a questionnaire prediction service. It uses
the frozen 27-predictor engineered dataset without changing it, and writes only
to `analysis/results/rsf27_proxy_20261103_v1/` (ignored by Git).

Run from the repository root, in order:

```powershell
python analysis/scripts/rsf27_v1/prepare.py
python analysis/scripts/rsf27_v1/compatibility.py
python -m unittest discover -s analysis/scripts/v4_corrected -p test_metrics.py
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/rsf27_v1/test_preprocessing.R
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/rsf27_v1/train.R
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/rsf27_v1/reference.R
python analysis/scripts/rsf27_v1/evaluate.py
```

The preparation phase refuses an existing directory. For another experiment,
version the run path in all scripts before running. Completed folds can be
resumed within this run, but model/metric outputs must not be reused after
changing code or inputs. The frozen data and original 5×3 folds are checked
against participant IDs. New generations, source data, and existing fitted
models are never overwritten.

Reuse is deliberate: corrected v4 IPCW and evaluation functions are imported;
the training-only mode/median rules follow v3, with smoking variables mapped to
the 27-feature names. Smoking status is nominal, never ordinal-coded. Logs,
fold predictions, selected parameters, imputation values, session information,
bootstrap draws, R references and model artifact stay in the versioned result
directory. No performance metric is calculated until all outer folds exist.

The model artifact explicitly has `deployment_approved = FALSE`. Do not connect
it to patient assessment. SES lacks validated reference parameters, other
questionnaire definitions differ from synthetic inputs, and the proxy endpoint
does not establish the intended clinical outcome. Six inherited synthetic
recipes also have unresolved historical leakage provenance. Training-fold
separation cannot fix those issues. See the generated compatibility table and
report before interpreting discrimination or calibration.

The final RDS fit is an offline artifact only. Its fabricated-profile roundtrip
test verifies serialization, not questionnaire compatibility or clinical
validity. Conditional bootstrap intervals do not include full retraining or
synthetic-data-generation uncertainty. These limitations remain after a
successful run.
