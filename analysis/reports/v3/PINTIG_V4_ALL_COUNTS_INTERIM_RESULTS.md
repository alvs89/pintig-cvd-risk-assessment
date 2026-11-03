# PINTIG v4 16–26 RSF model count experiment — INTERIM, SIMULATION ONLY

Completed 2026-10-31. 4,191 provisional baseline participants; 369 event-1 major CVD, 218 competing deaths, 3604 censored. Frozen v3 preserved. The ten added features are synthetic and were generated with explicit arbitrary exploratory coefficient settings, not estimated from real PURE participant observations. Generation did not use outcome or time. No clinical validity claimed.

Methods: 11 nested *candidate counts* (16, 17, ... 26), 5 fixed original outer fold memberships each, 55 100-tree competing-risk randomForestSRC RSF fits (logrankCR, cause 1), fixed pilot mtry=sqrt(p), nodesize=15, nsplit=10. Missing original predictor treatment uses scripts/pintig_v3_modeling_config.R; imputation fitted on training partition and applied to held-out partition. No complete multiple imputation or 5x3 nested hyperparameter tuning yet. Existing six synthetic predictors remain synthetic.

|Features|10y AUC (IPCW approx)|10y Brier (IPCW approx)|
|--:|--:|--:|
|16|0.59481|0.06332|
|17|0.59844|0.06319|
|18|0.60052|0.06346|
|19|0.60316|0.06339|
|20|0.60320|0.06364|
|21|0.60267|0.06377|
|22|0.60005|0.06375|
|23|0.60644|0.06359|
|24|0.60036|0.06387|
|25|0.59764|0.06363|
|26|0.59323|0.06392|

AUC pilot highest at 23, Brier pilot lowest at 17. Count comparisons are **sequential cumulative candidate lists** in generator order; not exhaustive subsets, independent feature rankings or clinically justified inclusion. Stochastic differences are small and likely unstable. Re-evaluate multiple random seeds and include sample uncertainty.

**Unfinished:** proper nested 5 outer x 3 inner tuning and selection, integrated Brier requiring full longitudinal CIF output, calibration slope and clinical utility plots, uncertainty intervals, multi-scenario synthetic sensitivity analyses, final predictor recommendation, and questionnaire UI modifications.

Reproduction:
- python analysis/scripts/v3/generate_v4_simulation.py
- Rscript analysis/scripts/v3/run_v4_all_counts_pilot.R (full path to Rscript.exe may be required)
- python analysis/scripts/v3/score_v4_all_counts_pilot.py

Files: data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv ; analysis/results/v4_simulation/RSF_ALL_COUNTS_16_26_OOF_SIMULATION.csv ; analysis/results/v4_simulation/RSF_ALL_COUNTS_16_26_METRICS_SIMULATION.csv

Critically: these synthetic features are simulated proxies conditioned on existing values. No new independently observed predictor information has been added. **Do not finalize real predictors, clinical risk claims, or deploy from simulation rankings.** PURE PH measured data and exact codebook remain necessary for Thesis 2.
