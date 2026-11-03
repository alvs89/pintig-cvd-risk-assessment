# Executed command audit

Working directory: `C:\Users\Alvin Guillermo\Downloads\PINTIG System`.
This log records analysis/test commands actually executed, including recoverable
failures. Commands not yet executed are not listed as completed. The full tool
transcript also records read-only `Get-Content`, `rg`, Git-status, source patching,
and inline aggregate-only Python inspections.

## Preparation and tests

```powershell
python analysis/scripts/v4_corrected/test_metrics.py
python analysis/scripts/v4_corrected/prepare.py
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/v4_corrected/test_reference.R
python analysis/scripts/v4_corrected/scenarios.py
python analysis/scripts/v4_corrected/weak_scenarios.py
npm run check
npm run build
```

- Seven Python tests initially passed. The R tests initially needed an explicit
  `library(survival)` import; after correction, the nine boundary combinations
  and training-only imputation assertions passed.
- `npm run check` initially hit sandbox `spawn EPERM`. The same command rerun
  with approved process-spawn access passed 66 tests and type checking.
- `npm run build` passed.
- An initial R `-e` package query failed because PowerShell stripped nested
  quotes. Package versions were subsequently verified by `test_reference.R`.
- An attempted read-only CIM query was denied; no system configuration changed.

## Primary nested training

```powershell
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/v4_corrected/run_nested.R
```

The initial sequential process was interrupted after completing n16 folds 1–5
and n17 folds 1–4. Completed artifacts were retained. Disjoint configuration
groups then resumed those completed folds and ran concurrently:

```powershell
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/v4_corrected/run_nested.R primary 20265000 n16,n17,n18
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/v4_corrected/run_nested.R primary 20265000 n19,n20,n21
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/v4_corrected/run_nested.R primary 20265000 n22,n23,n24
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/v4_corrected/run_nested.R primary 20265000 n25,n26
```

## Early independent reference check

```powershell
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/v4_corrected/reference.R 16
```

The first attempt reached AUC/Brier and Aalen–Johansen output but required an
explicit `keep=NULL` argument for the installed IPCW method. The corrected rerun
completed. Python/R AUC and Brier agreed over all 40 n16 horizons, and weighted
calibration coefficients agreed. These diagnostic outputs are separate from the
full final reference comparison.

An inline read-only Python diagnostic also rescored previous saved v4 predictions
with the corrected weights, producing
`analysis/results/v4_corrected_20261031_v1/previous_models_rescored_no_retuning.csv`.
Those old models were not retrained by this diagnostic and are not the corrected
nested experiment.

## Complete comparison and robustness

```powershell
python analysis/scripts/v4_corrected/evaluate.py primary
& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/v4_corrected/reference.R
& ./analysis/scripts/v4_corrected/robustness.ps1 -OnlyScenario original_draw
& ./analysis/scripts/v4_corrected/robustness.ps1 -OnlyScenario seed20261031_original
& ./analysis/scripts/v4_corrected/robustness.ps1 -OnlyScenario seed20261031_weakdependence
& ./analysis/scripts/v4_corrected/robustness.ps1 -OnlyScenario seed20261101_original
& ./analysis/scripts/v4_corrected/robustness.ps1 -OnlyScenario seed20261101_weakdependence
```

The robustness script writes the exact expanded R commands to
`analysis/results/v4_corrected_20261031_v1/commands_<scenario>.txt` before each
invocation. Independent scenarios run concurrently. The script exits on failure;
final verification requires complete outputs for every expected scenario.

## Final scoring and artifact audit

```powershell
python analysis/scripts/v4_corrected/evaluate.py robustness
python analysis/scripts/v4_corrected/test_metrics.py
python -m py_compile analysis/scripts/v4_corrected/prepare.py analysis/scripts/v4_corrected/evaluate.py analysis/scripts/v4_corrected/finalize.py analysis/scripts/v4_corrected/scenarios.py analysis/scripts/v4_corrected/weak_scenarios.py
git diff --check
python analysis/scripts/v4_corrected/finalize.py
```

An inline Python validation additionally checked the evaluation view's exact
participant linkage, complete-at-horizon flags, absence of missing fields, and
sentinel mapping; it saved `protocol_and_provenance.json`. The sentinel is an
explicit evaluation-only representation within the documented raw follow-up,
not a new claimed clinical censor date. No participant rows were printed.

The first finalization attempt exposed an audit-log formatting issue: R
`data.table` had expanded each three-value imputer list into three ordered `V5`
rows. The original logs were retained; finalization normalizes their established
list order and independently checks every value against the appropriate training
partition. Future logging uses explicit named columns. Model fitting and
predictions were unaffected; no metric or training rerun was needed for this
logging correction.
