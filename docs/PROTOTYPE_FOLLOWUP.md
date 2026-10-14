# PINTIG — Proposed Rule-Based Further Assessment (Educational Illustration)

## Scope and separation

This feature is a deterministic prototype communication demonstration. It is NOT a validated clinical protocol, referral order, triage system, diagnosis, prescribed follow-up schedule, or treatment advice.

- The live Results panel uses the current **illustrative** ten-year probability and the full-precision category. It shows proposed actions at **risk >= 0.10**: High (10%-<20%) and Very High (>=20%). Exact 10% is High and 20% is Very High.
- Below 10% the panel explains that no *additional category-based illustration* was triggered. Separate condition-based education continues. No lack of medical need is implied.
- Missing/inconsistent probability, wrong category, non-illustrative model version, missing/unverified inputs, or prior-CVD exclusion refuse prototype guidance.
- ModelStatus retains the current clinically unvalidated warning. The 10% rule is **not a validated referral threshold**.
- Existing clinically reviewed further-assessment messages remain gated behind independent validated-model and clinical-rule-review evidence. The provisional Framingham CIG does not drive this feature. Annual CIF markers, arithmetic contribution bars, and general educational BP red-flag checks are independent.

## Rules

Rule engine: src/services/prototypeFollowUp.ts, version PROTOTYPE-FOLLOWUP-1.0.

1. High (10%-<20%): Consider discussing a clinician-led cardiovascular risk review, without automatic scheduling or triage.
2. Very High (>=20%): Illustrate a more comprehensive clinician-led review, with no mandatory time window.
3. SBP >=140 or DBP >=90: Repeat and document BP measurements, consider qualified professional review. SBP >=130 or DBP >=80 below that level prompts monitoring discussion.
4. Current smoking: Offer cessation education and accessible support options.
5. Reported diabetes history: Suggest bringing records to a qualified professional.
6. BP medication use: Review recorded medication/adherence with prescriber; never change a dose based on this tool.
7. BMI >=25: Discuss realistic nutrition and activity habits without diagnosis.
8. Activity <150 minutes/week in extended mode: Discuss gradual suitable activity.
9. Frequent salt or processed foods: Discuss sodium awareness and practical reduction.
10. Fruit and vegetable intake <3 servings/day: Discuss accessible choices.
11. Alcohol >0 drinks/week: Discuss patterns and reduction opportunities, not drinking for health.
12. Family CVD history: Clarify affected relatives and ages.

All triggered actions include their actual observed finding and a specific non-prescriptive consideration. Unknown optional values do not create invented observations. General Educational Guidance deliberately remains independent, so some topics may overlap; the new section illustrates how the proposed risk grouping could organize a follow-up discussion.

## Saved results

New eligible illustrative assessments with risk >=10% save a deep copy of the original demonstration follow-up to their immutable history record: risk, band, model version, rule version, introduction and rule texts. Historical records without this content do not acquire new advice retroactively. Existing clinical approval flags are never set. Both source and stored results are validated against full-precision risk and category to avoid mixing model versions or patient results.

## Verification and limitations

Run npm run check, npm run build, npm run test:e2e, npm run verify:production. Unit and browser tests check thresholds, factor triggers, absent input behavior, UI accessibility/responsiveness, saved snapshot preservation, and independent medical-safety education.

The algorithm is NOT a validated clinical prediction model, and the threshold has not been approved for population-specific referral decisions. A future approved PURE model needs calibration, endpoint and predictor verification, clinician review, and institutional authorization before enabling actual clinical decision support.
