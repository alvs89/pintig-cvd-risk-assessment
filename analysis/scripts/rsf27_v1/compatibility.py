"""Join existing dictionaries; no clinical or synthetic-data transformations."""
from pathlib import Path
import json
import pandas as pd
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'analysis/results/rsf27_proxy_20261103_v1'
a=pd.read_csv(ROOT/'docs/feature_engineering/v1.3/data_dictionary.csv')
b=pd.read_csv(ROOT/'analysis/reports/questionnaire_27_engineered_20261103_v1/data_dictionary.csv')
joined=a.merge(b.loc[b.role.eq('predictor')],left_on='feature',right_on='column',validate='one_to_one')
assert len(joined)==27
joined['release_status']='Unvalidated transportability; matching names/ranges are insufficient'
for feature,reason in {
 'ses_index_0_100':'BLOCKED: live score unavailable; synthetic score has no observed questionnaire reference',
 'diet_score_0_100':'BLOCKED: arbitrary synthetic index vs Food6 questionnaire calculation',
 'passive_smoking_adult_years':'BLOCKED: simulated interval union vs questionnaire maximum-domain lower bound',
 'sleep_duration_hours':'CLARIFY: source is typical-day sleep, not specifically nighttime; synthetic sleep remains unvalidated',
 'activity_min_week':'MISMATCH: generated minutes vs IPAQ cleaning/capping and age scope',
 'family_history_cvd':'MISMATCH: undefined synthetic history vs CHD/stroke relative composite',
 'hypertension_history':'MISMATCH: raw PREVHYP ascertainment vs self-reported diagnosis',
 'diabetes':'MISMATCH: raw DIABETES ascertainment vs self-reported diagnosis',
}.items(): joined.loc[joined.feature.eq(feature),'release_status']=reason
joined.to_csv(OUT/'compatibility.csv',index=False)
assert not (OUT/'COMMANDS.md').exists()
(OUT/'COMMANDS.md').write_text('''# Reproduction commands (PowerShell, repository root)

1. `python analysis/scripts/rsf27_v1/prepare.py`
2. `python analysis/scripts/rsf27_v1/compatibility.py`
3. `python -m unittest discover -s analysis/scripts/v4_corrected -p test_metrics.py`
4. `& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/rsf27_v1/test_preprocessing.R`
5. `& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/rsf27_v1/train.R`
6. `& 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe' analysis/scripts/rsf27_v1/reference.R`
7. `python analysis/scripts/rsf27_v1/evaluate.py`
8. `npm run check`
9. `npm run build`

Preparation refuses an existing run directory. Use a new version for a fresh run.
Training can resume completed outer folds in this version; no old experiment is overwritten.
Evaluation and R-reference scripts refuse existing metric outputs. Partial evaluation
must be investigated before retrying; do not delete or overwrite historical results.

Initial audit also executed `python analysis/scripts/reconstruction_26/engineer_27.py --verify`.
It failed at the final historical broad checksum assertion due to nine subsequently edited
frontend files. The new prepare.py independently verifies all predictor engineering,
source measurements, outcomes, folds and non-frontend historical checksums.
An initial R package probe through inline -e failed due to PowerShell argument quoting;
the file-based scripts avoid that issue and record installed package versions.

Metrics: https://www.randomforestsrc.org/articles/competing.html
Reference scoring: https://CRAN.R-project.org/package=riskRegression
''',encoding='utf-8')
print('27_FEATURE_COMPATIBILITY_REVIEW_COMPLETE: deployment blocked')
