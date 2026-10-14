# PINTIG frontend feature inventory

The React + TypeScript frontend preserves these v27 workflows. Nothing is deployed to a backend. The original standalone HTML and extracted JavaScript remain in `legacy/` for comparison.

## Sign in and roles
- Fictional administrator and healthcare worker accounts.
- Frontend login, account switch and sign-out confirmation.
- Administrator menu: Dashboard, Patient Management, New Risk Assessment, Assessment History, Reports, User Accounts, Audit Logs, Maintenance, Help, About, My Account.
- Healthcare worker menu: Dashboard, Patient Management, New Risk Assessment, Assessment History, Help, About, My Account.

## Patient management
- Register/edit fictional profiles (name, DOB, sex, phone, locality, optional PhilHealth PIN and healthcare facility).
- Application-generated PINTIG Record Number, patient lookup, and privacy-conscious default name concealment with a reveal button.
- User-facing list controls, action buttons, and record views.

## Risk assessment
- Choose patient by record number; retrieve DOB, assessment age and sex.
- Eligibility checks, measurements and questionnaire responses.
- Derived BMI, drinks/week and activity minutes/week when valid source answers are entered.
- Core and extended input flows, validation and clear-assessment dialog.
- `simulate` illustrative score output, risk grouping, model-oriented factor description and `generateGuidance` rule-based content.
- Saved assessment snapshots and review through Assessment History.

## Records and administration
- Dashboard totals and recent records.
- Live search/filter in Patients, History, Users, Audit and Reports; CSV reports.
- User account CRUD/status changes, confirmation dialog for account deactivation, audit events, and maintenance/export functions.
- Help and About pages, browser-responsive layout, top navigation, custom favicon.

## Current runtime characteristics
- No persistence after page reload; no actual backend API/database; authentication and privacy UI are browser-only.
- Some historical seeded records use a previous illustrative model version. Avoid interpreting or comparing them as real clinical observations.
- React owns the role-specific layout, all pages, confirmation dialog and live updates. No runtime HTML replacement or global document event handlers remain.
- Prediction, classification, calculation explanation and educational guidance have separate versions; newly saved snapshots retain them.
- Browser tests compare every questionnaire field, label, option and constraint against the original v27.
