# PINTIG — Frontend Prototype

Project repository: [alvs89/pintig-cvd-risk-assessment](https://github.com/alvs89/pintig-cvd-risk-assessment).

A fully interactive **React + TypeScript + Vite + CSS** frontend preserving the
PINTIG v27 design, branding, questionnaire, navigation and workflows. All records
are fictional and remain in browser session memory. The original application is
preserved unchanged in `legacy/PINTIG_Web_Application_v27.html`.

## Run locally

Use Node.js 22.12+ (or 20.19+) and npm:

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. Dependencies and the lockfile are included in the
project configuration. Reloading restores the starting fictional records.

For the production frontend:

```powershell
npm run start:local
```

`start:local` builds and serves the frontend on **http://127.0.0.1:5174/**.
`npm run preview` also serves the built Vite application. The original standalone
HTML can still be opened directly without installing dependencies.

## Configuration

No environment file is required by the current frontend. Application code does not
read `import.meta.env`, and the Node scripts do not load `.env` files. Set optional
tooling variables in the shell before running the relevant command:

| Variable | Used by | Default / purpose |
| --- | --- | --- |
| `PORT` | `scripts/serve.mjs` | `5174`; changes the production static-server port |
| `PINTIG_PREVIEW_URL` | `scripts/verify-production.mjs` | `http://127.0.0.1:5174`; selects the production server to verify |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE` | Browser tests and production verification | Optional path to an existing Chromium executable; otherwise Playwright uses its installed browser |
| `CI` | `playwright.config.ts` | When set to a nonempty value, prevents tests from reusing an existing development server |

For example, to verify the production server on another port, use two terminals:

```powershell
# Terminal 1
$env:PORT = '5175'
npm run start:local
```

```powershell
# Terminal 2
$env:PINTIG_PREVIEW_URL = 'http://127.0.0.1:5175'
npm run verify:production
```

The browser-test server remains on port `5173`; `PORT` does not change it.
Never put secrets or patient information in `VITE_*` variables: Vite can expose
them to browser code. Future backend settings belong in server-only configuration.

## Fictional demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@pintig.demo` | `Admin123!` |
| Healthcare Worker | `worker@pintig.demo` | `Worker123!` |

Sign-in, account updates and role checks are frontend demonstrations. They do not
provide production authentication or secure patient access. Use fictional data only.

## Project structure

```text
src/
  main.tsx / App.tsx         React entry and page composition
  components/               Shared forms, tables, identity controls and dialog
  layouts/                  Workspace, branding and role-specific navigation
  pages/                    All patient, assessment and administrative screens
  state/                    Typed fictional records, subscriptions and actions
  services/                 Prediction, guidance, explanation, snapshots, reports
  types/                    Domain and future prediction-service contracts
  utils/                    Age/date, phone and unrounded risk-band functions
  styles.css                Preserved v27 CSS
legacy/                     Original HTML and extracted baseline JavaScript
tests/                      Source-integrity, service and browser regressions
docs/                       Inventory, migration plan, verification and boundaries
scripts/serve.mjs            Local production static server
```

## Demonstrable workflows

- Administrator and Healthcare Worker login, role menus, account switching and sign-out.
- Patient registration, editing, generated record numbers, details and name visibility.
- Full non-laboratory questionnaire, eligibility checks, core/extended inputs and live derivations.
- Illustrative continuous 10-year estimates, risk bands, calculation factors and educational guidance.
- Save-once assessment snapshots, history, filtering and printing with identities concealed.
- Administrator reports/CSV, user management and activation, audit filters and JSON exports.
- Help, FAQs, About, My Account, confirmation dialogs and responsive layouts.

The prediction, risk bands, explanation and educational rules are separate and
versioned. The illustrative prediction formula and guidance rules match v27.
New snapshots copy their inputs and guidance so later form changes do not alter them.

## Checks

```powershell
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

With the production server running on port 5174, `npm run verify:production`
checks its assets, React login and dashboard geometry against the original v27.

`check` runs strict TypeScript validation and Node regression tests. Browser tests
start Vite automatically and cover both roles, intake, saved records, exports,
responsive rendering and field-by-field parity with the original questionnaire.
An existing Chromium executable can be selected with the
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` environment variable.

See [verification](docs/VERIFICATION.md) and the
[frontend architecture, migration history and integration roadmap](docs/FRONTEND_MIGRATION.md).
All subsequent frontend work follows the permanent [UI/UX standards](docs/UI_UX_STANDARDS.md).

## Scope and limitations

The frontend uses **illustrative calculations**, not a trained competing-risk RSF
or clinically validated prediction. Its intended research scope remains first major
cardiovascular event within 10 years, ages 35–70 at baseline, with non-CVD death as
the intended competing event. Display categories use the unrounded probability:
Low <5%, Moderate 5–<10%, High 10–<20%, Very High ≥20%.

No Python/FastAPI backend, PostgreSQL database, R model or actual patient dataset
has been implemented. Future integration must follow the approved manuscript and
verified dataset definitions. See [known limitations](docs/KNOWN_LIMITATIONS.md).
