# PINTIG 21 predictors â€” Framingham-based provisional data audit

- Raw Framingham exam records: 11,627; unique participants: 4,434
- Eligible baseline participants linked to prior frozen cohort: 4,191
- Exactly 27 columns (21 predictors + 6 participant/outcome/fold fields).
- Outcomes copied unchanged from frozen v3: major-CVD-proxy=369, **death-before-proxy=218, cause unverified**, censored=3604.
- 10-year followup: min 26.0, median 3652.5, mean 3413.4, max 3652.5 days.
- Five added fields are the previously established 21-feature configuration: smoking_pack_years, urban_rural_residence, sitting_minutes_day, heavy_episodic_alcohol, former_smoker.
- Six legacy variables remain synthetic: waist_cm, alcohol_drinks_week, activity_min_week, diet_score_0_100, ses_index_0_100, family_history_cvd.
- No missing predictor data were filled in the exported file. Fold-specific imputation occurs during model fitting, not before exporting this dataset.

## CRITICAL ENDPOINT LIMITATION
The name in the request says *Ischemic Heart Disease* (IHD), while the requested outcomes are a **major CVD composite** spanning MI, stroke, HF, and CVD death. Those are not the same endpoint. The supplied 39-column teaching Framingham file contains no adjudicated heart-failure onset event/time or verified cause-specific cardiovascular death classification. It **cannot establish** the exact requested four-component endpoint; nor can it determine which deaths were non-CVD. Existing event_type=1 and event_type=2 are copied verbatim from the earlier v3 **provisional proxy** and must not be relabeled as verified endpoint or verified non-CVD deaths. The event_competing_death_10y column name is preserved for compatibility, not clinical certification. Validated CHF, cause-of-death and sequence-of-events linked files would be needed.

## Quality gates
- Baseline PERIOD=1 matched; AGE 35â€“70, PREVCHD=0, PREVSTRK=0.
- Rows unique and each assigned exactly one existing outer fold.
- Type and binary outcome indicators mutually consistent, times in [0, 3652.5].
- All nine comparable numeric observed variables checked against original raw Framingham without mismatches; sex encoding verified.
- Training-fold-only imputation required; do not use a preimputed complete dataset for fitting unless the imputer was trained within that fold.
- Primary endpoint definitions and instrument coding require actual PURE PH codebook in Thesis 2.

See quality_assurance.json and data_dictionary.csv. Simulation algorithm: analysis/scripts/v3/generate_v4_simulation.py.
