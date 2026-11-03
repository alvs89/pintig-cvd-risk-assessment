# Proposed 27-predictor engineered dataset

Created on 2026-11-03 (Asia/Manila):
`data/processed/questionnaire_27_engineered_20261103_v1/pintig_framingham_27predictors_ENGINEERED_PROXY_EXPERIMENTAL.csv`.

The file follows the requested order exactly:27 predictors and6 metadata/outcome fields,33 columns total,
4,191 unique baseline participants. It retains22 predictors unchanged and adds/replaces5 engineered features.
Original datasets, including the28-feature source and separate exact-endpoint dataset, remain unchanged.
Removed input columns remain recoverable from the source file; no historical measurements were deleted.

## Transformations and provenance

| Feature | Rule | Provenance |
|---|---|---|
| alcohol_ethanol_g_week | weekly serving count x serving mL x assumed ABV fraction x0.789g/mL; round4 decimals | Derived from synthetic inputs and explicit assumptions |
| smoking_status | current_smoker=1 => Current; otherwise former_smoker=1 => Former; otherwise Never | Mixed observed current status and simulated former history; Never is not verified lifetime history |
| current_smoking_intensity_cigs_day | CIGPDAY for current smokers;0 for noncurrent smokers; preserve unknown current values | Derived from observed measurements;29 current-smoker values remain missing |
| passive_smoking_childhood | Main childhood household-exposure response, supported by simulated mother/father/other responses | Synthetic, not observed family history |
| passive_smoking_adult_years | Unique exposed adult years across four synthetic domain intervals; overlap counted once | Synthetic derivation; age18 onset of adulthood and aggregation are proposed adaptations |

The source components current_smoker, former_smoker, cigarettes_per_day, alcohol_drinks_week,
alcohol_beverage_type and alcohol_serving_size_ml are excluded from the new predictor matrix.
Their original values remain intact in the28-predictor file. The sidecar SYNTHETIC_engineering_inputs.csv
preserves participant-linked passive-smoking responses, artificial interval timing and alcohol assumptions.

## Questionnaire alignment

**Framingham Gen-3-Exam-1.pdf, physical/printed PDF page29, form70308, MD08, Passive smoking exposure.**
The page was visually verified. Its items are unnumbered; numeric item numbers are not invented.

- Childhood: "In your childhood, did you live with a regular cigarette smoker who smoked in your home?"
  Codes0=no,1=yes,9=unknown. If yes, mother/father/others; if others, number of others.
- Adult home: "As an adult, now or in the past, have you ever lived with a regular cigarette smoker who smoked in your home?"
  Codes0=no,1=yes,9=unknown. If yes, spouse/partner and others in household, each with years of exposure.
- Outside home: "Currently, when you are not at home, do you regularly spend time indoors where there are people smoking cigarettes?"
  Codes0=no,1=yes,9=unknown. If yes, work and other-than-work with years of exposure.

Follow-up fields are blank when skipped. No unknown responses are sampled in this version; unknown is not a no.
The form does not define a single cumulative adult total or supply start/end ages. Those are explicit simulation
adaptations. The historical CSV contains no actual answers. This modern Gen3 instrument is a construct reference,
not evidence that the historical Framingham participants answered it.

The South African PURE questionnaire, pone.0271169.s001.pdf PDF17/printed8 Q26, only asks noncurrent/former
smokers about exposure during the past12 months. It does not establish childhood or lifetime adult duration.
Therefore its skip restriction is not imposed on these Gen3-based lifetime features; current smokers can also have passive exposure.

Alcohol retains the prior South African PURE Q28(c) reference (PDF19/printed9): beer375mL, wine125mL,
spirits30mL, country liquor30mL. This is still a single-predominant-beverage adaptation of a multiple-choice item.

## Alcohol assumptions: no verified unit harmonization

