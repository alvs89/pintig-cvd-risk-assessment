param([string]$OnlyScenario = '')
$ErrorActionPreference = 'Stop'
$runRoot = Join-Path (Get-Location) 'analysis/results/v4_corrected_20261031_v1'
$selected = (Get-Content (Join-Path $runRoot 'robustness_selected.json') | ConvertFrom-Json).configurations -join ','
$rscript = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe'
$jobs = @(@{ scenario = 'original_draw'; seed = 20265001 })
foreach ($dataSeed in @(20261031, 20261101)) {
    foreach ($regime in @('original', 'weakdependence')) {
        foreach ($trainingSeed in @(20265000, 20265001)) {
            $jobs += @{ scenario = "seed${dataSeed}_${regime}"; seed = $trainingSeed }
        }
    }
}
foreach ($job in $jobs) {
    if ($OnlyScenario -and $job.scenario -ne $OnlyScenario) { continue }
    $command = "& '$rscript' analysis/scripts/v4_corrected/run_nested.R $($job.scenario) $($job.seed) $selected"
    Add-Content -LiteralPath (Join-Path $runRoot "commands_$($job.scenario).txt") -Value $command
    & $rscript analysis/scripts/v4_corrected/run_nested.R $job.scenario $job.seed $selected
    if ($LASTEXITCODE -ne 0) { throw "Failed scenario $($job.scenario)" }
}
