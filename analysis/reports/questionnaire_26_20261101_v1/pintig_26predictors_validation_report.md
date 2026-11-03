# Dataset validation results

Validated 9 generated datasets and all linked questionnaire response tables.

Raw/frozen/prior research/application hashes unchanged: True.

All 26 feature names and six metadata names match the schema; 32 columns; 4,191 unique linked eligible participants.
Observed values/missingness, first22 values and folds match exactly. All four new transformations recompute from response sidecars.
Hip repeats, original medication categories, work skip rule and 24-hour accounting pass for every scenario.
Exact endpoint values: 4,191 unavailable in each of four columns. NA is not a censored event or a negative outcome.

## Preserved recorded-CVD proxy only

Event counts: {'0': 3604, '1': 369, '2': 218} (0 censored;1 recorded CVD;2 death before recorded CVD, cause unknown).
Follow-up days: {'count': 4191.0, 'mean': 3413.402290622763, 'std': 704.5603244384363, 'min': 26.0, '25%': 3652.5, '50%': 3652.5, '75%': 3652.5, 'max': 3652.5}
Administrative censoring at3652.5 days: 3588.
Raw reconstruction exactly matches the existing proxy. CVD takes priority on same-day CVD/death; this is not adjudication of cause.

## Predictor distributions and missingness

                            count        mean         std   min    25%     50%     75%    max  missing
age_years                  4191.0   49.632785    8.502111  35.0   42.0   49.00   56.00   70.0        0
sex_male                   4191.0    0.430208    0.495164   0.0    0.0    0.00    1.00    1.0        0
sbp_mmhg                   4191.0  132.360296   22.004599  83.5  117.0  128.00  143.50  295.0        0
dbp_mmhg                   4191.0   82.909926   11.890468  48.0   75.0   82.00   89.50  142.5        0
waist_cm                   4191.0   89.179194   10.747445  55.0   81.4   89.20   96.50  147.0        0
current_smoker             4191.0    0.494870    0.500033   0.0    0.0    0.00    1.00    1.0        0
hypertension_history       4191.0    0.309473    0.462331   0.0    0.0    0.00    1.00    1.0        0
bp_medication              4139.0    0.028268    0.165757   0.0    0.0    0.00    0.00    1.0       52
alcohol_drinks_week        4191.0    4.703651    6.854421   0.0    0.0    2.00    5.90   42.0        0
activity_min_week          4191.0  180.200668  128.018232   0.0   90.0  149.00  238.00  900.0        0
diet_score_0_100           4191.0   56.009664    9.119347  25.7   50.0   56.00   62.25   88.0        0
ses_index_0_100            4191.0   50.128394   16.155786   5.0   39.0   50.10   61.10   95.0        0
family_history_cvd         4191.0    0.386065    0.486904   0.0    0.0    0.00    1.00    1.0        0
diabetes                   4191.0    0.025770    0.158466   0.0    0.0    0.00    0.00    1.0        0
cigarettes_per_day         4162.0    9.034118   11.947807   0.0    0.0    0.00   20.00   70.0       29
heart_rate_bpm             4190.0   75.904773   12.035011  44.0   68.0   75.00   83.00  143.0        1
smoking_pack_years         4191.0    7.175700    9.727355   0.0    0.0    3.15   12.00  117.0        0
urban_rural_residence      4191.0    0.560487    0.496387   0.0    0.0    1.00    1.00    1.0        0
sitting_minutes_day        4191.0  463.203293  113.590930  60.0  390.0  465.00  539.00  888.0        0
heavy_episodic_alcohol     4191.0    0.118349    0.323059   0.0    0.0    0.00    0.00    1.0        0
former_smoker              4191.0    0.134574    0.341309   0.0    0.0    0.00    0.00    1.0        0
lipid_lowering_medication  4191.0    0.068719    0.253005   0.0    0.0    0.00    0.00    1.0        0
hip_circumference_cm       4191.0   98.608399    8.477392  70.2   93.0   98.50  104.10  131.3        0
diabetes_medication        4191.0    0.014794    0.120740   0.0    0.0    0.00    0.00    1.0        0
psychosocial_stress        4191.0    0.509902    0.499962   0.0    0.0    1.00    1.00    1.0        0
sleep_duration_hours       4191.0    6.944834    1.024344   3.5    6.3    6.90    7.70   10.5        0

Categorical counts, outer-fold counts and all scenario summaries are supplied as separate CSVs.
No clinical performance metrics or superiority claim: model training was not part of this reconstruction.
See preprocessing report for unresolved endpoint, instrument, fold-seed and legacy synthetic-definition limitations.