The legacy alcohol_drinks_week was synthetic and has no recovered unit-harmonization recipe. This version explicitly
**assumes its numerical value is the number of assigned-beverage servings per week** to construct the proposed feature.
This is a new experimental assumption, not proof that the old field measured beverage servings rather than standardized ethanol units.
ABV assumptions are beer5%, wine12%, spirits40%, country liquor40%; zero intake has ABV0 and ethanol0.
[NIAAA's drink examples](https://www.niaaa.nih.gov/alcohols-effects-health/what-standard-drink)
support typical beer/wine/spirits strengths but do not establish participant-specific values or the country-liquor assumption.
0.789g/mL is an approximate fixed ethanol-density conversion convention. No product-specific ABV is known.

The sidecar also calculates `ethanol_g_week_alternative_14g_per_legacy_drink` as14 x legacy weekly drinks,
showing the alternative interpretation if a legacy drink meant a US standard drink. This is an assumption contrast,
not a competing observed estimate or a model-performance sensitivity analysis. No frequency/episode history is fabricated.
The existing heavy_episodic_alcohol indicator is copied unchanged; it is not an adjudicated PURE >5 drinks/day response.
Do not infer episode frequency, blood alcohol, or verified clinical alcohol exposure from these synthetic values.

## Passive-smoking simulation assumptions

Fixed seed20261103, NumPy default_rng/PCG64, participant order ascending ID.
Childhood mother/father/other exposure draws are independent Bernoulli0.30/0.50/0.15; any yes sets the main item yes.
Where other household exposure is yes, number of others is uniform integer1-3. These are illustrative probabilities,
not estimates of Framingham, PURE or Philippine household prevalence.
Adult partner/other-household/work/other-indoor indicators independently use probabilities0.35/0.20/0.30/0.15.
For positive exposure, start age is uniform integer18 through baseline age-1. Household end age is uniform
start+1 through baseline age; work/other-indoor intervals end at baseline to match the current-exposure wording.
Duration is end-start. The final feature counts the union of all half-open exposed age intervals [start,end),
so overlapping domains cannot inflate total duration beyond age-18. Whole-year resolution is a simplification.
No intervals are observed histories. The questionnaire only supplies domain-duration concepts, not their joint distribution.
No cohort statistics, outcome, follow-up time or fold influences generation; baseline age only bounds the artificial exposure window.

## Definitions that must not be silently relabeled

- Waist, hip, SES, urban/rural, diet, activity, stress and other inherited simulated fields remain simulated.
  Their inclusion does not make them measured observations.
- diet_score_0_100 and ses_index_0_100 remain arbitrary legacy synthetic scores, not newly validated questionnaire scores.
- sleep_duration_hours remains hours per typical24-hour day from Gen3 TECH05. It cannot truthfully be relabeled
  hours/night without additional data. Its values are preserved; the requested nighttime interpretation remains unresolved.
- smoking_pack_years remains the existing synthetic cumulative exposure. It is not recomputed from current intensity,
  which would confuse current consumption with lifetime average intensity/duration. Its earlier limitations remain.
- Six inherited synthetic recipes remain unresolved; no new outcome leakage is introduced, but their historical leakage status cannot be certified.

## Validation and modeling restrictions

Saved-CSV verification checks exact schema/order, unique linkage, all22 retained predictors, observed raw values,
sidecar derivations, passive-duration bounds, deterministic seed reproduction, missingness, outcomes and folds.
Outcome counts unchanged:369 recorded-CVD proxy events,218 all-cause deaths before recorded CVD (cause unknown),3604 censored.
Folds unchanged:839/838/838/838/838. There are no missing survival outcomes.
Observed missingness is preserved: BP medication52, heart rate1, current smoking intensity29.
The exact MI/stroke/HF/CV-death endpoint and confirmed non-CVD deaths remain unavailable.

No models trained or performance metrics recalculated. Future training must use metadata.json's explicit27-feature list,
exclude the six metadata/outcome fields and encode smoking_status as a nominal factor with levels Never/Former/Current.
The legacy imputer expects cigarettes_per_day/current_smoker, which this matrix intentionally replaces. Adapt it before
training: learn the intensity median among Current smokers inside each training partition; retain structural zero otherwise.
BP medication mode and heart-rate median also remain training-fold-only. Never impute unknown survival outcomes.
Previous models/metrics cannot be applied to the changed feature contract without new experimental evaluation.

See data_dictionary.csv, metadata.json, predictor_summary.csv and validation.json for the complete schema and audit.
Generation and repeat verification: analysis/scripts/reconstruction_26/engineer_27.py (use --verify for existing output).
