# PINTIG v2 vs v3 provisional model comparison

## Scope
- v2: 13 predictors; v3: the same 13 plus diabetes, cigarettes_per_day, and heart_rate_bpm.
- Same 4,191 participants, outcome definition, five outer folds, 10-year horizon, and competing-risk evaluation.
- v2 files were read as reference only and were not modified.

## Metric changes (v3 - v2)
   model   v2_AUC   v3_AUC  delta_AUC  v2_Brier  v3_Brier  delta_Brier   v2_IBS   v3_IBS  delta_IBS  v2_calibration_slope  v3_calibration_slope  delta_abs_slope_error  v2_CITL_cloglog  v3_CITL_cloglog  delta_abs_CITL  v2_concordance  v3_concordance  delta_concordance
     Cox 0.597106 0.601706   0.004601  0.064069  0.063498    -0.000571 0.036266 0.036102  -0.000164              0.948572              0.937331               0.011240        -0.003311        -0.005801        0.002490        0.754701        0.759915           0.005215
FineGray 0.597130 0.600784   0.003654  0.064215  0.063724    -0.000491 0.036270 0.036081  -0.000189              0.946365              0.943202               0.003162        -0.001901        -0.003407        0.001506        0.754417        0.759469           0.005052
     RSF 0.589467 0.593577   0.004110  0.064487  0.063690    -0.000796 0.036561 0.036414  -0.000147              0.921083              0.975464              -0.054381        -0.032408        -0.038145        0.005738        0.741567        0.749750           0.008183

## New-predictor fold stability
           feature  cox_coef_mean  cox_coef_sd  cox_hr_mean  cox_hr_min  cox_hr_max  cox_positive_folds  cox_negative_folds  fg_coef_mean  fg_coef_sd  fg_shr_mean  fg_shr_min  fg_shr_max  fg_positive_folds  fg_negative_folds
cigarettes_per_day       0.021137     0.005388     1.021374    1.012722    1.026894                   5                   0      0.019072    0.004526     1.019263    1.011489    1.023397                  5                  0
          diabetes       0.841129     0.062292     2.322590    2.167769    2.490059                   5                   0      0.742449    0.058646     2.103934    1.926601    2.218106                  5                  0
    heart_rate_bpm      -0.005990     0.002310     0.994031    0.991486    0.997213                   0                   5     -0.006416    0.002321     0.993607    0.991092    0.996927                  0                  5

## Data diagnostics
         predictor    n  missing_n      mean  median        sd  event_mean  nonevent_mean  event_median  nonevent_median
          diabetes 4191          0  0.025770     0.0  0.158466    0.075881       0.020931           0.0              0.0
cigarettes_per_day 4191         29  9.034118     0.0 11.947807   11.347826       8.809700           3.0              0.0
    heart_rate_bpm 4191          1 75.904773    75.0 12.035011   76.163043      75.879906          75.0             75.0

- Correlation(current_smoker, cigarettes_per_day) = 0.769420.
- Diabetes prevalence in the eligible provisional cohort = 2.577%.

## Interpretation guardrails
- Positive aggregate performance change does not prove that each newly added predictor independently improves generalization; v3 changes all three simultaneously.
- Regression coefficients are descriptive fold-stability evidence, not causal effects.
- A separate ablation analysis is required to isolate the incremental value of diabetes, cigarettes_per_day, and heart_rate_bpm one at a time.
- These remain provisional Framingham teaching-dataset results and are not Philippine clinical validation.
