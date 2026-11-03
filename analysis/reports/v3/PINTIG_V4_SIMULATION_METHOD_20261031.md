# PINTIG V4: SYNTHETIC SIMULATION ONLY
All 10 new fields in the corresponding CSV are **generated**, not observed, imputed, clinically validated or attributable to actual Framingham/PURE participants.
Random seed: {seed}. Generator: analysis/scripts/v3/generate_v4_simulation.py. No generation rule uses future CVD outcome, death, event time, or fold.
## Generator assumptions (illustrative; not estimated from study data)
- smoking_pack_years: estimated years smoking conditional on age and smoking status; cigarette rate based on current cigarettes/day where available; artificial smoking duration.
- urban_rural_residence: random binary urban indicator weakly associated with preexisting synthetic SES; 1 urban, 0 rural; foreign Framingham geography is **not** inferred.
- sitting_minutes_day: plausible bounded daily minutes conditioned on synthetic activity and simulated urban class; not an actual IPAQ response.
- heavy_episodic_alcohol: illustrative binary episode proxy conditional on synthetic drinks/week; NOT a validated 5+ drinks/day response.
- former_smoker: synthetic among current non-smokers conditional on age and sex.
- lipid_lowering_medication: illustrative treatment probability conditional on baseline age, SBP, diabetes.
- hip_circumference_cm: illustrative hip measurement conditional on *synthetic* waist and sex; not observed.
- diabetes_medication: synthetic treatment indicator, zero for non-diabetes, probability otherwise.
- psychosocial_stress: binary illustrative construct associated with synthetic SES, not PURE multilevel stress score.
- sleep_duration_hours: bounded simulated duration conditional on simulated stress; not observed bedtime/waketime.
All coefficients, distributions and bounds are engineering simulation assumptions, not epidemiological effect sizes or validated clinical score cutoffs. These values MUST NOT be used to infer clinical predictor utility, patient risk, or deploy a 26-feature model.
## Data integrity
The original 22 columns (16 predictors, event/followup keys and fold) are copied byte-for-byte at the value level. Existing six synthetic predictors remain synthetic. This file is separate from frozen v3.
## Appropriate use
Pipeline testing, model robustness / negative-control simulations, sensitivity to arbitrary data-generating assumptions. Not clinical validation or predictor selection in PURE. Future PURE 35-70 data require exact source instrument and codebook. IPAQ Long Form is validated mainly ages 15-69.
## Essential caveat
Because the added values are generated from baseline features and independent draws, they contain no independently measured information on outcomes. A predictive improvement would be stochastic or simulator-dependent. Repeat across simulation seeds/scenarios before interpreting any apparent change.
Source: TRIPOD+AI 2024 https://pmc.ncbi.nlm.nih.gov/articles/PMC11019967/
