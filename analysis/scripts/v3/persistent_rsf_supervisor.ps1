$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Alvin Guillermo\Downloads\PINTIG System'
$exe = 'C:\Program Files\R\R-4.6.1\bin\Rscript.exe'
$log = "$root\analysis\results\v3\RSF_PERSISTENT_SUPERVISOR.log"
function Log($msg) { "$(Get-Date -Format o) $msg" | Add-Content -LiteralPath $log }
Log 'SUPERVISOR START'
foreach ($fold in 1..5) {
 foreach ($n in @(14,15)) {
  $out = "$root\analysis\modeling\rsf_selection_candidate_$n\folds\fold_$fold\rsf_oof_predictions.csv"
  while (-not (Test-Path -LiteralPath $out)) {
   $running = @(Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'Rscript.exe' -and
    $_.CommandLine -like "*run_rsf_candidate_$($n)_fold.R*" -and
    $_.CommandLine.Trim().Trim('"') -match "[ ]$fold$"
   })
   if ($running.Count -eq 0) {
    Log "RUN candidate=$n fold=$fold"
    & $exe "$root\analysis\scripts\v3\run_rsf_candidate_$($n)_fold.R" $fold *>> $log
    if ($LASTEXITCODE -ne 0) { Log "FAILED candidate=$n fold=$fold"; exit 2 }
   } else { Start-Sleep -Seconds 45 }
  }
  Log "SAVED candidate=$n fold=$fold"
 }
}
& $exe "$root\analysis\scripts\v3\validate_rsf_candidate_folds.R" *>> $log
if ($LASTEXITCODE -ne 0) { Log 'VALIDATION FAILED'; exit 3 }
$pooled = "$root\analysis\results\v3\RSF_FOCUSED_SELECTION_POOLED.csv"
if (-not (Test-Path $pooled)) {
 & $exe "$root\analysis\scripts\v3\score_rsf_candidate_selection.R" *>> $log
 if ($LASTEXITCODE -ne 0) { Log 'SCORING FAILED'; exit 4 }
}
& $exe "$root\analysis\scripts\v3\finalize_rsf_selection.R" *>> $log
if ($LASTEXITCODE -ne 0) { Log 'REPORT FAILED'; exit 5 }
Log 'COMPLETE'
