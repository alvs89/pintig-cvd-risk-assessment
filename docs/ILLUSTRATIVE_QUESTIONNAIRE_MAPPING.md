# Questionnaire to illustrative assessment mapping v1

The default Calculate risk action projects questionnaire responses into the unchanged ILLUSTRATIVE-0.2 calculation. It opens the existing Results view, with existing probability chart, factor contributions, categories, educational guidance and save/history workflow. It does not use the experimental RSF probability.

| Original input | Source / transformation |
| --- | --- |
| Age and sex | Selected patient profile |
| SBP and DBP | Existing questionnaire measurement derivation; original calculator ranges enforced |
| BMI | Measured height (110–220 cm) and weight (25–250 kg) collected in the measurements section. BMI = kg / (cm / 100)², rounded to one decimal as in the original workflow; accepted BMI 12–65 kg/m². Review displays BMI read-only; blank or invalid measurements block calculation. Never inferred from waist or hip |
| Current smoking | Derived Current → Yes; Never/Former → No; unknown blocks calculation |
| BP medication | Source 0 → No, 1 → Yes, 2 → Past; unknown blocks calculation |
| Weekly activity | Existing IPAQ minutes, rounded to whole minutes; missing stays blank |
| Weekly drinks | Sum beverage quantities × daily 7, weekly 1, monthly 12/52, rounded to one decimal; not grams of ethanol. Former/never → zero |
| Family history | Existing binary derivation; unavailable stays blank |
| Education | Framingham code 0 → No formal education, 1 → Primary, 2–8 → Other; refused/unanswered stays blank. This crosswalk only preserves the old low-education term, not an SES index |

The extended illustrative mode uses available mapped lifestyle inputs. Questionnaire and historical intake definitions are not statistically interchangeable; identical predictor names do not guarantee identical results. Missing optional modifiers remain blank under the existing formula. No diet-score-to-servings conversion is invented. The 27-feature dataset, trained models, coefficients, thresholds and historical results remain unchanged.

Raw questionnaire answers and supplementary height/weight measurements are retained as a separate intake when calculating; the saved result contains height, weight and derived BMI. These supporting measurements do not change the 27-feature experimental dataset. The optional research estimate is collapsed and remains separate. An illustrative scalar probability does not generate an invented cumulative-incidence curve.
