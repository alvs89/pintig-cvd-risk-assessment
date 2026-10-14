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
