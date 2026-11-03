# PINTIG Thesis 1: Complete 16–26 focused nested RSF comparison (2026-10-31)

## Study conditions
**Simulation only**: Same 4,191 provisional Framingham baseline participants (369 major CVD, 218 competing deaths, 3,604 censored), recorded outcomes and participant folds unchanged. The ten newly proposed variables are SIMULATED with illustrative, non-validated assumptions; six of the original 16 predictors are also synthetic. This study does not establish clinical predictor value.

## Protocol
All 11 candidate configurations evaluated using 5 outer folds and 3 inner tuning folds, two RSF hyperparameter configurations (100-tree inner model; 200-tree final model; logrankCR, cause=1), 10-year cause-specific CIF predictions, training-fold-only Framingham observed missingness treatment using scripts/pintig_v3_modeling_config.R. Independent outer folds, same original membership. Selection heuristic in inner folds is unweighted 10-year Brier on known-status observations, not full IPCW; therefore this is a **focused nested pilot**, not a comprehensive rigorously optimized clinical model.

Config semantics:
- n16: existing 16.
- n17: existing 16 + simulated smoking_pack_years.
- n18_smoking: existing 16 + simulated smoking_pack_years and former_smoker.
- n19: original 16 + first 3 simulated candidates = pack-years, urban/rural, sitting duration.
- n20_behaviour: existing 16 + sitting, heavy alcohol episode, psychosocial stress, sleep duration (a different subset, not cumulative first-four).
- n21: original 16 + first five simulated candidates: pack-years, urban/rural, sitting duration, heavy episodic drinking, former smoker.
- n22..n25: original 16 + first 6..9 respectively, in generator order.
- n26: all ten added simulated candidates.
**Warning:** Since n18_smoking and n20_behaviour are different group selections, row counts do NOT form a pure monotonic forward-addition series. The n17, n19, n21–25 and n26 groups are cumulative first k in generator order.

## Focused nested results
|Predictors|AUC at 10 years ↑|Brier at 10 years ↓|IBS years 1–10 ↓|Approx calibration slope (ideal 1)|Fit seconds|
|--:|--:|--:|--:|--:|--:|
|16|0.588734|0.063221|0.039677|0.234|41.53|
|17|0.598460|0.062978|0.039638|0.245|36.00|
|18|0.599275|0.062722|0.039710|0.244|50.54|
|19|0.595822|0.062874|0.039633|0.238|38.89|
|20*|0.590414|0.063242|0.039741|0.240|47.98|
|21|**0.603415**|**0.062689**|**0.039610**|0.251|40.69|
|22|0.592904|0.062947|0.039684|0.231|47.62|
|23|0.599885|0.062916|0.039651|**0.259**|35.14|
|24|0.598179|0.062908|0.039733|0.250|43.71|
|25|0.597668|0.063076|0.039728|0.252|42.21|
|26|0.596784|0.063182|0.039762|0.244|45.67|

*20 is an alternative behavior-only group.

### Paired conditional bootstrap CIs vs baseline 16
Bootstrap was 200 participant-level resamples of out-of-fold predictions with re-estimated censoring weights, but **models were not refitted**. Conditional CIs do not account for simulation, refitting or the optimism of picking a winner after evaluating 11 configurations:
- 21 vs 16 AUC difference **+0.014681**; 95% percentile CI **+0.001935 to +0.026513**. Brier difference **−0.000532**; 95% percentile CI **−0.000953 to −0.000108**.
- 18 vs 16 AUC difference +0.010541; 95% CI −0.001746 to +0.021813. Brier difference −0.000499; 95% CI −0.000902 to −0.000043.
Many candidate comparisons were evaluated; unadjusted intervals are not proof of a confirmatory superiority claim.

### Hypothetical assumption that all data are genuinely measured
Under the **counterfactual** that all 26 fields and outcomes were genuinely measured, 21 would be the best **numerical candidate** from this particular sample: highest AUC, lowest 10-year Brier, lowest 1–10-year IBS, and fewer inputs than 26. It still cannot be called a finalized clinically reliable 10-year risk estimator: calibration slopes around 0.23–0.26 indicate serious concerns, and discrimination only ~0.60. A future independent evaluation of n21, proper competing-risk calibration and potential recalibration, and clinical usability review are necessary.
In the *actual* experiment, those variables were synthetic, so **DO NOT deploy or adopt n21 as clinically justified**. The original 16 remains the frozen reference; n21 is only the leading **single-draw simulation candidate**.

### Sensitivity studies and caveats
Two alternative draws of simulator random values were tested for base16, smoking18, behavior20, all26 under fixed hyperparameters; expanded model gains were not robust. The 21-feature configuration has NOT undergone multi-seed sensitivity testing, so do not generalize its superiority to other simulation draws. Confidence limits are conditional on the present synthetic scenario and are not clinical validation.

Metric limitations:
- IPCW estimator based on pooled observed censoring distribution and ordinary outcome event indicators; metric conventions need independent review against reference clinical packages.
- IBS covers years 1 through 10, not 0 through 10.
- Calibration slope/intercept use approximate weighted complementary-log-log pseudo-Bernoulli estimation; do not present as definitive competing-risk nonparametric calibration.
- Tuning grid consists of two prespecified RSF configurations, not exhaustive hyperparameter optimization.
- Predictor count is not strictly monotonic inclusion as noted.
- No repeated-selection outer-independent inference or external validation.

## Outputs (verified under existing project)
- analysis/results/v4_simulation/nested/ALL_11_NESTED_METRICS.csv
- analysis/results/v4_simulation/nested/ALL_11_NESTED_OOF_WITH_CIF_LONG.csv
- analysis/results/v4_simulation/nested/ALL_11_BOOTSTRAP_95CI.csv
- analysis/results/v4_simulation/nested/ALL_11_BOOTSTRAP_REPLICATES_200.csv
- analysis/results/v4_simulation/nested/NESTED_REMAINING_TUNING.csv
- analysis/results/v4_simulation/nested/NESTED_TUNING.csv
- scripts: analysis/scripts/v4_nested_remaining.R, analysis/scripts/v4_score_all_eleven.py, analysis/scripts/v4_bootstrap_all_eleven.py

## References
TRIPOD+AI 2024 https://pmc.ncbi.nlm.nih.gov/articles/PMC11019967/
Competing-risk time-dependent predictive metrics (2026) https://pmc.ncbi.nlm.nih.gov/articles/PMC12766878/
