# Known limitations

- **Clinical model:** The current estimate is the original illustrative calculation,
  not a trained PURE Philippines competing-risk RSF. No model artifacts, calibration,
  validation metrics or participant dataset are present. Live and saved result screens
  identify estimates as illustrative.
- **Persistence:** Fictional patients, assessments, users and audit events are held
  in session memory and reset when the page reloads. No browser storage or database
  is used for clinical records.
- **Authentication and privacy:** Demo credentials and roles are client-side. The
  prototype gates role menus/actions and hides identifying fields by default, but
  these controls do not provide secure patient authorization or storage.
- **Educational rules:** The preserved v27 rules require expert review before patient
  use. They are independent of the estimated probability and are not prescribing rules.
- **Future services:** No FastAPI backend, PostgreSQL integration, R inference service,
  OTP delivery, secure audit service or PhilHealth integration is implemented.
- **Research inputs:** Approved Chapters 1–3 and the verified PURE dictionary are not
  included. They supersede provisional demo assumptions when supplied.
- **Quality review:** Automated tests and desktop/mobile screenshots cover the
  prototype's main workflows. Full accessibility, security and clinical reviews
  remain separate requirements for any future deployment.

Use fictional records only. React and TypeScript migration is complete for the
current frontend; this does not imply completion of the proposed clinical system.
