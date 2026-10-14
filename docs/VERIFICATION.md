# Frontend verification

Verified locally on 14 October 2026:

- Strict TypeScript checks and all 16 service/source-integrity and interface-copy regression tests pass.
- Vite production build passes with the React entry point.
- The original v27 SHA-256 remains
  `a19f768d67b32d18582217e087a666fdf2f7d7870d59c7da372635832c46253e`.
- Archived JavaScript matches the original inline script, and all original CSS
  blocks remain present in their original order.
- Illustrative prediction outputs, factor contributions and guidance match the
  original v27 across core, extended, low-input and high-input cases.
- Tests exercise the unrounded 5%, 10% and 20% boundaries, age/phone handling,
  BMI/alcohol/activity derivations, role navigation and copied snapshot data.
- All six Playwright browser tests pass, verifying both role interfaces, registration/editing, name reveal/hide,
  live filtering and clearing, both assessment modes, validation, confirmation
  cancel/confirm, results, save/history, accounts, report CSV and JSON exports.
- A browser regression verifies identities are concealed before printing starts.
- Original clinical questionnaire fields, labels, answer values and constraints are
  compared against v27 in a browser. The input-set selector has professional labels
  while retaining its original values and behavior.
- Desktop, 820px tablet and 390px mobile screenshots were reviewed. The original navy/teal design
  remains; tables scroll within their containers on narrow screens.
- Production asset responses and React sign-in/dashboard were verified through
  `scripts/serve.mjs` on port 5174. Dashboard container, cards, metric and table
  geometry match the original v27 exactly.
- Multiline form-label alignment, required-field validation, confirmation-dialog
  keyboard cycling, Escape dismissal and focus restoration were verified.
- Interface standards are permanent in `AGENTS.md` and `UI_UX_STANDARDS.md`.
  Normal screens omit development notices and version codes; live and historical
  results share a concise, truthful illustrative-model notice. Source metadata,
  calculation, classification, guidance and original reference files are retained.

The in-app Browser connection could not initialize in this environment. Browser
verification used Playwright with the locally installed Chromium executable.
Vite and browser processes required execution outside the restricted subprocess
sandbox. No backend or trained model was created or tested.

Run `npm run check`, `npm run build`, and `npm run test:e2e` to repeat the checks.
Install the Playwright browser first or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
Screenshots are generated under ignored `test-results/` and contain fictional data.

With the production server running, `npm run verify:production` repeats the asset,
sign-in, reference and layout checks. It uses the same Chromium configuration.

## Repository cleanup verification

The approved cleanup was verified on `chore/repository-cleanup` on 14 October 2026:

- `npm run check`: strict TypeScript checks and all 16 regression tests passed.
- `npm run build`: production build passed.
- `npm run test:e2e`: all six browser tests passed, covering both roles, patient
  registration/editing, assessments, saved history, accounts, filtering, exports,
  responsive forms, validation and keyboard confirmations.
- `npm run verify:production`: asset loading, React sign-in/dashboard, original
  reference access and exact dashboard layout comparison passed on port 5174.
- Complete diff review confirmed that the only runtime-source edit removes the
  unused `patientLabel` export. No pages, styles, action handlers, tests, clinical
  calculations, thresholds or educational rules changed; `legacy/` remains intact.
- Unique roadmap content from `NEXT_STEPS.md` was transferred to
  `FRONTEND_MIGRATION.md` before deletion. FastAPI, PostgreSQL, competing-risk RSF,
  preprocessing/missingness, authorization, audit and governance requirements remain.
- The unused environment template was replaced by accurate README configuration
  guidance. The unsupported ESLint recommendation and outdated documentation
  references were removed or corrected.

No merge into `main` was performed. The remaining CSS and compatibility-handler
cleanup candidates require separate investigation and approval.

## Cumulative incidence reference-marker verification

- `npm run check`: strict TypeScript and all 26 unit/regression tests passed.
- `npm run build`: passed; isolated CIF fixtures are absent from production assets.
- `npm run test:e2e`: all ten browser tests passed, including the six existing
  workflow tests and four CIF-specific tests.
- `npm run verify:production`: assets, sign-in and exact original dashboard layout
  checks passed on the rebuilt frontend.
- CIF tests cover exact reference equality, final-year crossings, irregular time
  grids, right-continuous annual evaluation, non-crossing/rounding, months and
  explicitly defined day units, participant/model/endpoint/event mismatches,
  malformed/nonfinite/unsorted/decreasing data, inadequate horizon coverage,
  ten-year consistency and independent snapshot copies.
- Browser checks cover immediate marker changes, unchanged ten-year grouping,
  keyboard selection, screen-reader labels/live summaries, an expandable data
  table, loading/unavailable states and existing live/historical records without
  curves. Desktop, tablet, 390px/320px mobile reflow and 200% CSS zoom passed;
  reduced-motion preferences were exercised and screenshots reviewed.
- Main text contrast is at least 10.35:1 on white; curve/focus teal is 4.93:1
  and reference-line gray is 5.61:1 on white. No full accessibility certification
  or native browser-zoom audit is claimed.
- The original stylesheet and legacy references, questionnaire, eligibility,
  illustrative calculation, risk-band rules and educational guidance are unchanged.

The in-app Browser connection could not initialize; verification used local
Playwright/Chromium. No lint command is configured. There is no trained RSF output,
R prediction script, FastAPI endpoint or verified event-code mapping in this
repository. Current assessments show a neutral unavailable state. The required
future adapter and optional frontend contract are documented in `CIF_INTEGRATION.md`.
