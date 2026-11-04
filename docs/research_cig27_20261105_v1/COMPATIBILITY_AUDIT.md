# Research CIG 27-predictor compatibility audit — 2026-11-05 v1

The Research CIG now targets the saved `rsf27-questionnaire-aligned-proxy-20261103-v3` forest rather than the seven-predictor model. **Current questionnaire assessments remain blocked** because exact transformation compatibility has not been established. A matching feature name or range is insufficient. The main illustrative calculation is unchanged.

## Frozen model and inference

- Model: `analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3/model_RESEARCH_ONLY.rds`, 200 trees.
- SHA-256: `f1c95bc1f4e43890475f8b38cb092995e79c29ccb0deb439f160962606091d34`.
- The source dataset is `data/processed/questionnaire_27_questionnaire_aligned_20261103_v1/pintig_framingham_27predictors_QUESTIONNAIRE_ALIGNED_PROXY_EXPERIMENTAL.csv` (4,191 participants).
- Endpoint: recorded-CVD proxy, with death before recorded CVD of unverified cause as the competing event. This is not an adjudicated MI/stroke/HF/CV-death composite.
- The R adapter reads the saved model, performs no fitting, and returns its complete native prediction time grid. The curve is a right-continuous step function. Its final event time is 3,646 days; the last value is held to the administrative horizon of 3,652.5 days. This is step-function evaluation, not linear interpolation or an invented curve.
- Annual display values and the ten-year percentage use that same curve. Threshold references at 5%, 10%, and 20% use the first actual step crossing; no clinical category is assigned from this research graph.
- Model version, hash, transformation version, exact feature set, finite values, curve ordering, bounds, monotonicity and endpoint equality are checked. Unknown, unanswered and incompatible responses do not become zero.

## Questionnaire-to-model audit

This table is a contract audit, not a claim that synthetic training distributions represent observed patient measurements. Sources examined: `src/services/assessment27.ts`, `featureProtocolV1.ts`, `sesProtocol.ts`, `analysis/scripts/rsf27_questionnaire_aligned_v1/build_dataset.py` and `train.R`, and the saved model bundle.

| Predictor | Questionnaire value / model definition | Compatibility finding |
|---|---|---|
| age_years | Recorded profile age, years | Snapshot must match assessment age; 35–70 eligibility retained |
| sex_male | Recorded sex encoded 0/1 | Nominal coding matches |
| ses_index_0_100 | Questionnaire retains education and income intervals; model uses one-hot education, log household-adjusted representative income, PCA and training ECDF | **Blocked**; no approved questionnaire reference transformation |
| urban_rural_residence | Recorded classification and source, rural 0 / urban 1 | Missing classification/provenance blocks input |
| waist_cm | Waist measurements, cm | Same nominal quantity; training values synthetic |
| hip_circumference_cm | Hip measurements, cm | Same nominal quantity; training values synthetic |
| sbp_mmhg | Mean recorded systolic readings, mmHg | Same nominal quantity; missing/invalid readings blocked |
| dbp_mmhg | Mean recorded diastolic readings, mmHg | Same nominal quantity; missing/invalid readings blocked |
| heart_rate_bpm | Mean measured heart rate, bpm | Same nominal quantity; no inference-time missing substitution |
| hypertension_history | Diagnosis response 0/1 | Coding matches; questionnaire history not independent adjudication |
| bp_medication | Current-use response 0/1 | Historical/unknown response must not become current use |
| diabetes | Diabetes status 0/1 | Same nominal status; eligibility rules retained |
| diabetes_medication | Current glucose-lowering medication 0/1 | Nominal coding matches; training values synthetic |
| lipid_lowering_medication | Current medication 0/1 | Nominal coding matches; training values synthetic |
| family_history_cvd | Family CHD/stroke answers aggregated to 0/1 | Training synthetic binary lacks equivalent observed family detail |
| alcohol_ethanol_g_week | Frequency × drinks × reference mL × assumed ABV × ethanol density, summed by beverage | Experimental reference assumptions; never/former current consumption zero; not measured ethanol |
| heavy_episodic_alcohol | Monthly >5-drink episode response 0/1 | Nominal definition; unknown remains unavailable |
| smoking_status | Ever regular smoking and current smoking → Never/Former/Current | Nominal categories match; Never means never regularly smoked |
| smoking_pack_years | Average cigarettes/20 × smoking years with gaps | **Blocked**; generator caps at 100 and calculates before sidecar rounding, questionnaire differs |
| current_smoking_intensity_cigs_day | Current cigarettes/day; zero for noncurrent smokers | Nominal definition matches; missing current response unavailable |
| passive_smoking_childhood | Childhood household exposure 0/1 | Nominal definition matches; synthetic training response |
| passive_smoking_adult_years | Questionnaire domain durations yield a lower bound for overlapping periods | **Blocked**; synthetic single duration is not the same exposure construct and age bounds differ |
| activity_min_week | IPAQ domain minutes, with eligibility/cleaning rules | Training simulates only work walking; matching units do not establish distributional equivalence |
| sitting_minutes_day | Weighted weekday/weekend sitting minutes | Nominal calculation matches; training responses synthetic |
| diet_score_0_100 | PINTIG Food6 adaptation from food frequencies | **Blocked**; questionnaire grain portions weighted by 2, generator grain frequencies unweighted |
| psychosocial_stress | Work/home responses → binary | Training synthetic binary lacks full observed source responses |
| sleep_duration_hours | Typical-day sleep hours | Same nominal quantity, not specifically night-only sleep; training synthetic |

