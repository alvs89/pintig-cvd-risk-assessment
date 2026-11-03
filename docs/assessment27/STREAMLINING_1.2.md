# Approved questionnaire streamlining 1.2
Date: 2026-11-03. Scope: only orange-highlighted questions approved by the user.

Removed from new intake (31 response fields):
- 2 diagnosis durations.
- 3 medication starting ages, first-insulin item, pregnancy-only diabetes item.
- 2 affected-sibling counts; total siblings remains.
- Alcohol starting age, 4 beverage durations, 4 cessation durations, episode count and episode quantity. Beverage-specific quantity and frequency remain.
- 4 childhood-smoker follow-ups; primary childhood-exposure item remains.
- 4 typical-day activity components; sleep remains.
- IPAQ motor-travel Q8 and Q9 hours/minutes (3 response fields).

Unhighlighted last-year smoking remains. No additional education change: duplicate PURE education was already retired in 1.1, and the Framingham education/income adaptation remains intact. Clothing metadata, adult passive-smoking duration, food responses, activity components, sitting, eligibility and prediction restrictions remain.

The childhood-follow-up consistency rule, affected-sibling count checks, removed age checks, motor-travel duration checks and 24-hour sum rule are removed. Retired draft values do not affect features, missingness or validation; new saves only include active fields. Raw historical responses and stored calculations are not rewritten. Retired metadata remains available in History and dictionary exports. New saves carry PINTIG-FE-1.2; SES still uses the SES1.1 equation.

This is a selected-item adaptation of Framingham/PURE and an abbreviated IPAQ collection, not administration of the full original instruments. IPAQ activity calculation is unchanged; sitting still excludes motor-vehicle time. Sleep remains typical-day hours, not a verified hours/night equivalent. Removing pregnancy-only detail does not establish adjudication of diabetes subtype; diabetes remains the existing self-reported binary definition.

Validation: 86 unit tests and TypeScript passed; production build passed. Browser tests cover field absence, retained sleep, conditional exposure and saving at desktop/tablet/mobile. Dataset SHA256 unchanged: 86dd7dca93582e9a8d67cabead1e94406e973b3e0aa9cf9febde7b8804f4ec5c.
