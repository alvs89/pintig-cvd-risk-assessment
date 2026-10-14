# Frontend migration

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

## Phases and acceptance

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

Future API authentication, PostgreSQL and competing-risk RSF integration are
deferred. The illustrative predictor must not be relabeled as a validated model.
