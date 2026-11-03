# SES 1.1 verification
Date: 2026-11-03 (Asia/Manila).

- npm run check: TypeScript and 86 tests passed.
- npm run build: passed.
- npx playwright test tests/browser/assessment27.spec.ts: desktop 1440px, tablet 820px and mobile 390px passed against the persistent server.
- Browser test verifies only one education field, employment and both occupation fields, PHP band selection, five supported people, SES62.5 on review, saving and toast.
- Calculation tests cover explicit zeros, missing/refused/invalid fields, per-person scaling, cap, monotonic income bands and new-record protocol1.1.
- Screening/role checks, model incompatibility and frozen outcome/model functionality retain existing regression coverage.
- Dataset SHA256 after changes matches before: 86dd7dca93582e9a8d67cabead1e94406e973b3e0aa9cf9febde7b8804f4ec5c.
- Browser connector unavailable (sandboxPolicy setup error); normal default-browser launch requested successfully. Independent Playwright tests provide browser evidence.
- Local server: npm run dev -- --port 5173 --strictPort; HTTP200 verified.
- A stale protocol-version assertion was updated. One intermediate browser run lost its temporary server; all viewport checks subsequently passed with the persistent server.
- No clinical/model performance evaluation was performed. SES assumptions and dataset incompatibility remain as documented in SES_PROTOCOL.md.

Metadata regeneration: node --import tsx scripts/export-assessment27-dictionary.mjs (190 fields, 27 predictors, retired PURE education metadata retained).
