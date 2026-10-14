# Cumulative incidence and probability reference markers

## Current model availability

The repository has no FastAPI endpoint, R prediction script, trained competing-risk
RSF artifact, verified event-code mapping or `cif`/`time.interest` output. The
existing illustrative ten-year calculation is unchanged and generates no curve.
Live and historical results therefore show a neutral unavailable state.

The graph and marker operate only on supplied, compatible model output. All example
curves are isolated in tests; none are added to application records or the predictor.

## Optional frontend integration contract

`Prediction` and `AssessmentRecord` accept optional `predictionContext` and `cif`
fields, defined in `src/types/cif.ts`. Existing records remain compatible.

- `predictionContext`: source `competing-risk-rsf`, patient ID, model version and
  verified endpoint metadata (ID, label, definition, first-major-CVD kind, event
  code and distinct non-CVD competing-event code).
- `cif`: matching patient, model, endpoint and event code; fraction probabilities;
  sorted `times` and equally sized `probabilities`; explicit time unit and maximum
  adequately supported follow-up. Day-based models must supply `daysPerYear` from
  their actual duration convention; the frontend does not guess it.
- The existing full-precision `risk` remains the ten-year source of truth. No second
  risk field or new prediction algorithm is introduced.

The future model/API adapter must inspect the actual fitted endpoint, event coding,
participant dimension, event dimension and time-grid ordering of its R prediction
object before selecting `cif` values and `time.interest`. The frontend accepts a
single selected participant/event vector, not raw multidimensional R arrays. No R
dimension ordering or equivalence between Framingham and PURE endpoints is assumed.
Endpoint mapping must be verified against the approved research specification;
matching metadata alone is not evidence of model training or clinical validation.

## Validation and evaluation

`src/services/cif.ts` rejects missing/mismatched identities, incomplete outcome
metadata, illustrative-model provenance, unsupported units, nonfinite/out-of-range
probabilities, unequal arrays, duplicate/unsorted times and decreasing probabilities.
Decreasing values are rejected rather than silently smoothed. A complete supported
ten-year horizon and grid coverage are required; inadequate follow-up is unavailable.

Months convert using 12 months/year. Days use the explicitly supplied duration
convention. No probabilities are interpolated, divided across years or extrapolated.
Each supported annual horizon uses the last supplied estimate at or before it.
Unsupported starting years are omitted. The step chart retains irregular model
times and terminates at ten years using that right-continuous evaluation.

The evaluated ten-year probability must match `risk` within `1e-12` and must have
the same unrounded risk band even within that tolerance. Reference comparisons
use strict full-precision `>=` at supported integer years 1–10. The earliest meeting
year is an annual reference horizon, not a predicted event date or a new risk band.

## Presentation and records

`CumulativeIncidencePanel` appears after the primary risk/factor panels in live
results and after risk/metadata panels in saved records. It provides 5%, 10%, 20%
reference selection, supported-year inspection, a step curve, an accessible data
table, textual interpretation and neutral unavailable/loading states. Unreached
references draw no line or marker and do not expand the vertical axis.

New snapshots copy verified compatible curves and endpoint metadata without recalculation.
Invalid curves are withheld without preventing assessment saving.
Historical display also checks the stored model version. Records without curves
remain unavailable; they are never recalculated with a different model. Existing
guidance, eligibility and risk classification are unchanged.

No backend, database, R model or new questionnaire is implemented by this feature.
Production functionality with patient-specific curves remains dependent on the
verified model/API adapter and actual trained model output described above.
