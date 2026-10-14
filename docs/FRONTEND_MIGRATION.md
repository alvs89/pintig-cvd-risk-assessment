# Frontend architecture, migration history and integration roadmap

## Baseline and scope

The preserved v27 HTML is the reference for visual design, routes, form questions,
calculation, rules, privacy controls and administrative tools. The migration is
frontend only. All starting records and credentials are fictional. Session state
resets on reload; no backend, database or trained model is introduced.

## Structure

```text
src/
  main.tsx / App.tsx        React entry and application composition
  components/              Shared fields, identity, tables and confirmation dialog
  layouts/                 Role-specific workspace and navigation
  pages/                   Login, dashboard, patients, intake, results, history,
                           reports, users, audit, maintenance, help and account
  state/                   Typed session store, fictional records and actions
  services/                Illustrative prediction, educational guidance, exports
  types/                   Patient, user, assessment and application contracts
  utils/                   Dates, phone normalization and risk classification
```

## Completed frontend migration

The React + TypeScript migration, role workflows, fictional session state and
frontend verification are implemented. The following stages describe the completed
migration and its acceptance checks; see `VERIFICATION.md` for verification evidence.

1. Establish the baseline: verify the original checksum and inventory every role
   route. Add regression tests for risk boundaries, derived values, eligibility,
   saved snapshots, rules, and frontend permission boundaries.
2. Extract typed state and independently versioned assessment services. Preserve
   the illustrative formula and unrounded risk category assignment.
3. Move all rendered pages, shared controls and the layout to React while retaining
   the existing CSS and content. Replace global event listeners and HTML DOM
   replacement with React events and state subscriptions. Verify filtering without
   losing focus and questionnaire derivations without losing entered answers.
4. Exercise both roles end to end: registration, editing, identity visibility,
   core/extended intake, invalid intake, results, save/history, account management,
   report filters/exports, confirmation cancel/confirm, and responsive layout.
   Run TypeScript checks, automated tests and the production build.

## Current development scope

The current priority remains the frontend. Continue frontend work against the
preserved v27 reference and maintain tests for both roles. Use only fictional
records. Keep the original questionnaire and assessment scope unless an explicit
requirement or approved research specification changes them.

## Deferred integration roadmap

The following require a separate implementation phase:

1. Approved manuscript and verified dataset mapping, including preprocessing and
   missingness contracts.
2. FastAPI APIs, PostgreSQL migrations, secure authentication, patient-specific
   authorization and server-side audit controls.
3. Trained, evaluated competing-risk RSF artifacts and versioned model integration.
4. Clinical, accessibility, privacy, security and deployment governance review.

The future prediction service contract is defined in `src/types/domain.ts`.
Risk bands, illustrative prediction, calculation explanation and educational
guidance are independently versioned. Do not relabel demonstration estimates as
clinically validated predictions.
