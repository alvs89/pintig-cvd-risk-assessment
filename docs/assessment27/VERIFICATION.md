# Assessment intake verification — 2026-11-03

## Results

- `npm run check`: TypeScript and all 80 unit tests passed. An initial sandboxed
  attempt failed to spawn test processes with Windows EPERM; the authorized retry
  passed without modifying application code to work around that restriction.
- `npm run build`: production build passed (89 modules).
- `npx playwright test tests/browser/assessment27.spec.ts --reporter=line`:
  three viewport workflows (1440, 820, 390 pixels). Covers eligibility gating,
  conditional questions, invalid BP rejection and error focus, retained skipped
  answers, session saving/history, no enabled calculation and no page errors.
  Source-note overlap checks pass for every visible questionnaire field. Visual
  inspection identified and corrected inherited subgrid overlap; desktop, tablet
  and mobile screenshots were reviewed after the correction.
- `node --import tsx scripts/export-assessment27-dictionary.mjs` and
  `python scripts/build-feature-protocol-assets.py`: regenerate response and
  predictor dictionaries; exactly 27 mapping rows.
- Python SHA-256 comparison against
  `analysis/reports/questionnaire_27_engineered_20261103_v1/protected_sha256.json`:
  1,240 data/analysis/legacy/model artifacts checked, zero differences.
- Legacy v27 checksum, illustrative prediction equivalence and category-boundary
  regression tests passed. No model training or performance evaluation was run.

The in-app browser failed to connect with `missing field sandboxPolicy`.
Repository Playwright provided browser verification instead. Screenshots are local
test artifacts under `test-results/assessment27*.png`, not research or patient data.
The full historical browser suite was not run; its live calculation expectations
must be revised before treating it as the acceptance suite for this new workflow.

## Files created for this change

- `src/pages/Assessment27.tsx`
- `src/services/assessment27.ts`
- `src/services/featureProtocolV1.ts`
- `scripts/build-feature-protocol-assets.py`
- `scripts/audit-feature-protocol.py`
- `docs/feature_engineering/v1.0/PROTOCOL.md`
- `docs/feature_engineering/v1.0/questionnaire_mapping.csv`
- `docs/feature_engineering/v1.0/data_dictionary.csv`
- `docs/feature_engineering/v1.0/manifest.json`
- `docs/feature_engineering/v1.0/source_review.json`
- `docs/feature_engineering/v1.0/dataset_review.json`
- `src/state/intakes27.ts`
- `src/components/IntakeHistory27.tsx`
- `src/styles/assessment27.css`
- `src/data/ipaq27.json`
- `scripts/export-assessment27-dictionary.mjs`
- `tests/assessment27.test.mjs`
- `tests/browser/assessment27.spec.ts`
- `docs/assessment27/source_review.json`
- `docs/assessment27/MAPPING.md`
- `docs/assessment27/IMPLEMENTATION.md`
- `docs/assessment27/questionnaire_dictionary.json`
- `docs/assessment27/feature_dictionary.csv`
- `docs/assessment27/VERIFICATION.md`

## Existing files updated for this change

- `src/App.tsx`: route the new intake.
- `src/pages/History.tsx`: display saved questionnaires separately from risk results.
- `src/pages/Information.tsx`: describe current response collection and model status.
- `src/services/prediction.ts`, `src/services/researchCig.ts`: reject new-schema input.
- `src/state/actions.ts`: protect the old submit path and include intake snapshots in backup.
- `tests/smoke.test.mjs`: check TypeScript `any` type nodes via the AST, so original
  questionnaire prose containing the word "any" is not incorrectly rejected.
- `README.md`, `docs/FEATURE_INVENTORY.md`, `docs/KNOWN_LIMITATIONS.md`: document the
  current intake and distinguish it from historical illustrative assessment.

Other pre-existing working-tree changes and research artifacts were preserved.
No Git publication, database migration, deployment or model replacement occurred.

## Remaining decisions

Approve scoring and collection definitions for diet, SES, residence and activity;
resolve overlapping adult passive-smoking duration without inventing source items;
obtain the measurement manual; address IPAQ age-70 applicability; validate the
proposed transformations and questionnaire digitization. Full FFQ collection is
deferred. Select and validate a compatible model before enabling prediction.
Backend persistence, authentication and patient-level authorization require a
separate implementation phase; current frontend controls do not provide them.
