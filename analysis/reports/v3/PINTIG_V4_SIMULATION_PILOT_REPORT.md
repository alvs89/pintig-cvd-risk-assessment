# PINTIG v4 simulation pilot report — 2026-10-30

## Status and purpose
COMPLETED: Separate 26-feature SIMULATION ONLY dataset generated (4191 participants), the 10 new variables are entirely artificial. Three fixed-hyperparameter competing-risk Random Survival Forest configurations were trained across the existing five outer folds (100 trees each; no nested hyperparameter tuning). Every existing observed/synthetic v3 value, participant identity, event label and follow-up value was preserved; no outcome information was used in simulation.

NOT COMPLETED: nested 5x3 predictor selection, multiple-generator scenario sensitivity, 10-year calibration slope/plot, integrated Brier score, bootstrap confidence intervals, and clinical utility evaluation. No claim that 21 features is the best clinical or final model.

## Observed pilot results (IPCW estimates from script; precision not uncertainty)
|Configuration|IPCW AUC at 10y|IPCW Brier at 10y|Train seconds total|
|---|---:|---:|---:|
|16 existing predictors|0.593029|0.063451|10.70|
|21 features (first 5 newly simulated)|0.602594|0.063642|19.79|
|26 features (all 10 newly simulated)|0.597412|0.063726|22.08|

The 21-feature configuration shows higher apparent AUC but worse Brier compared with the 16-feature pilot, and the 26-feature configuration shows smaller AUC gain and worse Brier. These tiny differences cannot justify predictor selection because simulations were conditional on existing variables plus random noise; no new clinical outcome information was observed. Results are *not* directly interchangeable with previous 13–16 predictor nested-CV results (different tuning and implementation).

## Reproduction
1. python analysis/scripts/v3/generate_v4_simulation.py
2. & 'C:\Program Files\R\R-4.6.1\bin\Rscript.exe' analysis/scripts/v3/run_v4_26_simulation_rsf_pilot.R
3. python analysis/scripts/v3/score_v4_simulation_pilot.py

Dataset: data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv
Per-person out-of-fold scores: analysis/results/v4_simulation/RSF_PILOT_OOF_SIMULATION.csv
Aggregate scores: analysis/results/v4_simulation/RSF_PILOT_METRICS_SIMULATION_ONLY.csv
Simulation assumptions: analysis/reports/v3/PINTIG_V4_SIMULATION_METHOD.md
Provenance of candidate fields: analysis/reports/v3/PINTIG_V4_26_CANDIDATES_PROVENANCE.csv

## Important restrictions
Never enter simulated participant values as actual patient history; do not copy them to the app database or deploy the trained simulation models. Synthetic datasets have no independent evidence of outcome relationships. A true PURE model requires observed Philippine cohort data and exact questionnaire/data dictionary. All scoring/clinical guidance in production must remain independent of this demonstration.
Source guidance: TRIPOD+AI https://pmc.ncbi.nlm.nih.gov/articles/PMC11019967/
