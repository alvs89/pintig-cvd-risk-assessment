# Fictional practice population

The original three identities and two historical assessments remain unchanged.
Eight additional entirely fictional Filipino profiles (PNT-000004 through
PNT-000011) have complete extended questionnaires and assessments AST-0003
through AST-0010. They are not research participants or actual clinical records.
Names are invented; contact numbers and PhilHealth identifiers are empty.

`src/state/additionalPatients.ts` holds their demographic and questionnaire
fixtures. The pure population factory uses `deriveInputs`, `simulate`, `band`,
`generateGuidance`, and `createSnapshot`. No category or probability is assigned
to a fixture. Original fixture inputs remain in `seededIntakes.ts`, which also
provides editable copies of the additional intakes through the existing explicit
Prefill questionnaire action.

Population happens once when the in-memory store module initializes, not during
rendering. Factory calls return independent objects without appending to shared
arrays. Reloading resets session state, as before; no persistence was added.
As in manual assessments, initial snapshot dates and ages use the current clock.
The fixture data are deterministic; results may change on birthdays in future
sessions. Existing snapshots are never rewritten during a session or when an
intake is edited. Category coverage is verified for the current demonstration
period; future age eligibility and coverage must be checked before reuse.

All added results are illustrative, not clinically validated probabilities.
Explanations and educational guidance use the existing versioned rules.
No validated further-assessment guidance, CIF, or prediction context is attached.
The local research-CIG allowlist includes all eleven known fictional identities.
Each new assessment requests its own seven-predictor research curve when the
private service is running. Historical records remain unchanged; no curve is
retroactively attached. Production builds (including Netlify) disable the
research graph; no hosted endpoint is configured or introduced.
The existing research RSF and intended PURE Philippines model remain distinct.

These fixtures must be excluded from any future live clinical deployment; they
are part of the current session-only practice frontend, not production data.
