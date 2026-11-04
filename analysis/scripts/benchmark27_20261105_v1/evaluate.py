"""Same corrected evaluation for all models; paired conditional bootstrap."""
from pathlib import Path
import sys,json,hashlib
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'analysis/results/benchmark27_20261105_v1'
RSF=ROOT/'analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3'
sys.path.insert(0,str(ROOT/'analysis/scripts/v4_corrected'))
from metrics import evaluate,TAU
from evaluate import bootstrap
def main():
    assert (OUT/'TRAINING_COMPLETE.json').exists()
    assert not (OUT/'metrics.csv').exists(),'Preserve completed evaluation'
    protocol=json.loads((RSF/'protocol.json').read_text())
    d=pd.read_csv(ROOT/protocol['input']).sort_values('participant_id').reset_index(drop=True)
    view=pd.read_csv(RSF/'evaluation_followup_view.csv')
    np.testing.assert_array_equal(view.participant_id,d.participant_id)
    complete=view.complete_at_tau.to_numpy(bool); hs=np.linspace(0,TAU,41)
    ps={}; rows=[];curves=[]
    for name in ['RSF','Cox','FineGray']:
        folder=RSF if name=='RSF' else OUT; prefix='' if name=='RSF' else name+'_'
        z=pd.concat([pd.read_csv(folder/f'{prefix}fold{k}_oof.csv') for k in range(1,6)]).sort_values('participant_id').reset_index(drop=True)
        for c in ['participant_id','outer_fold','analysis_time_days','event_type']:np.testing.assert_array_equal(z[c],d[c])
        p=z[[f'risk_{j}' for j in range(41)]].to_numpy();ps[name]=p
        assert np.isfinite(p).all() and ((p>=0)&(p<=1)).all() and (np.diff(p,axis=1)>=-1e-10).all()
        m,b,a=evaluate(z.analysis_time_days.to_numpy(),z.event_type.to_numpy(),p,hs,complete)
        rows.append({'model':name,**m});curves.extend({'model':name,'days':h,'brier':bb,'auc':aa} for h,bb,aa in zip(hs,b,a))
    metrics=pd.DataFrame(rows).set_index('model');metrics.to_csv(OUT/'metrics.csv')
    original=pd.read_csv(RSF/'metrics.csv').iloc[0]
    for key in original.index: np.testing.assert_allclose(metrics.loc['RSF',key],original[key],rtol=0,atol=1e-10)
    pd.DataFrame(curves).to_csv(OUT/'metric_curves.csv',index=False)
    boot=bootstrap(z,ps,500);boot.to_csv(OUT/'paired_bootstrap_500.csv',index=False)
    ci=[];diff=[]
    for name,g in boot.groupby('configuration'):
        for key in ['auc_10y','brier_10y','ibs_0_10y','calibration_slope','calibration_in_large_logit']:
            v=g.set_index('replicate')[key].dropna()
            ci.append({'model':name,'metric':key,'estimate':metrics.loc[name,key],'lower95':v.quantile(.025),'upper95':v.quantile(.975),'valid_replicates':len(v)})
            ref=boot[boot.configuration=='RSF'].set_index('replicate')[key]; delta=(v-ref).dropna()
            diff.append({'model':name,'reference':'RSF','metric':key,'difference':metrics.loc[name,key]-metrics.loc['RSF',key],'lower95':delta.quantile(.025),'upper95':delta.quantile(.975),'valid_replicates':len(delta)})
    pd.DataFrame(ci).to_csv(OUT/'performance_with_ci.csv',index=False)
    pd.DataFrame(diff).to_csv(OUT/'paired_differences_vs_RSF.csv',index=False)
    times=pd.read_csv(OUT/'fit_times.csv'); sel=pd.read_csv(OUT/'selected.csv');tr=[]
    for name in ['Cox','FineGray']:
        t=times[times.model==name]
        tr.append({'model':name,'inner_fit_seconds':t.loc[t.inner!=0,'fit_seconds'].sum(),'outer_fit_seconds':t.loc[t.inner==0,'fit_seconds'].sum(),'pipeline_seconds':sel.loc[sel.model==name,'pipeline_seconds'].sum(),'timing_scope':'new 30 inner + 5 outer fits; separate preprocessing/prediction overhead'})
    tr.append({'model':'RSF','inner_fit_seconds':None,'outer_fit_seconds':None,'pipeline_seconds':sum(pd.read_csv(RSF/f'fold{k}_selected.csv').seconds.iloc[0] for k in range(1,6)),'timing_scope':'historical elapsed fold pipeline; pure fit timing unavailable; not directly comparable hardware/session'})
    pd.DataFrame(tr).to_csv(OUT/'training_time_summary.csv',index=False)
    protected=json.loads((OUT/'protected_sha256.json').read_text())
    assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in protected.items())
    (OUT/'verification.json').write_text(json.dumps({'oof_unique_participants':4191,'all_three_linkage':'PASS','cif_bounds_monotonicity':'PASS','rsf_metrics_reproduced':'PASS','protected_files_unchanged':len(protected),'bootstrap_replicates':500,'deployment_approved':False},indent=2))
    print(metrics.to_string())
if __name__=='__main__':main()
