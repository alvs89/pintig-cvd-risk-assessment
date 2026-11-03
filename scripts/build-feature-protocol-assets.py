"""Build versioned dictionaries from the reviewed protocol table; never reads records."""
from pathlib import Path
import csv, json, re

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/feature_engineering/v1.0'
text=(OUT/'PROTOCOL.md').read_text(encoding='utf-8')
lines=[line for line in text.splitlines() if line.startswith('| `')]
rows=[]
for line in lines:
    cells=[x.strip() for x in line.strip('|').split('|')]
    name=re.match(r'`([^`]+)`',cells[0]).group(1)
    type_unit=cells[0][cells[0].find('(')+1:cells[0].rfind(')')]
    rows.append([name,cells[1],type_unit,cells[2],cells[3]])
assert len(rows)==27, len(rows)
for filename,header in [
 ('questionnaire_mapping.csv',['feature_name','questionnaire_source_and_original_item_or_measure','data_type_and_unit','equation_or_transformation','missing_validation_provenance_and_limitation']),
 ('data_dictionary.csv',['feature_name','data_type_and_unit','source_definition_and_encoding','equation_or_transformation','existing_synthetic_dataset_range_and_missingness_limitation','missingness_validation_provenance_and_limitation'])]:
    with (OUT/filename).open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.writer(f);w.writerow(header)
        if filename=='data_dictionary.csv':
            review=json.loads((OUT/'dataset_review.json').read_text(encoding='utf-8'))
            for name,source,unit,equation,missing in rows:
                stats=review['features'][name]
                observed='categories: '+', '.join(stats['categories']) if 'categories' in stats else f"observed synthetic range {stats['min']}..{stats['max']}"
                w.writerow([name,unit,source,equation,observed+f"; missing n={stats['missing']}",missing])
        else: w.writerows(rows)
questionnaire=json.loads((ROOT/'docs/assessment27/questionnaire_dictionary.json').read_text(encoding='utf-8'))
manifest={'protocol':'PINTIG Feature Engineering Protocol','version':'1.0','identifier':'PINTIG-FE-1.0','predictor_count':len(rows),'mapping_rows':len(rows),'items':len(questionnaire['questions']),'dataset_review':'dataset_review.json','source_review':'source_review.json','prediction_enabled':False,'synthetic_dataset_modified':False}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps(manifest))
