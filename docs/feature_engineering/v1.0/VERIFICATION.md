# Protocol v1.0 implementation verification

Completed 2026-11-03. The protocol runs in the New Risk Assessment questionnaire and stores raw responses, derived 27-key values, feature-level provenance and protocol version. Prediction remains blocked.

## Commands and results

- `node --import tsx scripts/export-assessment27-dictionary.mjs` - pass; generated 186 source-linked response fields and 27 feature entries.
- `python scripts/build-feature-protocol-assets.py` - pass; generated 27 rows in each predictor mapping/data dictionary and a version manifest.
- `python scripts/audit-feature-protocol.py` - pass; verifies all 13 source hashes and the frozen CSV checksum/schema/participants/outcomes/folds, then writes descriptive audit JSON without modifying research data.
- `npm run check` - pass; TypeScript check and 80 tests.
- `npm run build` - pass; Vite production build.
- `npx playwright test tests/browser/assessment27.spec.ts --reporter=line` - pass; desktop 1440px, tablet 820px, mobile 390px. Checks source gating, invalid value focus, education and diet calculations, saved values/provenance, skipped raw answers, disabled prediction and no horizontal overflow.
- SHA-256 comparison of 1,240 existing data, analysis, legacy and model artifacts against the pre-change inventory - zero differences.
- SHA-256 verification of all 13 supplied PDF files - zero differences.

Dataset examined read-only: `data/processed/questionnaire_27_engineered_20261103_v1/pintig_framingham_27predictors_ENGINEERED_PROXY_EXPERIMENTAL.csv`; 4,191 unique participants, 33 columns, SHA-256 `86dd7dca93582e9a8d67cabead1e94406e973b3e0aa9cf9febde7b8804f4ec5c`. Outcome counts are 3,604 censored, 369 recorded-CVD proxy and 218 death-before-recorded-CVD proxy. Its values were not edited.

## Protocol limits

Diet Food6 is a six-component, 0-100 PINTIG adaptation inspired by published AHEI components, not complete AHEI-2010, DASH or MDS. The supplied FFQ subset omits required nutrient detail and Food6 has a narrower attainable range than the synthetic score. SES is an education-only proxy; Gen3 income categories are US-specific and are not recalibrated locally. Residence classification depends on the recorded PSA source and year. IPAQ age70 is outside its 15-69 age range, and its derived minute totals are not statistically equivalent to synthetic activity minutes. Adult passive-smoke years retain only a lower bound because exposure intervals were not asked. Measurement manual is unavailable; self-report items and Framingham values are not interchangeable. Outcome labels in the Framingham file remain proxies. No compatible trained model or validation was performed; calculation remains disabled.

The current app is frontend/session-only. Records do not survive reload, and frontend role gates do not provide secure backend authorization. No backend, database or model was added.
