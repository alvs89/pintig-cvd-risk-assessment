# V5: 28-candidate PINTIG alcohol questionnaire proposal

**State:** Staging/data-dictionary only. This dataset is NOT for model training.
The original 26 candidate fields and six ancillary fields are unchanged. Two added fields are **completely missing**, because neither is available in the supplied Framingham 39-column teaching dataset. No patient values are simulated, imputed, or invented.

| Candidate | Name | Definition | Proposed encoding | Unit | Provenance |
|---|---|---|---|---|---|
| Alcoholic beverage type | alcohol_beverage_type | Beverage usually consumed in a stated recall period. If multiple are used, a single 'type' loses information, so use multi-select in questionnaire and normalize each drink separately. | beer; red_wine; white_wine; spirits; other; mixed; none; unknown (proposed, not validated PURE coding) | categorical | Unavailable: NA |
| Serving size | alcohol_serving_size_ml | Typical volume *per serving*, beverage-specific. Mixed beverage types do not have a uniquely interpretable single serving size. | Positive numerical mL only when clearly linked to a specific beverage; otherwise missing | mL per serving | Unavailable: NA |

## Verified source evidence
- Attached Framingham Gen3 Exam1 Screen 9 asks beer (12 oz), red/white wine (4 oz), spirits (printed 1+ fraction oz jigger), other, and frequencies week/month. Those variables do NOT appear in supplied raw framingham.csv.
- WHO International Guide for Monitoring Alcohol Consumption and Harm contains beverage-specific quantity-frequency and usual container-size questions.
- US CDC defines 14 g ethanol per US standard drink, which differs from WHO STEPS convention examples of ~10 g. Do not conflate volume with pure alcohol content.
- The attached PURE.pdf is an image-based scan and its local extraction did not permit independent verification of actual PURE Philippines questionnaire items; do not claim PURE PH records these fields.

## Implementation recommendation
Collect beverage-specific type, serving volume (mL), ABV where known, number of servings and frequency/recall period. Calculate ethanol grams and standard drinks consistently, rather than treat a type label and an unlinked volume as intrinsically meaningful independent predictors. The existing simulated alcohol_drinks_week is not derived from these missing fields. Preserve it unchanged until real observed questionnaire responses exist.

## Files and model changes
This staging output has 4,191 participants, 34 columns: 28 candidate predictors plus six other fields. Its two additional candidate columns are missing in all 4,191 participants. Do NOT train RSF on either new column or claim 28-predictor performance before observations exist. No changes to the prior 26-predictor simulation, frozen cohorts, model outputs or production system.
