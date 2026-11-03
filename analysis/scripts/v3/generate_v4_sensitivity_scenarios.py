"""Simulation only; no outcome conditioning; reproducible; never overwrites frozen files."""
import csv,random,math,statistics,json
from pathlib import Path
root=Path(__file__).resolve().parents[3]
seed=int(__import__('sys').argv[1]) if len(__import__('sys').argv)>1 else 20261030
src=root/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv'
dst=root/f'data/processed/pintig_experimental_v4_scenario_{seed}.csv'
report=root/f'analysis/reports/v3/PINTIG_V4_SIMULATION_METHOD_{seed}.md'
import sys
seed=int(sys.argv[1]) if len(sys.argv)>1 else 20261030
random.seed(seed)
def num(r,k,default=0):
 try:return float(r[k])
 except:return default
def logistic(x):return 1/(1+math.exp(-max(-20,min(20,x))))
def bern(p):return int(random.random()<p)
with src.open(newline='',encoding='utf-8-sig') as f:
 rr=csv.DictReader(f);base=list(rr.fieldnames);rows=list(rr)
assert len(rows)==4191 and len({r['participant_id'] for r in rows})==4191
new=['smoking_pack_years','urban_rural_residence','sitting_minutes_day','heavy_episodic_alcohol','former_smoker','lipid_lowering_medication','hip_circumference_cm','diabetes_medication','psychosocial_stress','sleep_duration_hours']
for r in rows:
 age=num(r,'age_years');male=num(r,'sex_male');smoke=num(r,'current_smoker');cpd=max(0,num(r,'cigarettes_per_day'));diab=num(r,'diabetes');sbp=num(r,'sbp_mmhg',120);waist=num(r,'waist_cm',90);alc=num(r,'alcohol_drinks_week');activity=num(r,'activity_min_week');ses=num(r,'ses_index_0_100',50)
 # ALL NEW FIELDS ARE SIMULATED from baseline features and independent random variation. Coefficients illustrative, not estimated epidemiological effect sizes.
 former=0 if smoke else bern(logistic(-1.2+0.025*(age-50)+0.25*male))
 smoked_years=max(1,min(age-12,round(random.gauss(max(3,(age-18)*0.45),6)))) if smoke or former else 0
 historic_cpd=cpd if smoke else max(0,random.gauss(11,7)) if former else 0
 pack=round(historic_cpd*smoked_years/20,2)
 urban=bern(logistic(0.25+0.015*(ses-50)))
 sitting=max(60,min(960,round(random.gauss(490-0.25*activity+35*urban,105))))
 binge=bern(logistic(-3.2+0.16*alc+0.28*male)) if alc>0 else 0
 lipid=bern(logistic(-2.9+0.04*(age-50)+0.014*(sbp-120)+0.65*diab))
 hip=round(max(waist+2,random.gauss(waist+13-2*male,6)),1)
 dbmed=bern(logistic(0.4+0.02*(age-50))) if diab else 0
 stress=bern(logistic(-0.45-0.01*(ses-50)))
 sleep=round(max(3.5,min(10.5,random.gauss(7.1-0.24*stress-0.05*urban,1.0))),1)
 vals=[pack,urban,sitting,binge,former,lipid,hip,dbmed,stress,sleep]
 for n,v in zip(new,vals):r[n]=v
with dst.open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=base+new);w.writeheader();w.writerows(rows)
assert all(r['event_type'] in ('0','1','2') for r in rows)
with src.open(newline='',encoding='utf-8-sig') as f:
 originals=list(csv.DictReader(f))
assert all(all(x[k]==y[k] for k in base) for x,y in zip(rows,originals))
text="""# PINTIG V4: SYNTHETIC SIMULATION ONLY
All 10 new fields in the corresponding CSV are **generated**, not observed, imputed, clinically validated or attributable to actual Framingham/PURE participants.
Random seed: {seed}. Generator: analysis/scripts/v3/generate_v4_simulation.py. No generation rule uses future CVD outcome, death, event time, or fold.
## Generator assumptions (illustrative; not estimated from study data)
- smoking_pack_years: estimated years smoking conditional on age and smoking status; cigarette rate based on current cigarettes/day where available; artificial smoking duration.
- urban_rural_residence: random binary urban indicator weakly associated with preexisting synthetic SES; 1 urban, 0 rural; foreign Framingham geography is **not** inferred.
- sitting_minutes_day: plausible bounded daily minutes conditioned on synthetic activity and simulated urban class; not an actual IPAQ response.
- heavy_episodic_alcohol: illustrative binary episode proxy conditional on synthetic drinks/week; NOT a validated 5+ drinks/day response.
- former_smoker: synthetic among current non-smokers conditional on age and sex.
- lipid_lowering_medication: illustrative treatment probability conditional on baseline age, SBP, diabetes.
- hip_circumference_cm: illustrative hip measurement conditional on *synthetic* waist and sex; not observed.
- diabetes_medication: synthetic treatment indicator, zero for non-diabetes, probability otherwise.
- psychosocial_stress: binary illustrative construct associated with synthetic SES, not PURE multilevel stress score.
- sleep_duration_hours: bounded simulated duration conditional on simulated stress; not observed bedtime/waketime.
All coefficients, distributions and bounds are engineering simulation assumptions, not epidemiological effect sizes or validated clinical score cutoffs. These values MUST NOT be used to infer clinical predictor utility, patient risk, or deploy a 26-feature model.
## Data integrity
The original 22 columns (16 predictors, event/followup keys and fold) are copied byte-for-byte at the value level. Existing six synthetic predictors remain synthetic. This file is separate from frozen v3.
## Appropriate use
Pipeline testing, model robustness / negative-control simulations, sensitivity to arbitrary data-generating assumptions. Not clinical validation or predictor selection in PURE. Future PURE 35-70 data require exact source instrument and codebook. IPAQ Long Form is validated mainly ages 15-69.
## Essential caveat
Because the added values are generated from baseline features and independent draws, they contain no independently measured information on outcomes. A predictive improvement would be stochastic or simulator-dependent. Repeat across simulation seeds/scenarios before interpreting any apparent change.
Source: TRIPOD+AI 2024 https://pmc.ncbi.nlm.nih.gov/articles/PMC11019967/
"""
report.write_text(text,encoding='utf-8')
print(json.dumps({'rows':len(rows),'added_predictors':len(new),'path':str(dst),'event_counts':{s:sum(r['event_type']==s for r in rows) for s in ['0','1','2']}},indent=2))


