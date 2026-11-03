# Verification, 2026-11-03
- npm run check: TypeScript and 87 tests passed.
- npm run build: passed.
- npx playwright test tests/browser/assessment27.spec.ts: all 3 passed, desktop1440/tablet820/mobile390.
- node --import tsx scripts/export-assessment27-dictionary.mjs: 158 active questions, 27 features; retired question metadata exported.
- Unit tests verify category identifiers without normalized education scores, exact income interval boundaries, square-root adjustment, explicit zero, open upper bounds, missing/refused/invalid inputs, supported-count constraints and null SES even for complete responses.
- Browser checks verify optional current occupation, absent longest-held occupation, unavailable SES despite complete core answers, disabled prediction and successful saving.
- Saved records preserve raw education/income/support responses and new protocol version. Historical records are not migrated or recomputed; retired question definitions remain readable in History.
- Experimental CSV SHA256 before/after unchanged: 86dd7dca93582e9a8d67cabead1e94406e973b3e0aa9cf9febde7b8804f4ec5c.
- No participant-level reference dataset, PCA weights, fitted conditional income distribution, reference CDF or validated scoring/model artifact is available. No training or model-performance claim is made.
