# PINTIG SES reference protocol 1.3
Date: 2026-11-03. Status: construction protocol; no fitted or approved scoring artifact.
Supersedes SES1.1 equal-weight and ordinal-code calculations. SES1.2 retained SES1.1; neither is used for new scores. Previous documents and saved snapshots are historical artifacts.

## Source and assessment
Framingham Generation3 Examination1, supplied Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, viewer pages5-6, printed SA01-SA02. Preserve education codes0-9 and employment codes0-10 exactly. Code numbers are identifiers, not equally spaced education scores.
Core inputs: highest educational attainment (SA01), combined family income in the past12months (SA02), and number supported (SA02).
Employment is supplementary and current occupation is optional, unscored text. Longest-held occupation is retired from new intake; historical answers remain readable. No standardized occupation coding sheet is available.
Core means needed for future scoring, not mandatory disclosure: incomplete/refused responses can still be saved. Eligibility, 27-feature schema and residence classification remain separate and unchanged.

## Income observations and adaptation
The original source asks combined family income, not a defined household-disposable-income measure. Do not silently assume net income, shared residence, or a household-size definition. A suitable reference study must harmonize income coverage, taxes/transfers and the same supported-person population before the method is considered valid.
Retain the existing PINTIG annual Philippine-peso categories, not original dollar brackets:
0={0}; 1=(0,166476); 2=[166476,332952); 3=[332952,665904); 4=[665904,1331808); 5=[1331808,infinity); 98=unknown; 99=prefer not to answer.
Brackets use the prior documented fixed PSA2023 anchor; they are PINTIG categories, not official current income classes. Their continued collection does not endorse the old normalization cap. Original dollar options and anchor provenance remain in ../v1.1/SES_PROTOCOL.md.
Store the selected option and interval bounds with inclusivity. Null upper bound means unbounded, not missing income. A refusal or unknown gives a null interval. No midpoint, tail cap, inferred exact income or income-based SES is produced.

Candidate equivalization: interval [L/sqrt(N), U/sqrt(N)), respecting original boundary inclusion, where N is a positive integer count of people supported, 1..100 under the existing PINTIG plausibility rule. This is an experimental supported-person adaptation of square-root household equivalization, not verified equivalized disposable income. Explicit zero gives [0,0]. The top bracket stays open-ended. Examples: band3 and N4 -> [166476,332952) PHP/year-equivalent; top band and N4 -> [665904,infinity).
The executable function records these bounds as derived context only, not an additional predictor.

## Reference population and parameters: unavailable
Target reference: appropriately sampled observed Philippine adults aged35-70 and their aligned family economic information, with education, exact income or documented income intervals, supported-person counts, wave/region, survey weights and income price year. Include intended deployment socioeconomic coverage; assess transportability by age, sex, residence and region. No suitable participant-level reference dataset has been supplied or approved.
The 4191-row Framingham experimental dataset contains synthetic SES without corresponding observed inputs. It cannot identify these parameters. No PCA, scaler, imputer or reference CDF is fitted to it.
Current referenceId=null; education encoding parameters, income conditional distribution, centers/scales, loadings, orientation, CDF and validation approval are absent. Consequently ses_index_0_100=null for every new assessment, including complete responses. No 0,50 or fallback score is substituted.

## Proposed estimation and scoring, conditional on validation
1. Preregister reference population, income definition, reference price year, sampling weights and missingness policy. Resolve family/support versus household comparability. Use training participants only; freeze an independent external reference before validation, or estimate the complete transformation inside training folds in nested validation.
2. Encode education as categorical indicators; missing/refused categories are not zero vectors. Do not divide the original code by8 or assert equal spacing. Compare defensible category encodings and assess rare categories; an ordinal latent encoding needs separately estimated/documented parameters.
3. Harmonize actual income to the fixed reference-year PHP and compute x=income/sqrt(N). A candidate continuous transform is log1p(x); it is proposed, not validated. For bracket-only data, preserve interval censoring. A reference-fitted conditional income distribution or multiple-imputation model must explicitly handle zero and an open upper tail. Compare plausible tail models; no silent midpoint substitution. Without a validated conditional model, bracket-based scores remain unavailable.
4. Fit preprocessing and candidate PCA on observed reference participants only, without cardiovascular outcomes or future event times. Binary education indicators plus transformed income do not constitute an established DHS wealth index. PCA can overrepresent blocks, rare categories or coding variance. Examine alternative categorical methods and separate-feature approaches offline before selecting one. Employment/occupation are not forced into the core score.
5. A candidate accepted PCA artifact defines z_j=(g_j(response)-mu_j)/sigma_j and r=s*sum_j(w_j*z_j). Store the actual encoding, nonzero scales, loadings, sign s, explained variance, sampling weights and reference distribution. Sign must orient higher scores toward higher economic resources with prespecified external socioeconomic checks, not outcomes. If the component is incoherent or unstable, reject it rather than forcing a score.
6. For accepted complete point inputs, define the frozen weighted midrank percentile:
   F_ref(r)=sum_k v_k*[1(r_k<r)+0.5*1(r_k=r)]/sum_k v_k
   SES=100*F_ref(r).
   Scores lie in0..100; ties use the above explicit rule; out-of-reference values map to0 or100. This is reference-relative position, not absolute wealth or CVD risk.
7. For bracket inputs, a potential extension is the expected reference percentile over the validated conditional income distribution, with an uncertainty interval. Fix integration or simulation algorithm, random seed and tail assumptions in the artifact. This extension is not enabled until observed-data validation supports it; do not interpret its estimate as actual reported income.
8. Validate stability by bootstrap/refit, explained variance/loadings, sensitivity to category encoding, equivalization (per-capita versus square-root), income uncertainty, reference year, region and weights, and held-out construct validity. Do not accept a component just because it explains the most variance. Record criteria and results before release. Model-specific validation must then assess compatible preprocessing and performance/calibration in the intended cohort.

## Missingness and provenance
Blank, unknown, refusal, invalid education/income or nonpositive/noninteger/out-of-bounds N -> unavailable inputs. Zero schooling and zero income remain explicit observations, never equated with missing. Optional employment/occupation do not determine score completeness. Scoring is unavailable even with valid inputs because reference parameters are missing.
Raw answers are respondent-reported observations; income bounds are category-derived; equivalized bounds are derived under the stated assumption; any future conditional-income estimate must be labeled estimated/imputed. Historical dataset SES remains synthetic. No actual training data, participants, outcomes or model artifacts are changed.
New saves carry PINTIG-FE-1.3 and unavailable SES provenance; existing saved scores are not recomputed. Risk calculation remains blocked until a compatible model and transformation are validated.

## Methodological sources
OECD describes square-root household equivalization; that supports considering the scale, not validation for PINTIG's supported-person item:
https://www.oecd.org/content/dam/oecd/en/publications/reports/2013/06/oecd-framework-for-statistics-on-the-distribution-of-household-income-consumption-and-wealth_g1g2c4b5/9789264194830-en.pdf
DHS construction guidance uses categorical indicators for wealth-index PCA. Its asset-based index is not an education/income score that can be imported here:
https://dhsprogram.com/programming/wealth%20index/Steps_to_constructing_the_new_DHS_Wealth_Index.pdf
