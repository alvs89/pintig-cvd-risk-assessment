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
- Cumulative incidence panel in live and saved results, with 5%, 10% and 20%
  numerical reference markers, supported-year inspection and a readable data table.
  Curves require verified compatible model output; existing illustrative assessments
  show an unavailable state. See `CIF_INTEGRATION.md` for the integration contract.

## Records and administration
- Dashboard totals and recent records.
- Live search/filter in Patients, History, Users, Audit and Reports; CSV reports.
- User account creation, viewing, editing and activation/deactivation; confirmation dialog for account deactivation, audit events, and maintenance/export functions. Account deletion is not implemented.
- Help and About pages, browser-responsive layout, top navigation, custom favicon.

## Current runtime characteristics
- No persistence after page reload; no actual backend API/database; authentication and privacy UI are browser-only.
- Seeded historical records and new assessments use `ILLUSTRATIVE-0.2`; seeded records have a limited legacy input schema. Avoid interpreting or comparing them as real clinical observations.
- React owns the role-specific layout, all pages, confirmation dialog and live updates. No runtime HTML replacement or global document event handlers remain.
- Prediction, classification, calculation explanation and educational guidance have separate versions; newly saved snapshots retain them.
- Browser tests compare clinical questionnaire fields, labels, response values and constraints against the original v27. The input-set selector has professional presentation labels while retaining its original values and behavior.

## Current questionnaire intake (27 proposed predictors)

New Risk Assessment collects source-referenced questionnaire responses and saves them for the session without risk calculation. Historical illustrative results remain available. The proposed schema is blocked from both existing calculators. See [assessment documentation](assessment27/IMPLEMENTATION.md) for the 13-source review, 27-feature mapping, storage contract and unresolved scoring definitions. See [Feature Engineering Protocol v1.0](feature_engineering/v1.0/PROTOCOL.md) and its generated [data dictionary](feature_engineering/v1.0/data_dictionary.csv) for the equations, provenance, source review and dataset comparison. Earlier descriptions of live illustrative assessment calculation refer to the retained historical workflow.

Current SES status: [Reference protocol 1.3](feature_engineering/v1.3/SES_PROTOCOL.md). The old 50/50 formula is retired. Source responses and square-root-adjusted income bounds are retained; SES remains unavailable until suitable reference data and validated scoring parameters exist. Prediction remains disabled.
