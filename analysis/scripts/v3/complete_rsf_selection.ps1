$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Alvin Guillermo\Downloads\PINTIG System'
$exe = 'C:\Program Files\R\R-4.6.1\bin\Rscript.exe'
$out = "$root\analysis\results\v3"
$log = "$out\RSF_SELECTION_AUTOMATION_LOG.txt"
"Started RSF finalization: $(Get-Date -Format o)" | Out-File -FilePath $log -Append
$files = @()
foreach($n in @(14,15)) {foreach($f in 1..5) {$files += "$root\analysis\modeling\rsf_selection_candidate_$n\folds\fold_$f\rsf_oof_predictions.csv"}}
while(@($files | Where-Object { -not (Test-Path $_) }).Count -gt 0) {
  Start-Sleep -Seconds 60
}
"Prediction files present: $(Get-Date -Format o)" | Out-File $log -Append
& $exe "$root\analysis\scripts\v3\validate_rsf_candidate_folds.R" *>> $log
if($LASTEXITCODE -ne 0) { "Validation failed exit=$LASTEXITCODE" | Out-File $log -Append; exit 2 }
"All fold checks passed: $(Get-Date -Format o)" | Out-File $log -Append
$score="$out\RSF_FOCUSED_SELECTION_POOLED.csv"
$ready=$false
foreach($j in 1..10) {
  if(Test-Path $score) {$ready=$true;break}
  Start-Sleep -Seconds 30
}
if(-not $ready) {
  "Previous scoring not found; running scoring" | Out-File $log -Append
  & $exe "$root\analysis\scripts\v3\score_rsf_candidate_selection.R" *>> $log
  if($LASTEXITCODE -ne 0) { "Scoring failed" | Out-File $log -Append; exit 3 }
}
& $exe "$root\analysis\scripts\v3\finalize_rsf_selection.R" *>> $log
if($LASTEXITCODE -ne 0) { "Reporting failed" | Out-File $log -Append; exit 4 }
"FINAL REPORT SAVED $(Get-Date -Format o)" | Out-File $log -Append
