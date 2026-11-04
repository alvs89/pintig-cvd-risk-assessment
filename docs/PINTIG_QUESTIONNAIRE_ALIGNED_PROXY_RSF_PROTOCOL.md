# PINTIG questionnaire-aligned proxy RSF protocol

## Scope

This protocol defines a **research-only** local experiment. It preserves the
27-predictor contract and creates a separate semi-synthetic dataset for
testing a questionnaire-to-feature pipeline. It does not validate clinical
prediction, replace the deployed assessment model, or establish the intended
major-CVD endpoint.

## Dataset and outcome

`pintig_framingham_27predictors_QUESTIONNAIRE_ALIGNED_PROXY_EXPERIMENTAL.csv`
has 4,191 unique baseline participants, 27 predictors, and six non-predictor
columns. Age, sex, systolic/diastolic blood pressure, heart rate, hypertension,
BP medication, diabetes, and current smoking intensity are retained from the
baseline Framingham records. The other predictor values come from reproducible
synthetic questionnaire responses generated with seed `27110317` from
allow-listed baseline measurements only.

`event_type=1` is recorded CVD within 3,652.5 days. `event_type=2` is death
before recorded CVD, with cause unknown. It is a competing-event proxy and is
not confirmed non-CVD death. This is not the exact MI/stroke/HF/CV-death
outcome.

## Feature construction

The response sidecar preserves the generated questionnaire-level values. The
existing client feature rules convert those answers as follows:

| Feature group | Construction |
|---|---|
| Alcohol | beverage frequency × reference serving mL × assumed ABV × 0.789 g/mL |
| Smoking | Never/Former/Current from ever/current answers; pack-years = average cigarettes/day ÷ 20 × smoking years net of breaks |
| Passive smoke | childhood Yes/No and maximum reported adult domain duration; this is a lower bound, not an exact union |
| Activity/sitting | IPAQ 7-day frequency/duration rules and 5:2 weekday/weekend sitting mean |
| Diet | PINTIG Food6 frequency conversion and component average |
| SES | categorical education one-hot plus log of a documented synthetic income-category representative divided by √supported people; PCA is fitted inside each training split and oriented toward greater equivalized income |

The income representative is a synthetic generation convention, not an
observed household income or an undisclosed bracket midpoint. PCA scores use a
synthetic-cohort percentile for the final research refit. The browser sends the
raw SES answers to the local R service, which applies the saved refit
transformation; it does not use the unavailable FE-1.3 clinical SES score.

## Validation and training

Participant assignments reuse the frozen 5 outer × 3 inner folds. Each inner
candidate fits the SES PCA, BP-medication mode, heart-rate median, and
current-smoker intensity median using only its training partition. Candidates
are selected by mean inner IPCW 10-year Brier score. The competing-risk RSF
uses `logrankCR`, cause 1, 100 inner trees and 200 outer/refit trees.

The held-out outer-fold estimates and their 500 conditional participant
bootstrap intervals are in the versioned results directory. The bootstraps
re-estimate weights but do not retrain forests; they do not capture synthetic
generation, selection, or transport uncertainty.

## Local output boundary

`npm run start:experimental-proxy-model` starts a loopback-only service on
port 8766. It requires a local Vite origin and an explicit research header. It
stores no response and receives no patient identifier. The assessment displays
only a **10-year recorded-CVD proxy probability** and never assigns a clinical
risk category from this model.

The model remains unsuitable for clinical use because its predictor values are
semi-synthetic, the endpoint is a proxy, the SES transform is not validated in
an observed Philippine reference population, and neither external validation
nor clinical utility evaluation has occurred.
