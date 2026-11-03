# Assessment27 source decisions (before implementation)

All13 supplied files are inventoried in source_review.json with hashes, page counts and purposes.
PURE.pdf is byte-identical to pone.0271169.s001.pdf; Physical Activity.pdf is byte-identical to scoring_protocol.pdf.
They represent11 distinct documents. Source references below are physical PDF pages, not inferred page numbers.
PURE means the South African form. Gen3 means Gen-3-Exam-1.pdf (the local filename lacks `(1)`).
No real questionnaire response will be filled using the synthetic research dataset.

| Feature | Source item / measurement | Encoding / calculation | Compatibility decision |
|---|---|---|---|
| age_years | PURE p3 Q4 DOB or age; existing patient DOB | Completed years at assessment,35-70 screening | Observed profile; snapshot age |
| sex_male | PURE p3 Q5 Female/Male | Female0, Male1, unsupported/unknown null | Observed profile |
| ses_index_0_100 | Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf p5 SA01 education; p6 SA02 family income and supported people; PHP options adapted by PINTIG | PINTIG-FE-1.1: 0.5 education + 0.5 per-person income index; fixed 2023 anchor; see ../feature_engineering/v1.1/SES_PROTOCOL.md | Missing/refused/invalid inputs => null; assumption-derived; not equivalent to synthetic SES |
| urban_rural_residence | Explicit PSA barangay classification record; not in supplied questionnaire PDFs | rural=0, urban=1 only with classification source, reference year and geographic code | Null without provenance; no inference from address |
| waist_cm | PURE p35 Q41(c), two readings, cm, clothing; refusal0 per p34 | Mean of valid pair is proposed PINTIG adaptation; refusal not zero circumference | Raw pair preserved; placement manual missing |
| hip_circumference_cm | PURE p35 Q41(e), two readings, cm, clothing | Mean of valid pair, same explicit adaptation | Raw pair preserved; placement manual missing |
| sbp_mmhg | PURE p35 Q41(a), seated right-arm BP #1/#2 | Mean valid systolic readings, mmHg; provisional aggregation | Raw pair; no claim identical source-cohort measurement protocol |
| dbp_mmhg | Same, diastolic | Mean valid diastolic readings, mmHg | Same |
| heart_rate_bpm | PURE p35 Q41(b), #1/#2 | Mean valid pair, beats/min | Cannot claim source specifies resting preparation; manual missing |
| hypertension_history | PURE PDF viewer p9 (printed p4), Q17 shared stem “Have you ever been diagnosed with any of the following? (check all that apply)”; row b) “Hypertension/high blood pressure”; No/Yes and “# of yrs since diagnosis” columns | No0/Yes1; blank null | One shared source stem with condition rows; not a separate repeated prompt. Self-report diagnosis not identical to historical PREVHYP ascertainment |
| bp_medication | Gen3 p23 MD02 hypertension medicine |0=no/2=past =>0;1=current=>1;9=>null | Preserve original0/1/2/9 and follow-ups |
| diabetes | PURE p9 Q17(a) diagnosis, No/Yes; duration omitted | No0/Yes1; blank null | Self-report not identical to glucose/treatment-based DIABETES |
| diabetes_medication | Gen3 p23 MD02 high blood sugar/diabetes medicine | Same current-use encoding; age started, insulin, pregnancy-only preserved | No clinical assumptions from diabetes response |
| lipid_lowering_medication | Gen3 p23 MD02 high blood cholesterol medicine | Same current-use encoding | Observed response, unlike synthetic training feature |
| family_history_cvd | PURE p33 Q40(a,b), all parents/siblings, CHD and stroke rows | Any Yes=>1, all applicable No=>0; unknown=>null; explicit composite adaptation | Not validated against undefined legacy synthetic family history |
| alcohol_ethanol_g_week | PURE p19 Q28(a-c), all beverage types, frequency, average quantity, fixed reference sizes | Sum drinks/frequency converted to weekly x reference mL x assumed ABV x0.789 | Assumption-derived only; no measured ABV item in source, incompatible clinical validation pending |
| heavy_episodic_alcohol | PURE p19 Q28(d): at least monthly >5 drinks/day | No0/Yes1; blank null; episode count/quantity omitted from new intake | Genuine item differs from legacy arbitrary Bernoulli proxy |
| smoking_status | Gen3 p28 MD07 ever regular/current | Ever No=>Never; everYes/currentYes=>Current; everYes/currentNo=>Former;9=>null | Full raw history; no synthetic former status |
| smoking_pack_years | Gen3 p28 lifetime average/day, start/stop ages, stopped>6mo, total stoppedyears | average/day /20 x (stop or baseline age-start-total stoppedyears) | Derived; require complete coherent chronology;99=>null |
| current_smoking_intensity_cigs_day | Gen3 p28 current/day | Current: recorded value; noncurrent0; unknown null | No imputation during intake |
| passive_smoking_childhood | Gen3 p29 MD08 childhood home question |0/1/9; childhood follow-ups omitted from new intake | Direct response; no invented ages |
| passive_smoking_adult_years | Gen3 p29 home/work/other, domain years |0 if all absent; maximum domain duration as lower bound; retain lower/upper bounds | Exact union needs unavailable interval timing; max-domain conservative estimator is used |
| activity_min_week | IPAQ Long p2-6 Q1-25 | IPAQ 10-minute recode, 180-min/day cap; activity minutes and MET-min separately calculated per protocol v1.0 | Synthetic minutes are not assumed equivalent to IPAQ minutes |
| sitting_minutes_day | IPAQ p6 Q26/27; scoring p9 | (weekday minutes x5 + weekend minutes x2)/7, excluding transport | Derived; age70 outside instrument15-69 scope, flag |
| diet_score_0_100 | Willett FFQ + manual + JAH3 article | PINTIG Food6 six-component AHEI-inspired adaptation, equation in protocol v1.0 | Incomplete source-food set => null; not complete AHEI/DASH/MDS and not validated |
| psychosocial_stress | PURE p25 Q35(a,b), original five categories; work N/A | Either Several/Permanent=>1; all applicable Never/Some=>0; otherwise null | Explicit binary PINTIG adaptation, not source-validated score |
| sleep_duration_hours | Gen3 p10 TECH05 extracted sleep item | Direct typical-day hours; 0-24 range; no whole-day total requirement | Not hours/night; do not relabel |

## Implementation contract
Use a separate versioned intake schema with complete raw responses, field-level source identity,
applicability and validation status, derived27-key feature object, transformation assumptions and eligibility snapshot.
Changed gates hide/disable follow-ups without discarding earlier raw responses; inactive answers never affect derivation.
Blank, refusal, source unknown codes and not-applicable remain distinct. Draft/incomplete intake may be saved without risk.
Model status is blocked independently of whether every value is complete. No legacy illustrative or research prediction
call may accept this schema. No risk bands, clinical thresholds or trained models will change.

There is no patient backend/database in this checkout. Session intake storage and its export contract are the implementation
boundary; document the future API/database schema, do not claim persistence or server authorization exists.
Full validated27-feature compatibility is not achievable from these sources: notably diet, SES, geographic classification,
activity contract and overlapping passive-exposure duration. Save responses and show missing features honestly.

Current intake uses PINTIG-FE-1.2. See STREAMLINING_1.2.md for the approved 31-field removal manifest and abbreviated-instrument limitations. IPAQ motorized-travel Q8/Q9 are omitted; the sitting exclusion for motor-vehicle time remains.
