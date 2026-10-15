# Local fictional-patient research CIG

All eleven predefined fictional identities are eligible for research CIGs on a
newly submitted assessment in the local Vite development environment. Profile
matching includes ID, record number, name, birth date, sex, locality, facility,
and the expected empty contact/PhilHealth fields. Changed or newly registered
identities are excluded even if they reuse an approved record number. The original
three profiles are shared between the store and allowlist; the other eight use
the existing predefined profile fixtures. No demographics or intake values changed.

Only seven numeric values are sent to `http://127.0.0.1:8765/research-cif`:
profile-derived age and sex, submitted SBP, DBP, BMI, current smoking, and current
blood-pressure medication. The assessment and questionnaire must belong to the
same patient. Age must agree with the profile at the current assessment date.
Lifestyle variables outside those seven do not directly enter this research RSF.

The private service remains unchanged and bound to loopback, allowing only local
Vite origins on port 5173. It invokes R prediction from the existing 500-tree
`questionnaire_rsf_500.rds`. The event is Framingham-recorded CVD, with recorded
death before CVD as competing event; non-CVD cause of death has not been verified.
It is not the intended PURE Philippines composite and is not clinically validated.
Neither this curve nor its probability replaces the primary illustrative result.

No model was retrained, moved, or added to the repository. The SHA-256 before and
after verification on October 15, 2026 was:
`6989c1cb6b100cfbfdcb7e05ab930541f31b50ed5f9f1bbb645c0cb1539f766d`.

Requests are associated with their submitted assessment, identity, predictor
signature, and refresh attempt. Previous requests are aborted on replacement.
Changed inputs and new submissions request fresh inference. A 50-second timeout
shows the retryable unavailable state. Invalid responses never produce a graph.
Metadata, curve ordering, probabilities, annual evaluation, and final ten-year
consistency continue to use the existing response validator.

Research curves are transient. They are not attached to historical assessments
or persisted by saving the illustrative result. The ten initial saved records
remain unchanged. Production builds disable the feature, including when served
on loopback; no Netlify or other hosted integration was added.

For the defense, run the existing private `start_research_server.ps1` from its
`questionnaire_model` directory, and run `npm run dev -- --port 5173 --strictPort`
in the frontend directory. Keep both processes running. Select a fictional
patient, use **Prefill questionnaire**, review/edit responses, then submit.

The opt-in live test requires that private service and frozen artifact:

```powershell
$env:PINTIG_LIVE_RSF = '1'
npx playwright test tests/browser/researchCigLive.spec.ts
Remove-Item Env:PINTIG_LIVE_RSF
```

It performs real inference for all eleven cases and three edited cases under
each role, verifies exact seven-predictor requests and validated responses, checks
the displayed graph/annual values, and compares saved records before and after.
Ordinary CI runs skip these two private-model tests and use isolated fixtures for
offline, timeout, malformed-output, and stale-response safeguards.
