# PINTIG development instructions

- Project repository: `https://github.com/alvs89/pintig-cvd-risk-assessment.git`. Use this repository for subsequent Git and GitHub work. Preserve the local frontend changes when synchronizing.

- Visual and workflow reference is `legacy/PINTIG_Web_Application_v27.html`, preserved unchanged. The working frontend is React + TypeScript in `src/`, with the original CSS in `src/styles.css`. The extracted original JavaScript is archived in `legacy/extracted-v27.js` for regression tests. Preserve all functionality unless a requirement explicitly changes it.
- `README.md`, `docs/FEATURE_INVENTORY.md` and `docs/KNOWN_LIMITATIONS.md` identify the implementation baseline. Chapter 1–3 manuscript and verified dataset definitions supersede any provisional demo assumptions when provided.
- **No clinical overclaims:** the present frontend uses illustrative risk calculations, not a trained competing-risk RSF. Keep truthful model status in clinical result views. Never present demonstration numbers as validated predictions.
- Study prototype constraints: first major cardiovascular event within 10 years; non-CVD death as competing event; age 35–70 at baseline; continuous probability is primary output; display categories Low <5%, Moderate 5–<10%, High 10–<20%, Very High >=20%. Use unrounded value for classification.
- Existing user roles: Administrator and Healthcare Worker. Enforce permissions on future backend APIs and patient access; current frontend roles and eye icons do not secure private data.
- User-facing copy should be professional and concise; do not add development/change-log language to normal patient-facing screens.
- Keep risk prediction, risk-band assignment, explanation, and condition-based educational guidance separately implemented and versionable.
- Never put real PHI/PII, PhilHealth IDs, passwords, dataset extracts, keys, or clinical records in Git, fixtures, screenshots, or prompts without proper authorization.
- Before each change: identify impacted workflows and add/update tests. Run `npm run check` and `npm run build`. Prefer small reviewable changes; avoid an untested complete rewrite.
- Current app is React + TypeScript with Vite tooling and session-only fictional data. No backend, database, or trained RSF model is implemented. Keep this development phase frontend-only.
- Permanent frontend standards: follow `docs/UI_UX_STANDARDS.md` for all subsequent work. Normal screens must use professional healthcare language and must not expose development history, demo/prototype labels, temporary implementation details or version codes. Keep a concise, truthful illustrative-model notice in live and saved results. Preserve methodology, functionality, privacy controls and the v27 visual identity; verify affected workflows and desktop/tablet/mobile accessibility before completion.
