# PINTIG exploratory RSF predictor-set comparison

This report compares five-fold held-out 10-year outcomes for the 14-, 15-, and 16-predictor competing-risk RSF candidates.
These are provisional Framingham teaching-cohort results; the candidate specification was examined using the same cohort, so this is not independent external validation.

| Predictors | AUC | Brier (10-year) | Calibration slope |
|---|---:|---:|---:|
| 14 | 0.59178 | 0.06399 | 0.9394 |
| 15 | 0.59374 | 0.06374 | 0.9618 |
| 16 | 0.59358 | 0.06369 | 0.9755 |

Lower Brier is better; higher AUC is better. Calibration slopes nearer 1 are generally preferable.
Do not select solely by the largest AUC. Review uncertainty, clinical plausibility, availability of predictors, calibration, and deployment feasibility.
IBS and cause-specific concordance for the 14/15 candidates are not in this scoring output; therefore this report is a partial metric comparison, not a final clinical validation.
The six synthetic/augmented predictors and absence of Philippine external validation remain important limitations.
Frontend questionnaire and frozen v2 datasets must not be changed automatically.
