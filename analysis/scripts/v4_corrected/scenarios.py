"""Reuse existing independent draws; attenuate conditional associations as sensitivity.
All modified fields are already synthetic. No outcome/fold drives the generator.
"""
import json
import numpy as np
import pandas as pd
from prepare import ROOT, OUT, digest

def main():
    target=OUT/'scenarios';target.mkdir(exist_ok=True)
    base=pd.read_csv(ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv').sort_values('participant_id').reset_index(drop=True)
    cfg=json.loads((OUT/'configurations.json').read_text());added=[c for c in cfg['n26'] if c not in cfg['n16']]
    checks=[]
    for seed in [20261031,20261101]:
        src=ROOT/f'data/processed/pintig_experimental_v4_scenario_{seed}.csv'
        original=pd.read_csv(src).sort_values('participant_id').reset_index(drop=True)
        for regime in ['original','attenuated']:
            d=original.copy();rng=np.random.default_rng(seed)
            if regime=='attenuated':
                # Permute added blocks within age/sex/smoking/diabetes strata.
                # Preserves logical status constraints and within-block dependence,
                # weakens dependence on SBP and synthetic lifestyle/SES fields.
                strata=[(d.age_years//10),d.sex_male,d.current_smoker,d.diabetes]
                for _,ix in d.groupby(strata).groups.items():
                    ix=np.asarray(ix);donor=rng.permutation(ix)
                    d.loc[ix,added]=original.loc[donor,added].to_numpy()
                    gap=(original.loc[donor,'hip_circumference_cm']-original.loc[donor,'waist_cm']).to_numpy()
                    d.loc[ix,'hip_circumference_cm']=d.loc[ix,'waist_cm'].to_numpy()+gap
            for c in base: np.testing.assert_allclose(d[c],base[c],equal_nan=True,rtol=0,atol=1e-8)
            assert d.participant_id.is_unique and d[added].notna().all().all()
            assert ((d.current_smoker!=1)|(d.former_smoker==0)).all()
            assert ((d.diabetes!=0)|(d.diabetes_medication==0)).all()
            assert (d.hip_circumference_cm>=d.waist_cm+2-1e-8).all()
            p=target/f'seed{seed}_{regime}.csv'
            if p.exists():raise ValueError(f'Refuse overwrite {p}')
            d.to_csv(p,index=False)
            checks.append({'scenario':p.stem,'rows':len(d),'predictors':26,'source_sha256':digest(src),'output_sha256':digest(p),'synthetic_seed':seed,'assumption':regime,'preserved_observed_missingness_outcomes_folds':'PASS','synthetic_fields':added})
    # Original draw with new training seed isolates algorithm randomness.
    p=target/'original_draw.csv'
    if p.exists():raise ValueError('Refuse overwrite')
    source=ROOT/'data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv'
    p.write_bytes(source.read_bytes())
    checks.append({'scenario':'original_draw','source_sha256':digest(source),'output_sha256':digest(p),'preserved_all_values':'PASS'})
    (OUT/'scenario_validation.json').write_text(json.dumps(checks,indent=2))
    print('Prepared five separately versioned, validated scenario files.')

if __name__=='__main__':main()
