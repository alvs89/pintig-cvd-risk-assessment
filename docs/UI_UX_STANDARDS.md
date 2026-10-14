# PINTIG permanent frontend standards

These standards apply to every subsequent frontend change.

1. Present a cohesive healthcare information system for Administrators and Healthcare
   Workers. Do not expose prototype/demo/training labels, sample-record announcements,
   development history, change notices, temporary feature descriptions, version codes
   or unnecessary implementation details on normal screens. Technical information
   belongs in comments, documentation and development tools.
2. Preserve the existing navy/teal identity and use reusable React + TypeScript
   components and shared CSS. Keep typography, contrast, buttons, forms, badges,
   tables, dialogs, spacing and responsive layouts consistent. Align controls even
   when adjacent labels occupy different numbers of lines. Avoid oversized buttons,
   tiny text, excessive spacing and visual clutter.
3. Every visible control must work. Preserve role navigation and action checks,
   registration/editing, identity visibility, assessment intake, validation, calculated
   values, results, explanations, educational guidance, history, filtering, reports,
   exports, accounts and confirmation dialogs. Retain keyboard operation, focus
   visibility and clear feedback. Never imply secure backend authorization exists.
4. Use concise healthcare language and actionable error messages. Display retrieved
   and calculated information as labeled read-only values. Use the same terminology
   on related screens and exports. Avoid raw questionnaire keys and implementation
   codes in patient-facing records.
5. Preserve the documented non-laboratory first-event workflow, baseline eligibility,
   ten-year horizon, target outcome, intended competing event, unrounded risk bands,
   questionnaire content and independently generated educational guidance. Do not
   invent clinical assumptions, scoring systems or validation claims. Live and saved
   results must retain concise, truthful illustrative-model status.
6. Inspect related components, state, services and dependencies before changes.
   Keep data access, prediction, classification, explanation and guidance separate
   from presentation. Preserve original v27 and use fictional data only. Backend,
   database and trained-model implementation remain deferred.
7. Identify impacted workflows and add/update meaningful tests. Run TypeScript
   checks and the production build. Test affected interactions, validation, keyboard
   navigation and desktop/tablet/mobile layouts; resolve regressions and runtime
   errors. Make incremental changes without unnecessary redesigns.

Frontend polish does not establish clinical validation, secure storage or production
authentication. Retain those facts in project documentation and necessary result
context without turning routine screens into development notices.
