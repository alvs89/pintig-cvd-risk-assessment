# Verified reconstruction delivery

The local dataset is `data/processed/questionnaire_26_20261101_v1/pintig_framingham_26predictors_provisional.csv`.
It has 4,191 rows and 32 columns: the established 26 predictors plus six metadata/outcome columns.
The first 22 predictor values are unchanged. There are nine observed predictors, one derived from observed sex,
16 simulated predictors, and no globally imputed predictors.

**Not ready for exact-endpoint model training.** The four requested survival-outcome columns are entirely NA:
HF onset and adjudicated death causes are unavailable. NA does not mean no event. All original observed records
remain preserved, and the existing proxy is retained separately with explicitly prefixed names.

## Verified questionnaire references

| Addition | Primary source | Verified reference | Adaptation |
|---|---|---|---|
| hip_circumference_cm | pone.0271169.s001.pdf | PDF35 / printed17, Q41(e); refusal instructions PDF34 | Mean of two cm measurements; proposed PINTIG rule, manual unavailable |
| diabetes_medication | Gen-3-Exam-1.pdf | PDF23, MD02, unnumbered diabetes medication item | Current-use response1 maps1; never/past map0; unknown missing |
| psychosocial_stress | pone.0271169.s001.pdf | PDF25 / printed12, Q35(a,b) | Proposed binary Several/Permanent at either applicable location; not a validated scale |
| sleep_duration_hours | Gen-3-Exam-1.pdf | PDF10, TECH05, unnumbered Sleep row | Direct typical-day hours, with 24-hour activity accounting |

The supplied PURE form is South African. The available Gen3 filename lacks `(1)`; its hash is recorded,
but identity with the unavailable alternative filename is not asserted. Exact wording, response options,
skip rules, units, transformations and compatibility limitations are in the mapping CSV.

## Verification

- Nine generated datasets and nine response sidecars independently re-read and validated.
- One unique baseline record per participant; original outer folds: 839/838/838/838/838.
- All 39 raw baseline fields match their source; all observed predictor values and missingness match.
- Missing predictor entries retained: BP medication52, cigarettes/day29, heart rate1.
- Existing proxy: censored3604, recorded CVD369, death before recorded CVD218 (cause unknown).
- Proxy follow-up: minimum26, mean3413.4023, median3652.5, maximum3652.5 days.
- All 1,189 protected pre-existing files retained SHA-256 hashes.
- Seven questionnaire unit tests passed; 66 application tests passed; production build passed.
- No deployed model, frontend questionnaire or clinical threshold changed.

## Sensitivity actually performed

Three simulation seeds and three assumption sets were evaluated descriptively. Across nine datasets,
mean hip circumference ranged98.5784–101.6084cm, medication prevalence0.8828–1.6941%,
binary stress prevalence50.9902–68.2892%, and mean sleep6.4001–7.0574hours.
These changes show that the generated distributions depend on assumptions.
No models were fitted on this reconstruction; no model-performance table or superiority conclusion is available.
Previous v4 performance cannot be transferred to these revised questionnaire definitions.

## Additional unresolved provenance restrictions

The six original synthetic augmentations (waist, alcohol, activity, diet, SES, family history) are inherited from
the frozen v3 source. Their complete original simulation recipes are not recoverable from the inspected
repository; this is also recorded in `docs/MODEL_CIF_GATEWAY.md`. Their values are preserved rather than
recreated. Consequently the pipeline is reproducible **from raw data plus the frozen augmentation inputs**,
not from framingham.csv alone. Their original generation cannot be independently certified leakage-free.
The six v4 additions retained in n22 have the explicit baseline-only generator in
`analysis/scripts/v3/generate_v4_simulation.py`. The four reconstructed additions accept only six allowlisted
baseline fields and reject outcomes, times, identifiers and fold columns. They introduce no new outcome conditioning.

The initial outer-fold seed is also not established. Exact saved assignments and their hashes are reused.
Authentic forms do not repair missing measurements, missing event histories or unverified legacy recipes.
The intended IHD title and broader major-CVD endpoint still require a separate protocol decision.

Next steps: recover original augmentation recipes, obtain adjudicated HF/death linkage and the measurement
manual, approve the proposed adaptations and endpoint, obtain the intended Philippine instrument and genuine
responses, then perform nested training and external validation. No expanded configuration is recommended as superior.

See `FILES_CREATED.csv` for exact delivered files, `COMMANDS.md` for execution commands, and
`final_readback_audit.json` for verification results.
