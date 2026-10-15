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

Prior myocardial infarction, stroke and heart failure are separate history items.
The frozen Framingham training script also excludes `PREVCHD == 1`; therefore a
fourth history question covers other coronary heart disease, including angina.
This conservative gate preserves that research-model exclusion. It does not claim
that the Framingham endpoint equals the intended PURE Philippines composite.

## Workflow and decisions

Patient selection and demographic review precede the screening. No safety or
history answer is preselected, including when practice questionnaire inputs are
prefilled. The medical-history group follows completion of negative warning-sign
answers. Existing predictor fields remain hidden and disabled until the worker
explicitly chooses **Continue to Risk Assessment**.

Priority is: an acute warning reported Yes; a previous qualifying condition
reported Yes; age outside 35–70 or invalid; uncertain/unverified/incomplete answers.
Every warning and history answer must be No, and information verification must be
Yes. Unknown, blank and invalid answers never count as No. A positive warning
immediately shows the clinical-evaluation message without requiring other answers.
Prior disease alone is not presented as an emergency. Neither state produces a
probability, category, referral order or medication instruction.

Confirmation is associated with the patient identity/profile and exact answers.
Changing an answer revokes confirmation. Changing patients or clearing/signing
out removes it; refreshing clears session state. Correction requires a new
explicit Continue action. Predictor drafts survive temporary blocking. Prefill
cannot overwrite positive or uncertain screening responses.

## Enforcement and privacy

`src/services/preAssessmentRules.mjs` is the single executable screening policy.
`preAssessment.ts` binds continuation to the selected profile. Submission and
saving independently check that binding, rather than trusting disabled buttons.
`simulate()` and all model coefficients and classification thresholds are unchanged.

The existing private `questionnaire_model/research_server.cjs` also imports this
policy before calling R. The request now requires:

```text
{ fictionalOnly: true, predictors: <unchanged seven numeric predictors>,
  screening: { version: <configured version>, answers: <all required responses> } }
```

Missing, wrong-version, positive, uncertain, incomplete or age-ineligible screening
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
from legacy records. The existing canonical prior/verified answers in newly saved
questionnaires follow the completed screening; detailed symptom answers are omitted.
New manually completed assessments retain the screening rule version as metadata.
Initial and historical records are not retroactively assigned a screening version.

## Verification

Shared-policy tests enumerate all thirteen positive warning signs, four prior
conditions, missing/uncertain answers, priority and age boundaries. Browser tests
exercise the explicit gate, immediate blocking, draft retention, correction,
refresh, keyboard focus, responsive widths, and existing assessment workflows.
Opt-in private-service tests issue direct HTTP bypass attempts and verify 422
responses without risk/CIF, then run real frozen-model prediction workflows.

No lint command is configured. Run `npm run check`, `npm run build`,
`npm run test:e2e`, and `npm run verify:production`. With the private service
running, set `PINTIG_LIVE_RSF=1` for the live tests. The main prediction and research
CIG remain separate and not clinically validated.

## Implementation inventory and executed checks

- `backend/README.md`
- `docs/PRE_ASSESSMENT_SCREENING.md`
- `scripts/verify-production.mjs`
- `src/components/PreAssessmentCheck.tsx`
- `src/components/ResearchCigPanel.tsx`
- `src/main.tsx`
- `src/pages/Assessment.tsx`
- `src/pages/Results.tsx`
- `src/services/preAssessment.ts`
- `src/services/preAssessmentRules.d.mts`
- `src/services/preAssessmentRules.mjs`
- `src/services/snapshots.ts`
- `src/state/actions.ts`
- `src/state/formEvents.ts`
- `src/state/store.ts`
- `src/styles/preAssessment.css`
- `src/types/domain.ts`
- `tests/browser/additionalPatients.spec.ts`
- `tests/browser/assessmentHistoryView.spec.ts`
- `tests/browser/assessmentVisualization.spec.ts`
- `tests/browser/cif.spec.ts`
- `tests/browser/contentReview.spec.ts`
- `tests/browser/formValidation.spec.ts`
- `tests/browser/furtherAssessment.spec.ts`
- `tests/browser/missingFields.spec.ts`
- `tests/browser/preAssessment.spec.ts`
- `tests/browser/preAssessmentHelpers.ts`
- `tests/browser/researchCig.spec.ts`
- `tests/browser/researchCigLive.spec.ts`
- `tests/browser/resultScroll.spec.ts`
- `tests/browser/riskDistribution.spec.ts`
- `tests/browser/seededIntakes.spec.ts`
- `tests/browser/ui-standards.spec.ts`
- `tests/browser/workflows.spec.ts`
- `tests/preAssessment.test.mjs`

The private `PINTIG_RSF_LOCAL_RESEARCH_HARNESS/questionnaire_model/research_server.cjs` was also changed locally to enforce screening. It is outside this public Git repository.

Executed results: TypeScript plus 64 unit tests passed; production build passed; ordinary browser suite 45 passed with 3 private-service tests skipped; opt-in live suite 3 passed, including 28 eligible real-model browser predictions and 57 rejected direct API requests; production verification passed; Git whitespace checks passed. Desktop, tablet, mobile, keyboard focus, immediate blocking, and clarification-row alignment were checked. No lint script is configured.

The frozen RDS SHA-256 remained `6989c1cb6b100cfbfdcb7e05ab930541f31b50ed5f9f1bbb645c0cb1539f766d`. The 11 patient fixtures and 10 initial assessments were preserved. No model, dataset, algorithm coefficients, risk thresholds, role permissions, or CIF mathematics changed. No commit, push, or deployment was performed.
