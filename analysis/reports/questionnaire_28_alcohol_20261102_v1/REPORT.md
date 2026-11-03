# PINTIG 28-predictor alcohol expansion

New dataset: data/processed/questionnaire_28_alcohol_20261102_v1/pintig_framingham_28predictors_PROXY_EXPERIMENTAL.csv.
4,191 unique participants, 28 predictors +6 metadata/outcome columns =34 columns.
All original 32 field values are preserved exactly, including missing values and recorded numeric precision.
No original data, exact-endpoint dataset, experiment, frontend questionnaire or deployed model is changed.

## Questionnaire traceability and adaptation
Primary source: South African PURE Adult Questionnaire, pone.0271169.s001.pdf, physical PDF page19,
printed page9, Q28(c): "What forms of alcohol have you regularly used? (check all that apply)".
Listed beverage categories and approximate size of one drink: Spirits (rum, whisky, gin, vodka etc)30ml;
Wine125ml; Beer375ml; Country liquor/arrack/sugar cane spirit30ml.
Q28(a) distinguishes former/current/never use; never use skips to29. We cannot infer lifetime status from weekly intake.
Q28(d) asks: "At least once a month, do you consume >5 alcoholic drinks/day?" with No=>29, Yes=>episode frequency/quantity.
The inherited heavy_episodic_alcohol is an arbitrary synthetic proxy, not a verified response to Q28(d).

Gen-3-Exam-1.pdf PDF30 MD09 and Annotated-Form-Original-Cohort-Exam-32.pdf PDF6 MD06
also collect beverage-specific weekly/monthly use but use different ounce-based servings.
These were inspected; their serving conventions are not silently combined with PURE sizes.
The original 39-column framingham.csv has no alcohol beverage/serving fields; neither new feature is observed or imputed.

PINTIG adaptation: simulate one predominant current beverage, not the source's multiple selections.
Among positive weekly intake, categorical probabilities beer55%, wine20%, spirits20%, country_liquor5%.
These are explicit engineering assumptions, not estimated Framingham, South African or Philippine prevalence.
Each participant's usual single serving uses the source's approximate reference size deterministically.
This intentionally omits person-to-person pour variation; it is not a recovered measurement.
No unsupported Philippine beverage categories or ethanol-concentration assumptions are introduced.

## Logical consistency and reproducibility
Seed20261102, NumPy default_rng; ascending participant_id ordering, no ID effect beyond reproducible draw order.
Only alcohol_drinks_week and heavy_episodic_alcohol enter the generator. No outcomes, times, validation folds,
training data statistics or other participants' measurements inform the assigned values.
Zero weekly drinks => none and0mL; positive weekly drinks => a listed beverage with positive matching size.
All1,545 zero-intake records already have heavy_episodic_alcohol=0; conflicting inputs are rejected rather than repaired.
Heavy-episodic participants may consume any beverage. Heavy use does not imply a larger single serving:
episode drink count and frequency are distinct quantities and cannot be reconstructed from these fields.
No heavy-dependent beverage preference is invented. Original weekly amount and heavy indicator remain unchanged.
Missing, nonfinite, negative or invalid alcohol inputs are rejected, never silently recoded as non-drinkers.
Unknown drinking status must remain missing in future data; zero currently means no consumption under the inherited simulation convention.

## Validation and future modeling
Exact source-field preservation, nine observed raw columns/sex encoding, missingness, participant linkage,
raw proxy event reconstruction, event indicators and frozen folds are checked in --verify.
Event counts remain369 recorded-CVD,218 death before recorded CVD (cause unverified),3604 censored.
Five folds remain839/838/838/838/838. Original exact-endpoint file is unchanged with its outcomes unavailable.
See validation.json and alcohol_summary.csv for actual results; metadata.json lists all28 predictors explicitly.

The beverage field is nominal. A future R pipeline must declare factor levels
none,beer,wine,spirits,country_liquor; do not treat these as an ordered numeric scale.
Use the explicit28-feature list, not legacy first26-column selection. Exclude all six metadata/outcome fields.
Keep existing preprocessing inside training folds. No global imputation, new model fitting or performance evaluation was performed.
Serving size is a deterministic function of beverage type in this version, so it supplies no independent information;
both new variables encode assumptions, and importance estimates could be redundant or simulator-dependent.
The legacy weekly-drinks unit has no verified harmonization with these PURE reference servings.
Do not multiply them to claim measured beverage volume or ethanol exposure, or recalculate the existing alcohol features.
Eighteen of28 predictors are now synthetic. Six inherited synthetic recipes remain unresolved;
no new outcome leakage is introduced, but their original leakage status cannot be independently certified.
These outcomes remain provisional recorded-CVD/all-cause-death proxies, not the exact MI/stroke/HF/CV-death or confirmed non-CVD-death endpoints.

## Reproduction
Run python analysis/scripts/reconstruction_26/expand_alcohol_28.py for initial creation (refuses existing outputs).
Run python analysis/scripts/reconstruction_26/expand_alcohol_28.py --verify for repeatable read-only validation.
Run python -m unittest discover -s analysis/scripts/reconstruction_26 -p test_alcohol_28.py -v for semantic tests.
No superiority or clinical-validity conclusion follows from this expansion.
