# PINTIG 26-candidate feasibility gate — 2026-10-30

Status: verified raw and frozen CSV headers on Alvs89. This is a research audit, NOT a new validated model or a generated dataset.

## Baseline
Raw Framingham has 39 columns. Frozen v3 has 16 predictors and outcome/fold fields. Keep both immutable. No recorded smoking duration, former smoking, urban/rural, sitting time, binge drinking, lipid-lowering medication, hip circumference, diabetes medication, stress, or sleep field is present in the verified raw or v3 headers.

## Ten candidates
| Candidate | Raw Framingham observed? | Can derive from existing observed data? | Decision |
|---|---|---|---|
| Pack-years | No (CIGPDAY only) | No; years smoking missing | No participant-level imputation |
| Urban/rural | No | No | Do not assign geographic class |
| Sedentary time | No | No | No IPAQ Q26–27 responses |
| Heavy episodic alcohol | No | No | No drinking episodes observed |
| Former smoking/cessation | No (CURSMOKE current only) | No | Never smoker and former smoker inseparable |
| Cholesterol-lowering medication | No | No | No treatment records |
| Hip/waist-to-hip ratio | No (waist synthetic) | No | Hip unavailable; waist is synthetic |
| Diabetes medication | No (DIABETES only) | No | Diagnosis not equivalent to treatment |
| Psychosocial stress | No | No | No baseline responses |
| Sleep duration | No | No | No sleep-time responses |

## Scientific go/no-go
- Do NOT manufacture patient-level values or outcome-dependent associations for these ten. A synthetic feature that merely correlates with already observed predictors does not establish real incremental CVD prediction.
- Do NOT treat structurally unmeasured columns as ordinary missing observations or fill them with medians/modes; they are absent by design.
- Do NOT change recorded outcomes, censoring times, participant IDs or outer folds.
- Keep current 13/14/15/16 predictor results as provisional and six existing augmented predictors explicitly labeled synthetic.
- A separate simulation-only dataset may be built once externally supported joint distributions and assumptions are available, but it cannot select clinically valid predictors for PURE.
- Prioritize an observed-only Framingham sensitivity analysis and future real PURE variable dictionary before evaluating expanded predictor sets.

## Model evaluation requirements when suitable data exist
Predefine predictor groups; train-fold-only imputation, tuning, and feature selection; nested 5 outer / 3 inner folds; competing-risk 10-year CIF; time-dependent AUC, 10-year Brier, IBS, calibration-in-the-large/slope/plot, bootstrap uncertainty, and runtime; optional decision-curve analysis with suitable assumptions. Never select final features by repeatedly optimizing on outer test folds.

## References
TRIPOD+AI 2024: https://pmc.ncbi.nlm.nih.gov/articles/PMC11019967/
TRIPOD+AI supplementary checklist (train/test imputation leakage): https://www.tripod-statement.org/wp-content/uploads/2024/04/TRIPODAI-Supplement.pdf

## Next step
Obtain the real Philippine PURE codebook and joint data, or authorize an explicitly simulation-only methodological experiment. Do not label simulated performance clinical validation.
