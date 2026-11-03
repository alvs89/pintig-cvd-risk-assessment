"""PINTIG 26-candidate staging dataset. No unsupported patient data are invented."""
from pathlib import Path
import csv, json, hashlib, collections, datetime
ROOT=Path(__file__).resolve().parents[3]
src=ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv'
out=ROOT/'data/processed/pintig_experimental_v4_26candidate_STAGING_NOT_FOR_TRAINING.csv'
reports=ROOT/'analysis/reports/v3'
reports.mkdir(parents=True,exist_ok=True)
names=[
('smoking_pack_years','Framingham Gen3 Q smoking; PURE Q25','cigarettes/day x years/20','requires actual smoking duration; not observed'),
('urban_rural_residence','PURE household/community forms','categorical urban/rural','not present; cannot infer residence from Framingham identity'),
('sitting_minutes_day','IPAQ Long Q26/Q27','(5 weekday + 2 weekend sitting minutes)/7','no sitting responses; not part of activity MET score'),
('heavy_episodic_alcohol','PURE Adult Q28d','drinking-day threshold and frequency','no event frequency; weekly drinks inadequate'),
('former_smoker','PURE Q25; Framingham Gen3 smoking','ever-smoked but not currently smoking','CURSMOKE=0 does not distinguish never vs former'),
('lipid_lowering_medication','Framingham Offspring exam 10 medication section; PURE Q18','currently taking cholesterol lowering medication','not present in raw extract'),
('hip_circumference_cm','PURE anthropometry Q41','measured hip circumference in cm','no measured waist or hip in Framingham extract'),
('diabetes_medication','PURE Q18; Framingham exam history','currently taking diabetes medication','DIABETES is not medication status'),
('psychosocial_stress','PURE Adult Q35/Q36','validated stress component definition required','not present; no supported scalar scoring'),
('sleep_duration_hours','PURE Adult Q29','verified bedtime/wake time converted to hours','no reported sleep/wake timestamps')
]
with src.open(newline='',encoding='utf-8-sig') as f:
 reader=csv.DictReader(f); rows=list(reader); old=list(reader.fieldnames)
assert len(rows)==4191,(len(rows), 'unexpected cohort: halt to avoid incorrect export')
assert len({r['participant_id'] for r in rows})==len(rows),'duplicate participants'
assert len(old)==22,(len(old), 'unexpected frozen schema')
for row in rows:
 for name,*_ in names: row[name]=''
with out.open('w',newline='',encoding='utf-8') as f:
 writer=csv.DictWriter(f,fieldnames=old+[x[0] for x in names]);writer.writeheader();writer.writerows(rows)
manifest=reports/'PINTIG_V4_26_CANDIDATES_PROVENANCE.csv'
with manifest.open('w',newline='',encoding='utf-8') as f:
 w=csv.writer(f);w.writerow(['variable','source','derived_definition','availability','limitation','training_eligible'])
 for x in old:
  role='outcome_or_metadata' if x in ['participant_id','analysis_time_days','event_type','event_major_cvd_10y','event_competing_death_10y','outer_fold'] else ('preexisting_synthetic' if x in ['waist_cm','alcohol_drinks_week','activity_min_week','diet_score_0_100','ses_index_0_100','family_history_cvd'] else 'framingham_observed_or_preprocessed')
  w.writerow([x,'frozen v3 (inspect original pipeline for lineage)', '',role,'same values retained from frozen v3','see existing study limitations'])
 for n,source,definition,limitation in names:
  w.writerow([n,source,definition,'not_observed_not_imputed',limitation,'NO'])
with src.open('rb') as f: sha=hashlib.sha256(f.read()).hexdigest()
with out.open('rb') as f: outsha=hashlib.sha256(f.read()).hexdigest()
counts=collections.Counter(r['event_type'] for r in rows)
qa={'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':str(src),'source_sha256':sha,'output':str(out),'output_sha256':outsha,'participants':len(rows),'existing_predictors':16,'new_candidate_columns':10,'new_candidate_nonmissing_values':0,'event_type_counts':dict(counts),'row_values_preserved_for_existing_fields':True,'new_features_training_eligible':False,'note':'Staging schema only. Blank values are unknown, not healthy, negative, or imputed. No clinical or predictive validation.'}
assert all(all(r[n]=='' for n,*_ in names) for r in rows)
with (reports/'PINTIG_V4_26_CANDIDATES_QA.json').open('w',encoding='utf-8') as f: json.dump(qa,f,indent=2)
print(json.dumps(qa,indent=2))
