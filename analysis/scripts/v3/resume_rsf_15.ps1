$Candidate=15
$ErrorActionPreference='Stop'
$root='C:\Users\Alvin Guillermo\Downloads\PINTIG System'
$exe='C:\Program Files\R\R-4.6.1\bin\Rscript.exe'
foreach($fold in 1..5) {
  $dest="$root\analysis\modeling\rsf_selection_candidate_$Candidate\folds\fold_$fold\rsf_oof_predictions.csv"
  if(Test-Path $dest) { Write-Output "SKIP candidate $Candidate fold $fold"; continue }
  Write-Output "RUN candidate $Candidate fold $fold"
  & $exe "$root\analysis\scripts\v3\run_rsf_candidate_$($Candidate)_fold.R" $fold
  if($LASTEXITCODE -ne 0) { throw "Candidate $Candidate fold $fold failed" }
}
Write-Output "Candidate $Candidate completed"
