from pathlib import Path
import numpy as np,pandas as pd
from sklearn.metrics import roc_auc_score
root=Path(__file__).resolve().parents[2];p=root/'analysis/results/v4_simulation'
d=pd.read_csv(p/'SENSITIVITY_2SEEDS_OOF.csv')
def score(g):
 t=g.time.to_numpy();e=g.event.to_numpy();pred=g.prob.to_numpy();h=3652.5
 z=np.argsort(t);times,indices=np.unique(t[z],return_index=True)
 cent=np.bincount(np.searchsorted(times,t[e==0]),minlength=len(times))
 surv=np.cumprod(1-cent/(len(t)-indices))
 def G(q,left):
  x=np.searchsorted(times,q,side='left' if left else 'right')-1
  return np.maximum(np.where(x>=0,surv[np.maximum(0,x)],1),1e-6)
 case=(e==1)&(t<=h);comp=(e==2)&(t<=h);after=t>h
 w=np.zeros(len(t));w[case|comp]=1/G(t[case|comp],True);w[after]=1/G(np.full(after.sum(),h),False)
 y=case.astype(int);v=w>0
 return pd.Series({'AUC':roc_auc_score(y[v],pred[v],sample_weight=w[v]),'Brier':np.mean(w*(y-pred)**2)})
res=d.groupby(['scenario_seed','config']).apply(score,include_groups=False).reset_index()
res.to_csv(p/'SENSITIVITY_2SEEDS_METRICS.csv',index=False);print(res.to_string(index=False))
