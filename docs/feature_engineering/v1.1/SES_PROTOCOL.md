# PINTIG SES adaptation 1.1 (2026-11-03)

This addendum supersedes only the education-only SES method in v1.0. Other features remain as documented there. Source: supplied Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF pages 5-6, printed SA01-SA02. Employment, education and occupation wording are retained. The requested subset is not the complete original instrument: marital status, ethnicity and US medical-insurance questions are not added. The occupation coding sheet is unavailable; preserve write-in responses without inventing codes. Employment and occupation are descriptive, not scored. No employment-based skip is introduced because SA01-SA02 does not specify one.

## Income adaptation and normalization

Original SA02 stem: Please select which income group best represents your combined family income for the past 12 months.
Original options: 1=under $12,000; 2=$12,000-$24,999; 3=$25,000-$49,999; 4=$50,000-$74,999; 5=$75,000-$100,000; 6=over $100,000; 99=prefer not to answer.
These US brackets are documented only, never applied or currency-converted in the Philippine form.

Pinned historical reference: PSA 2023 monthly national poverty threshold PHP13,873 for five people, published August 2024:
https://psa.gov.ph/content/11-out-18-regions-recorded-significant-decreases-poverty-incidence-2023
Annual five-person reference B=13873*12=PHP166476. It is a fixed experimental anchor, not a current 2026 poverty line or official SES scale. No regional or inflation adjustment is made.

Philippine annual combined-family-income bands:
0: explicitly no income -> representative 0
1: above 0 to below 166476 -> representative 83238 (0.5B)
2: 166476 to below 332952 -> representative 249714 (1.5B)
3: 332952 to below 665904 -> representative 499428 (3B)
4: 665904 to below 1331808 -> representative 998856 (6B)
5: 1331808 or more -> representative 1331808 (8B; lower-bound top coding)
98: unknown -> missing
99: prefer not to answer -> missing
These bands, midpoints, explicit zero/unknown choices, and top coding are PINTIG adaptations, not Framingham or PSA categories. Category representatives are assumption-derived estimates, not observed exact income.

Let N be the positive integer number of people supported by that income. Use the same family-income/support population; do not silently substitute address household size. UI upper bound 100 is a provisional plausibility limit.
Income component I=100*min(1,(representative annual income/N)/(8*B/5)).
The reference cap is PHP266361.60 per supported person per year. Per-person normalization addresses family size but ignores economies of scale; the eightfold cap is an unvalidated PINTIG design choice.
Education E=100*code/8 for original codes 0..8. Code order treated as equally spaced is a PINTIG assumption, not an interval scale established by Framingham.
SES=0.5*E+0.5*I. Equal weights are PINTIG assumptions, not learned weights.
Do not round stored scores; round display only.

Any missing, invalid or refused education, income group or supported-person count -> SES null. Never renormalize weights around missing components. Explicit no schooling and explicit no income can legitimately score zero. Employment/occupation missingness does not block SES. Unknown/refusal remains recorded. Do not infer employment from IPAQ or vice versa.

Example: bachelor code7 -> E87.5; band3 income499428 and N5 -> I37.5 -> SES62.5.
Same band and N10 -> I18.75 -> SES53.125.
Education code0, explicit income0 and N1 -> SES0.
Bachelor plus refused income -> unavailable, not 43.75.

## Preservation and limitations

Raw answers, band code, supported count and protocol version are retained with saved assessments. New records carry PINTIG-FE-1.1; existing records and calculated snapshots are not recomputed. Removed PURE education remains available to display historical answers.
Dataset SHA256 before changes: 86dd7dca93582e9a8d67cabead1e94406e973b3e0aa9cf9febde7b8804f4ec5c.
No raw/frozen/synthetic datasets, outcomes, models or historical experiment outputs are modified.
SES is assumption-derived and provisional. The synthetic SES feature is not equivalent in meaning or distribution. A compatible trained and validated model remains required; prediction stays blocked.
Residence remains independently encoded as urban_rural_residence using recorded classification provenance.
Sensitivity to weights, education coding, reference year, band representatives, cap and family size needs research validation before model use.
