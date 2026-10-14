# Development scope

The current priority is the frontend prototype. Its React + TypeScript migration,
role workflows, fictional session state and frontend verification are implemented.
See `FRONTEND_MIGRATION.md` for the migration sequence and `VERIFICATION.md` for checks.

Continue frontend work against the preserved v27 reference and maintain tests for
both roles. Use only fictional records. Keep the original questionnaire and
assessment scope unless an explicit requirement or approved research specification
changes them.

The following are **deferred**, and require a separate implementation phase:

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
