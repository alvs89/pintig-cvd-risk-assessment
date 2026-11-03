# Source-grounded assessment intake

The New Risk Assessment route collects questionnaire responses under
`PINTIG-INTAKE-27-20261103`. It replaces the live illustrative-calculation form;
historical results, risk thresholds and the separate research model remain unchanged.
The archived assessment component is retained for regression reference.

## Reference review and adaptations

See `source_review.json` for all 13 filenames, checksums, lengths and review findings,
`MAPPING.md` for the 27 predictor decisions, `feature_dictionary.csv` for their export,
and `questionnaire_dictionary.json` for every implemented response field, source,
unit, response options and executable applicability expression. The assessment
derives v1.0 features as responses are entered and records per-feature provenance;
raw responses remain the source of truth.
Regenerate the dictionaries with
`node --import tsx scripts/export-assessment27-dictionary.mjs`.
Regenerate dataset/source read-only audit summaries with
`python scripts/audit-feature-protocol.py`, then regenerate the mapping and data
dictionary with `python scripts/build-feature-protocol-assets.py`.

There are 11 distinct documents: PURE.pdf and Physical Activity.pdf duplicate the
South African PURE form and IPAQ scoring protocol respectively. No Philippine
PURE edition was verified. Sources were inspected locally, including visual review
of scanned PURE pages and the Framingham passive-smoking grid.

Grid headings are expanded into individual field labels; source checkbox selections
are represented by selectors. These are presentation adaptations. Numeric bounds
are application plausibility checks, not original questionnaire categories. Raw
unknown codes, blanks, refusal values and applicability are retained separately.
The supplied PURE measurement form refers to an unavailable manual; detailed
positioning and preparation cannot be certified from the form alone.

Alcohol uses the source's fixed reference servings with assumed ABV and ethanol
density. It does not measure beverage-specific ABV. Measurement averaging, family
history aggregation, stress dichotomization and weekly frequency conversions are
explicit PINTIG transformations, not validated source scores. Source sleep is per
typical day, not specifically per night. IPAQ specifies ages 15–69; age 70 is flagged.

Protocol v1.0 adds an explicit education index, residence class from recorded PSA
barangay provenance, IPAQ weekly minutes and a six-component PINTIG Food6 score.
These are reproducible adaptations, not validated Philippine scores. The FFQ
subset is insufficient for full AHEI-2010/DASH/MDS. Adult passive-smoking domains
lack interval dates; the maximum domain duration is stored only as a lower bound,
with uncertainty bounds retained. Missing source data remain null, and a complete
validated 27-feature model input is not claimed.

## Storage and authorization boundary

`createIntake27` requires an active Administrator or Healthcare Worker and a current
eligible patient screening. It rejects invalid entered values; incomplete intake
can be saved explicitly without a risk result. A saved snapshot contains:

- schema, record ID, patient ID, user ID and timestamp;
- baseline age/sex and eligibility decision;
- all raw questionnaire fields, including retained answers to subsequently skipped items;
- applicability and field source references;
- 27 derived feature keys, nulls, validation/incompleteness and limitations;
- model status `blocked`, with no probability or risk band.

Records live in a separate session array and appear in Assessment History. Existing
administrator backup JSON includes `questionnaireRecords`. Refreshing clears this
in-memory storage. The existing role controls are frontend controls, not secure
server authorization. There is no patient backend or database to migrate in this
checkout. A future API must authenticate users, authorize patient access, validate
the schema and derivation server-side, and preserve these raw and derived snapshots
transactionally. No persistence or backend security is claimed here.

New-schema calls are rejected by both the illustrative calculator and the existing
research gateway. The live Calculate risk button is disabled. Enabling inference
requires a separately approved compatible model release, preprocessing contract,
endpoint definition, validation and resolution of the unsupported feature mappings.
No synthetic dataset values are used to prefill clinical intake.

## Verification

Unit tests cover 27-feature shape, the 13-source inventory, original unknown codes,
conditional logic, preserved raw answers, smoking chronology, ethanol conversion,
passive-exposure bounds, sitting calculations, authorization, eligibility and model
rejection. Playwright verifies the current intake at desktop, tablet and mobile
widths, including saving and viewing retained inactive responses without inference.
The previous browser tests that assume live illustrative prediction describe the
superseded workflow; the entire historical browser suite is not claimed to pass.

No training, dataset regeneration, clinical threshold change or model replacement
is part of this change.
