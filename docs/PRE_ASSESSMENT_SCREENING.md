# Pre-assessment eligibility and safety screening

## Clinical reference and limitations

The thirteen warning signs use the supplied transcription of the DOH PhilPEN
Risk Assessment Form (Revised 2022). The official reference is the DOH eFOI
[NCD Cases and Phil PEN Risk Assessment Form](https://www.foi.gov.ph/agencies/doh/ncd-cases-and-phil-pen-risk-assessment-form/).
Its December 13, 2025 response identifies the 2022 form and a 2025 revision intended
for rollout the following year. Both attachment endpoints returned HTTP 503 during
this implementation. Indexed material identifies the revised 2022 red-flag section,
but the complete newer form was not independently retrieved. No approved newer
form was present in the project. This implementation does not claim compliance
with the latest PhilPEN workflow. Obtain the approved current form and clinical
expert review before clinical use or claiming protocol compliance.

The controlled warning list covers chest pain, difficulty breathing, loss of
consciousness, speech difficulty, facial asymmetry, unilateral weakness/numbness,
disorientation, chest retractions, seizure/convulsion, an act of self-harm/suicide
attempt, agitated/aggressive behavior, eye injury/foreign body, and severe injuries.
The interface asks about current or recent findings without inventing a fixed
look-back interval or dismissing recently resolved symptoms. Wording, recognition
of these signs, and local response procedures require qualified clinical review.
This is a pause-and-evaluate safeguard, not a complete triage or diagnostic tool.

The aggregate cardiovascular-history confirmation includes myocardial infarction,
stroke, heart failure and other diagnosed coronary heart disease, including angina.
The frozen Framingham training script excludes `PREVCHD == 1`; this scope is retained.
Cardiovascular death is a prediction outcome, not a prior diagnosis question for a
living patient. The Framingham and intended PURE outcomes remain distinct.

## Workflow and decisions

Patient selection and demographic review precede a read-only, always-visible
13-item safety checklist. Only two mandatory, initially unanswered selections follow:
`warningSigns` and `cardiovascularHistory`. Each records No, Yes or Unknown (displayed
as Unable to confirm). They are aggregate healthcare-worker attestations: individual
symptom or diagnosis answers are never manufactured from them. The separate former
verification question is replaced by a verification instruction before Continue.

Priority is: warning signs identified; qualifying cardiovascular history; invalid age
or age outside 35?70 inclusive; uncertainty; incomplete/invalid responses. Both
confirmations must explicitly be No. A warning immediately presents the evaluation
message; prior disease alone is not described as an emergency. Predictor fields stay
hidden and disabled until the explicit Continue action. Blocked assessments produce
no new result, category, graph, explanation or guidance.

Confirmation is bound to the rule version, patient identity/profile, current age and
exact responses. Editing either answer revokes it. Patient changes, clearing,
sign-out and refresh remove confirmation; changing a patient with an unsaved draft
still uses the existing confirmation dialog. Draft measurements survive temporary
blocking. Practice prefill never supplies or replaces screening responses.

The shortened workflow requires clinical review; it has not received clinical
approval and is not a certified triage tool. Negative attestations do not establish
clinical safety or rule out illness.

## Enforcement and privacy

`src/services/preAssessmentRules.mjs` is the single executable screening policy.
`preAssessment.ts` binds continuation to the selected profile. Submission and
saving independently check that binding, rather than trusting disabled buttons.
`simulate()` and all model coefficients and classification thresholds are unchanged.

The existing private `questionnaire_model/research_server.cjs` also imports this
policy before calling R. The request now requires:

```text
{ fictionalOnly: true, predictors: <unchanged seven numeric predictors>,
  screening: { version: "PINTIG-AGGREGATE-PHILPEN2022-2",
    ageYears: <DOB-derived assessment age matching predictors.age_years>,
    answers: { warningSigns: "No", cardiovascularHistory: "No" } } }
```

Missing, legacy/wrong-version, positive, uncertain, extra-key, age-mismatched, incomplete or age-ineligible screening
is rejected with HTTP 422 before inference; no probability/CIF is returned. The
screening object is not passed to R or added to predictors. No RDS, training file,
research dataset, event definition or CIF calculation was changed.

The private server resolves the shared module relative to its existing sibling
`PINTIG System` checkout. Restart that service after updating the shared policy.
An unavailable policy fails closed. Loopback binding, origin checks, fictional-only
request flag, existing predictor validation and production-build restrictions remain.

There is no FastAPI application, database or production authentication in this
frontend. The Node service is a local research harness. API validation checks the
submitted screening attestation; it cannot establish whether a human's answers
are truthful, and Origin checks are not user authentication. Production clinical
use still requires an authorized backend, authenticated access and clinical approval.

Detailed screening answers stay only in the current session and transient API request.
They are not logged, persisted, copied into old assessments or sent to R. No blocked
attempt is saved as a completed assessment. Historical screening is never inferred
from legacy records. The existing canonical prior/verified fields in newly saved questionnaires remain
compatibility indicators derived from the aggregate history confirmation and explicit
verified continuation. They are not reconstructed individual symptom/event answers.
New manually completed assessments retain the screening rule version as metadata.
Initial and historical records are not retroactively assigned a screening version.

## Verification

Shared-policy tests cover both aggregate confirmations, positive/uncertain/missing
answers, exact contract keys/version, matching age, clinical-message priority and
35/70 boundaries. Browser tests exercise all 13 read-only items, exactly two controls,
required markers, blocking without inference, correction, patient changes, refresh,
keyboard focus, responsive widths and existing assessment/history/report workflows.
Opt-in private-service tests reject direct HTTP bypass attempts before inference and
exercise genuine frozen-model predictions for both roles.

Required-marker audit: patient selection, current smoking, current BP medication,
manual BMI, SBP/DBP, input mode and applicable extended alcohol/activity inputs retain
required indicators. Calculated BMI, weekly totals and profile demographics have no
asterisk. Height/weight, waist and the other existing optional questionnaire inputs
remain optional. Validation limits and submission rules have not been relaxed.

Run `npm run check`, `npm run build`, `npm run test:e2e`, and
`npm run verify:production`. With the private service running, set
`PINTIG_LIVE_RSF=1` for the live tests. No lint script is configured. Restart the
private service after shared-contract changes. The model, research mathematics,
original fixtures/history, permissions and clinical limitations are unchanged.
