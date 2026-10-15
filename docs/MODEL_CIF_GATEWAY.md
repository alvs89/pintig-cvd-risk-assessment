# PINTIG — Future RSF-to-CIG Integration Boundary (Stage 2)

## Status

Implemented as an isolated, disabled frontend gateway. Normal assessment and saved History flows remain unchanged. There is no new R server, endpoint, patient-to-model mapping, data import, API call or activation of patient-specific CIG.

Added:
- src/services/modelCifGateway.ts — pure disabled-by-default future response converter with a pinned release manifest and existing validateCif.
- tests/modelCifGateway.test.mjs — isolated mock response and negative-control tests.
- This design document.

The working model-generated fictional CIG remains separate in Downloads\PINTIG_RSF_LOCAL_RESEARCH_HARNESS.

## Why the live CIG remains unavailable

The normal application currently produces only a scalar illustrative percentage. Its predictor provides no model-generated CIF time grid.

The saved provisional 500-tree augmented-Framingham forest generates 150 time points but:
- Target event 1 is Framingham recorded CVD (MI, fatal coronary disease and specified strokes), not the intended PURE Philippines composite including heart failure.
- Competing event 2 is recorded death before CVD, without verified non-CVD-only restriction.
- Six augmented model-variable constructions remain unresolved, including the diet and socioeconomic scores, so the questionnaire cannot safely supply all model inputs.
- The event time grid ends at day 3646 while the documented ten-year follow-up is day 3652.5. Only the separate hash-verified research harness supports an explicitly documented terminal right-continuous step for this frozen artifact. Normal CIG validation requires a time point reaching year 10.

Do not invent intermediate CIF values, map patients to demo vectors, relabel model outcomes or extend a raw time grid silently.

## Target future architecture

Authorized healthcare worker -> validated questionnaire -> private authenticated backend -> approved predictor preprocessing and missingness -> approved PURE Philippines competing-risk RSF worker -> correct target-event CIF selection and verified ten-year support -> pinned endpoint/model/version response -> frontend modelCifGateway -> existing CumulativeIncidencePanel + immutable assessment record.

Backend requirements: server-side user/role permission checks, patient/session identity binding, privacy and minimization, TLS, sensible audit and retention, careful error handling and no model/research dataset in a public web bundle. CORS or a frontend manifest alone cannot establish backend authorization.

## Proposed normalized API response schema

A successful backend response must contain:

- schemaVersion: pintig-model-cif-v1
- patientId: authorized integer matching request
- modelSource: competing-risk-rsf
- releaseId, modelVersion, cohortId: exactly match independently authorized deployment release
- outcomeId, eventCode, competingEventCode: exact match to pinned endpoint metadata
- risk10: full-precision decimal fraction selected from the target CIF at ten years
- cif: probabilityUnit fraction; timeUnit years/months/days; daysPerYear for days; supportedUntil in same unit; strictly increasing times and equally long bounded monotone probabilities

The release manifest pins model version, release ID, cohort ID, endpoint ID/kind/label/definition, event and competing event codes and time convention. An untrusted server payload must not determine the meaning of a clinical endpoint.

ACTIVE_MODEL_RELEASE remains intentionally null. No PINTIG application path calls this gateway yet. Tests supply a mock manifest to test format only; that is NOT proof of approval or clinical validation. The future trusted deployment and secured backend must enforce release authorization independently.

The gateway delegates full curve validation to the existing validateCif function. It requires identity, outcome match, probability unit, time grid, ten-year coverage, unrounded risk equality to the supplied 10-year CIF within 1e-12, and consistent unrounded risk grouping. It never interpolates, smooths or estimates missing points.

## Requirements to enable real patient-specific CIG

1. Obtain approved PURE Philippines longitudinal data and dictionary, with baseline eligibility, composite endpoint (MI, stroke, heart failure, CV death), cause-of-death and competing event codes, event/censor dates and verified follow-up.
2. Finalize supported questionnaire input/measurement protocols, preprocessing and missingness. Retrain if unrecoverable augmentation recipes prevent proper use of the old provisional model.
3. Train, internally validate, calibrate and lock a final appropriate RSF with review and approval before any release claims.
4. Build private authenticated backend and R inference worker. Select correct event/cause, verify axes of the returned R array, bind predictions to exact assessment ID, and return complete ten-year data. Document an approved terminal-step convention where scientifically defensible.
5. Approve and pin the model release manifest independently; implement backend security, privacy logging, retention and failure handling.
6. Add asynchronous patient-result wiring with loading, timeout, cancellation on patient changes, no stale response, immutable snapshots and no invented explanation terms.
7. Obtain expert review of category-based Further Assessment Guidance separately. A valid model response does not automatically authorize clinical guidance.
8. Complete type, unit, browser, production and privacy verification before any patient-facing launch.

## Noninterference

The primary CIG panel remains hidden until compatible model data exist. The separate local research CIG supports eleven approved fictional identities on new submissions; its Framingham probabilities are neither substituted for the primary illustrative estimate nor attached to saved assessments. See LOCAL_RESEARCH_CIG.md.

The local uncommitted scalar and factor visualization work was retained. This phase adds only an inactive pure adapter, isolated tests and documentation; it creates no server endpoints, dependencies, database updates, model changes, training data copies or commits.

Run npm run check, npm run build, npm run test:e2e and npm run verify:production. Do not report pass statuses for tests that have not run.

NO live clinical integration is claimed or authorized.
