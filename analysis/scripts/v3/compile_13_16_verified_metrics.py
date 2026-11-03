from pathlib import Path
import csv,json
root=Path(__file__).resolve().parents[3]
d=root/'analysis/results/v3'
report=root/'analysis/reports/v3/PINTIG_VERIFIED_13_16_METRIC_COVERAGE.csv'
with (d/'RSF_14_15_16_COMPARISON.csv').open(newline='') as f:
 metrics={int(r['predictor_count']):r for r in csv.DictReader(f)}
with (d/'V2_VS_V3_MODEL_COMPARISON.csv').open(newline='') as f:
 old=next(r for r in csv.DictReader(f) if r['model']=='RSF')
output=[]
for n in [13,14,15,16]:
 r=metrics.get(n)
 output.append({'predictors':n,'auc_10y':r['AUC'] if r else old['v2_AUC'],
 'brier_10y':r['Brier'] if r else old['v2_Brier'],
 'ibs_0_10y':old['v2_IBS'] if n==13 else old['v3_IBS'] if n==16 else 'NOT_COMPUTED',
 'calibration_slope':r['calibration_slope'] if r else old['v2_calibration_slope'],
 'calibration_in_the_large_cloglog':old['v2_CITL_cloglog'] if n==13 else old['v3_CITL_cloglog'] if n==16 else 'NOT_COMPUTED',
 'concordance':old['v2_concordance'] if n==13 else old['v3_concordance'] if n==16 else 'NOT_COMPUTED',
 'source':'existing experiments; mixed configurations, not a new fair 4-way selection',
 'qualification':'SIX SYNTHETIC PREDICTORS PRESENT; NOT CLINICALLY VALIDATED'})
with report.open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=output[0]);w.writeheader();w.writerows(output)
print(report);print(json.dumps(output,indent=2))
