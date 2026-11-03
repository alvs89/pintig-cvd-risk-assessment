"""Score preserved OOF files and paired participant bootstrap, no model refitting."""
from pathlib import Path
import json, sys
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from metrics import TAU, weights, calibration, evaluate
from prepare import ROOT, OUT

HS=np.linspace(0,TAU,41)

def load(run, configs):
    data={}
    for nm in configs:
        paths=[run/f'{nm}_fold{k}.csv' for k in range(1,6)]
        if not all(p.exists() for p in paths): raise ValueError(f'Incomplete run {run.name}: {nm}')
        z=pd.concat([pd.read_csv(p) for p in paths]).sort_values('participant_id').reset_index(drop=True)
        frozen=pd.read_csv(ROOT/'data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv').sort_values('participant_id').reset_index(drop=True)
        for c in ['participant_id','outer_fold','analysis_time_days','event_type']: np.testing.assert_array_equal(z[c],frozen[c])
        assert z.participant_id.is_unique and len(z)==4191
        p=z[[f'risk_{j}' for j in range(41)]].to_numpy()
        assert np.isfinite(p).all() and ((p>=0)&(p<=1)).all() and (np.diff(p,axis=1)>=-1e-10).all()
        data[nm]=p
    return z,data

def score_run(run,configs):
    z,ps=load(run,configs);t=z.analysis_time_days.to_numpy();e=z.event_type.to_numpy();admin=(t==TAU)&(e==0)
    rows=[];curves=[]
    for nm,p in ps.items():
        m,b,a=evaluate(t,e,p,HS,admin)
        rows.append({'configuration':nm,'n_predictors':int(nm[1:]),**m})
        curves.extend({'configuration':nm,'horizon_days':h,'brier':bs,'auc':au} for h,bs,au in zip(HS,b,a))
    return z,ps,pd.DataFrame(rows),pd.DataFrame(curves)

def bootstrap(z,ps,reps=500):
    rng=np.random.default_rng(20261031);n=len(z);rows=[]
    for b in range(reps):
        ix=rng.integers(n,size=n);t=z.analysis_time_days.to_numpy()[ix];e=z.event_type.to_numpy()[ix]
        Y=[];W=[]
        for h in HS[1:]:
            y,w=weights(t,e,h,complete_at_h=(t==h)&(e==0) if h==TAU else None)
            Y.append(y);W.append(w)
        Y=np.asarray(Y).T;W=np.asarray(W).T;y=Y[:,-1];w=W[:,-1];valid=w>0
        for nm,full in ps.items():
            p=full[ix,1:];brier=np.mean(W*(p-Y)**2,axis=0)
            slope,citl,_=calibration(y,p[:,-1],w)
            rows.append({'replicate':b,'configuration':nm,'auc_10y':roc_auc_score(y[valid],p[valid,-1],sample_weight=w[valid]),
                         'brier_10y':brier[-1],'ibs_0_10y':np.trapezoid(np.r_[0,brier],HS)/TAU,
                         'calibration_slope':slope,'calibration_in_large_logit':citl})
        if (b+1)%50==0:print('BOOTSTRAP',b+1,flush=True)
    return pd.DataFrame(rows)

def main():
    mode=sys.argv[1] if len(sys.argv)>1 else 'primary'
    if mode=='primary':
        cfg=list(json.loads((OUT/'configurations.json').read_text()))
        z,ps,m,c=score_run(OUT/'primary_train20265000',cfg)
        m.to_csv(OUT/'corrected_metrics.csv',index=False);c.to_csv(OUT/'corrected_metric_curves.csv',index=False)
        print(m.to_string(index=False),flush=True)
        # Prespecified exploratory ranking: IBS, then Brier, then smaller model.
        ranked=m.sort_values(['ibs_0_10y','brier_10y','n_predictors'])
        chosen=list(dict.fromkeys(['n16']+ranked.configuration.head(2).tolist()))
        (OUT/'robustness_selected.json').write_text(json.dumps({'rule':'baseline plus lowest two corrected IBS; ties Brier then smaller size','configurations':chosen},indent=2))
        b=bootstrap(z,ps);b.to_csv(OUT/'bootstrap_500.csv',index=False)
        metrics=['auc_10y','brier_10y','ibs_0_10y','calibration_slope','calibration_in_large_logit']
        ci=[];diff=[]
        for nm,g in b.groupby('configuration'):
            ref=b[b.configuration=='n16'].set_index('replicate');g=g.set_index('replicate')
            for metric in metrics:
                vals=g[metric].dropna();dv=(g[metric]-ref[metric]).dropna()
                ci.append({'configuration':nm,'metric':metric,'lower95':vals.quantile(.025),'upper95':vals.quantile(.975),'valid_replicates':len(vals)})
                diff.append({'configuration':nm,'reference':'n16','metric':metric,'point_difference':float(m.set_index('configuration').loc[nm,metric]-m.set_index('configuration').loc['n16',metric]),'lower95':dv.quantile(.025),'upper95':dv.quantile(.975),'valid_replicates':len(dv)})
        pd.DataFrame(ci).to_csv(OUT/'metric_confidence_intervals.csv',index=False)
        pd.DataFrame(diff).to_csv(OUT/'paired_differences_vs_n16.csv',index=False)
    else:
        cfg=json.loads((OUT/'robustness_selected.json').read_text())['configurations'];rows=[]
        for run in sorted(OUT.glob('*_train*')):
            _,_,m,_=score_run(run,cfg)
            m['run']=run.name;rows.append(m)
        pd.concat(rows).to_csv(OUT/'robustness_metrics.csv',index=False)

if __name__=='__main__':main()
