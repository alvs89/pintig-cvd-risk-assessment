"""Independent per-participant alternative to the established v4 generator.

Same formulas, bounds and logical constraints; baseline dependence halved,
continuous noise multiplied by 1.25. Constants remain illustrative assumptions.
No cohort estimates, donor records, outcomes, or fold membership are used.
"""
import random, math, json
import pandas as pd
import numpy as np
from prepare import ROOT, OUT, digest

def generate(base,seed):
    rng=random.Random(seed);a=.5;noise=1.25;d=base.copy();new=[]
    def logistic(x):return 1/(1+math.exp(-max(-20,min(20,x))))
    def bern(x):return int(rng.random()<logistic(x))
    for r in base.to_dict('records'):
        def num(k,default=0):return default if pd.isna(r[k]) else float(r[k])
        age=num('age_years');male=num('sex_male');smoke=num('current_smoker');cpd=max(0,num('cigarettes_per_day'));diab=num('diabetes');sbp=num('sbp_mmhg',120);waist=num('waist_cm',90);alc=num('alcohol_drinks_week');activity=num('activity_min_week');ses=num('ses_index_0_100',50)
        former=0 if smoke else bern(-1.2+a*(.025*(age-50)+.25*male))
        years=max(1,min(age-12,round(rng.gauss(max(3,(age-18)*.45),6*noise)))) if smoke or former else 0
        historic=cpd if smoke else max(0,rng.gauss(11,7*noise)) if former else 0
        pack=round(historic*years/20,2)
        urban=bern(.25+a*.015*(ses-50))
        sitting=max(60,min(960,round(rng.gauss(490+a*(-.25*activity+35*urban),105*noise))))
        binge=bern(-3.2+a*(.16*alc+.28*male)) if alc>0 else 0
        lipid=bern(-2.9+a*(.04*(age-50)+.014*(sbp-120)+.65*diab))
        hip=round(max(waist+2,rng.gauss(waist+13-a*2*male,6*noise)),1)
        dbmed=bern(.4+a*.02*(age-50)) if diab else 0
        stress=bern(-.45-a*.01*(ses-50))
        sleep=round(max(3.5,min(10.5,rng.gauss(7.1+a*(-.24*stress-.05*urban),noise))),1)
        new.append([pack,urban,sitting,binge,former,lipid,hip,dbmed,stress,sleep])
    cfg=json.loads((OUT/'configurations.json').read_text());added=[c for c in cfg['n26'] if c not in cfg['n16']]
    d[added]=new
    return d,added

def main():
    base=pd.read_csv(ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv')
    checks=[]
    for seed in [20261031,20261101]:
        d,added=generate(base,seed)
        for c in base:np.testing.assert_array_equal(d[c],base[c])
        assert d.participant_id.is_unique and d[added].notna().all().all()
        assert ((d.current_smoker!=1)|(d.former_smoker==0)).all()
        assert ((d.diabetes!=0)|(d.diabetes_medication==0)).all()
        assert (d.hip_circumference_cm>=d.waist_cm+2-1e-8).all()
        p=OUT/'scenarios'/f'seed{seed}_weakdependence.csv'
        if p.exists():raise ValueError('Refuse overwrite')
        d.to_csv(p,index=False)
        checks.append({'scenario':p.stem,'seed':seed,'participants':len(d),'output_sha256':digest(p),'preserved_base_missingness_outcomes_folds':'PASS','synthetic_fields':added,'assumptions':'dependency coefficients x0.5; continuous noise SD x1.25; no donor data','generator':'weak_scenarios.py'})
    (OUT/'weak_scenario_validation.json').write_text(json.dumps(checks,indent=2))
    print('Two independent per-participant weak-dependence scenarios validated.')

if __name__=='__main__':main()
