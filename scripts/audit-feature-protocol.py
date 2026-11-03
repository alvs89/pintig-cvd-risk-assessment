"""Read-only identity and contents audit for the frozen protocol-v1 dataset/PDFs."""
from pathlib import Path
import argparse, csv, hashlib, json

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data/processed/questionnaire_27_engineered_20261103_v1/pintig_framingham_27predictors_ENGINEERED_PROXY_EXPERIMENTAL.csv'
EXPECTED_DATA_SHA256='86dd7dca93582e9a8d67cabead1e94406e973b3e0aa9cf9febde7b8804f4ec5c'
OUT=ROOT/'docs/feature_engineering/v1.0'
META=['participant_id','analysis_time_days','event_type','event_major_cvd_10y','event_competing_death_10y','outer_fold']
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--sources',type=Path,default=Path.home()/'Downloads');args=ap.parse_args()
    review=json.loads((ROOT/'docs/assessment27/source_review.json').read_text(encoding='utf-8'))
    bad=[]
    for x in review:
        p=args.sources/x['filename']
        if not p.exists() or sha(p)!=x['sha256']:bad.append(x['filename'])
    if bad:raise SystemExit(f'Source file missing or checksum changed: {bad}')
    digest=sha(DATA)
    if digest!=EXPECTED_DATA_SHA256:raise SystemExit('Frozen experimental CSV checksum changed; refusing to rebaseline v1.0.')
    with DATA.open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);columns=reader.fieldnames;rows=list(reader)
    mapping=list(csv.DictReader((OUT/'data_dictionary.csv').open(encoding='utf-8-sig',newline='')))
    predictors=[r['feature_name'] for r in mapping]
    if len(predictors)!=27 or columns!=predictors+META:raise SystemExit('Unexpected 27-predictor plus six metadata schema.')
    ids=[r['participant_id'] for r in rows]
    if len(rows)!=4191 or len(set(ids))!=len(rows):raise SystemExit('Unexpected participant count or duplicate IDs.')
    events={str(i):sum(r['event_type']==str(i) for r in rows) for i in (0,1,2)}
    if events!={'0':3604,'1':369,'2':218}:raise SystemExit(f'Outcome counts differ: {events}')
    folds={str(i):sum(r['outer_fold']==str(i) for r in rows) for i in range(1,6)}
    if set(folds.values())!={838,839}:raise SystemExit(f'Unexpected fold counts: {folds}')
    if any(not r['analysis_time_days'] or not r['event_type'] for r in rows):raise SystemExit('Missing historical proxy outcome.')
    features={}
    for name in predictors:
        values=[r[name] for r in rows if r[name] not in ('','NA','nan')]
        try: stats={'min':min(map(float,values)),'max':max(map(float,values))}
        except ValueError: stats={'categories':sorted(set(values))}
        features[name]={'missing':len(rows)-len(values),**stats}
    result={'path':DATA.relative_to(ROOT).as_posix(),'sha256':digest,'participants':len(rows),'unique_participants':len(set(ids)),'columns':len(columns),'predictors':len(predictors),'event_counts':events,'outer_fold_counts':folds,'features':features,'note':'Observed synthetic dataset distributions are descriptive only; matching ranges do not establish statistical equivalence.'}
    (OUT/'dataset_review.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    (OUT/'source_review.json').write_text(json.dumps(review,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','source_files_verified':len(review),**{k:result[k] for k in ['sha256','participants','columns','event_counts','outer_fold_counts']}},indent=2))
if __name__=='__main__':main()
