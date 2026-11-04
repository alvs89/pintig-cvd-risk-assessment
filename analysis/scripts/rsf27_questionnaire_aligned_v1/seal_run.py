"""Seal immutable inputs before evaluation; run only after training is complete."""
from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3'
FILES=[
 'data/processed/questionnaire_27_questionnaire_aligned_20261103_v1/pintig_framingham_27predictors_QUESTIONNAIRE_ALIGNED_PROXY_EXPERIMENTAL.csv',
 'analysis/modeling/v3_16predictors/v3_inner_fold_assignments.csv',
 'analysis/scripts/rsf27_questionnaire_aligned_v1/train.R',
 'analysis/scripts/rsf27_questionnaire_aligned_v1/reference.R',
 'analysis/scripts/rsf27_questionnaire_aligned_v1/evaluate.py',
]
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
if (OUT/'protected_sha256.json').exists(): raise FileExistsError('Run is already sealed')
(OUT/'protected_sha256.json').write_text(json.dumps({p:digest(ROOT/p) for p in FILES},indent=2))
print('SEALED')