The saved SES artifact uses income representatives PHP 0, 83,238, 249,714, 499,428, 998,856 and 1,997,712 divided by the square root of supported people, followed by log1p. Education is one-hot encoded, not treated as equally spaced. The frozen PCA center, scale, rotation and training score ECDF are reused for a model-contract test fixture only. These are simulation assumptions, not verified incomes or a validated Philippine SES standard.

## Implementation and preservation

- `researchCig27.ts` audits the questionnaire snapshot and displays explicit blockers before any request. New illustrative results retain an immutable copy of their questionnaire answers. Older historical records without a snapshot remain unchanged and cannot be reinterpreted as new-model inputs.
- `research27Contract.mjs` defines the separate research inference payload. `scripts/research-cig27/predict.R` reads the saved forest. No automatic imputation, conversion of current questionnaire scores, or replacement with experimental dataset values is permitted.
- `ResearchCigPanel.tsx` retains the graph presentation and research notice, adds all three threshold references, and uses native CIF points. The old seven-predictor service and historical artifacts are preserved.
- Local development only: start `npm run start:research-cig27` and `npm run dev`. Vite forwards `/research-cig-27` to loopback port 8767. The static production server has no model API. The new service does not enable blocked questionnaire inference.
- No changes to datasets, outcomes, main `simulate()` formula, clinical category thresholds, trained forests or historical assessment storage were made.

## Verification

- `npm run check`: 102 tests passed; `npm run build`: passed.
- `npx playwright test tests/browser/researchCig27.spec.ts tests/browser/illustrativeQuestionnaire.spec.ts`: six passed at desktop, tablet and mobile sizes. Verified normal illustrative results and blocked CIG without a model request.
- `npx tsx scripts/research-cig27/verify.mts v2`: actual saved-model inference passed, 152 native/boundary CIF points and ten annual values. Artifact hash unchanged. The separate fixture is fictional and already expressed in the model contract; it does not prove questionnaire compatibility.
- Tests cover all missing predictor fields, incompatible model/transform metadata, finite/bounded monotone CIF, horizon equality, and exact step threshold crossings. Full historical browser suites were not rerun.
- The first verification attempt (`v1`) failed an overly strict event-grid horizon assertion. It was preserved; the corrected check uses recorded follow-up support and right-continuous endpoint evaluation. No model was changed.

## Required next decision

Resolve and approve the SES, diet and exposure transformations against observed source responses, then validate the whole questionnaire-to-model pipeline. Do not remove the compatibility gate merely to display a curve. Any new training or dataset reconstruction requires a separate versioned study; neither was performed for CIG integration.

Benchmark performance and uncertainty are documented separately in `analysis/reports/benchmark27_20261105_v1/REPORT.md` and the full local results directory of the same version.
