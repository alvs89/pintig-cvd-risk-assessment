$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Alvin Guillermo\Downloads\PINTIG System'
$exe = 'C:\Program Files\R\R-4.6.1\bin\Rscript.exe'
$log = "$root\analysis\results\v3\PINTIG_PERSISTENT_COMPLETION.log"
function Log($s) { "$(Get-Date -Format o) $s" | Out-File -FilePath $log -Append }
Log 'Workflow started'
foreach ($candidate in @(14,15)) {
  for ($fold=1; $fold -le 5; $fold++) {
    $file = "$root\analysis\modeling\rsf_selection_candidate_$candidate\folds\fold_$fold\rsf_oof_predictions.csv"
    if (Test-Path $file) { Log "SKIP candidate=$candidate fold=$fold"; continue }
    Log "START candidate=$candidate fold=$fold"
    & $exe "$root\analysis\scripts\v3\run_rsf_candidate_$($candidate)_fold.R" $fold *>> $log
    if ($LASTEXITCODE -ne 0) { Log "FAIL candidate=$candidate fold=$fold"; exit 10 }
    if (!(Test-Path $file)) { Log "FAIL output absent candidate=$candidate fold=$fold"; exit 11 }
    Log "DONE candidate=$candidate fold=$fold"
  }
}
& $exe "$root\analysis\scripts\v3\validate_rsf_candidate_folds.R" *>> $log
if ($LASTEXITCODE -ne 0) { Log 'Validation failed'; exit 12 }
& $exe "$root\analysis\scripts\v3\score_rsf_candidate_selection.R" *>> $log
if ($LASTEXITCODE -ne 0) { Log 'Scoring failed'; exit 13 }
& $exe "$root\analysis\scripts\v3\finalize_rsf_selection.R" *>> $log
if ($LASTEXITCODE -ne 0) { Log 'Final report failed'; exit 14 }
Log 'WORKFLOW FINISHED SUCCESSFULLY'
