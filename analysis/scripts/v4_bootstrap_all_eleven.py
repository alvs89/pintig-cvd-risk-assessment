import numpy as np,pandas as pd
from pathlib import Path
from sklearn.metrics import roc_auc_score
root=Path(__file__).resolve().parents[2];folder=root/'analysis/results/v4_simulation/nested'
d=pd.read_csv(folder/'ALL_11_NESTED_OOF_WITH_CIF_LONG.csv')
last=d[d.horizon_days==d.horizon_days.max()]
names=sorted(last.config.unique(),key=lambda k:int(k[1:3]))
g={nm:last[last.config==nm].sort_values('participant_id') for nm in names}
ref=g[names[0]];ids=ref.participant_id.to_numpy();t=ref.time.to_numpy();e=ref.event.to_numpy()
assert all(np.array_equal(x.participant_id.to_numpy(),ids) for x in g.values())
pr={nm:x.prob.to_numpy() for nm,x in g.items()}
def wt(t,e,h=3652.5):
 x=np.sort(np.unique(t));counts=np.bincount(np.searchsorted(x,t[e==0]),minlength=len(x))
 start=np.searchsorted(np.sort(t),x,'left');q=np.cumprod(1-counts/(len(t)-start))
 def G(arr,before=False):
  z=np.searchsorted(x,arr,'left' if before else 'right')-1
  return np.maximum(np.where(z>=0,q[np.maximum(z,0)],1.),1e-5)
 c=(e==1)&(t<=h);comp=(e==2)&(t<=h);after=t>h
 w=np.zeros(len(t));w[c|comp]=1/G(t[c|comp],True);w[after]=1/G(np.full(after.sum(),h))
 return c.astype(int),w
rng=np.random.default_rng(20261031);rows=[]
for i in range(201):
 idx=np.arange(len(ids)) if i==0 else rng.choice(len(ids),len(ids),replace=True)
 yy,w=wt(t[idx],e[idx]);valid=w>0;trial={}
 for nm in names:
  pp=pr[nm][idx]
  a=roc_auc_score(yy[valid],pp[valid],sample_weight=w[valid])
  b=np.mean(w*(yy-pp)**2);trial[nm]=(a,b)
  rows.append({'bootstrap':i,'config':nm,'auc':a,'brier':b})
 for nm in names[1:]:
  a,b=trial[nm];u,v=trial[names[0]]
  rows.append({'bootstrap':i,'config':'DELTA_'+nm,'auc':a-u,'brier':b-v})
 if i%50==0:print('BOOTSTRAP',i,flush=True)
df=pd.DataFrame(rows);df.to_csv(folder/'ALL_11_BOOTSTRAP_REPLICATES_200.csv',index=False)
summary=[]
for nm,x in df[df.bootstrap>0].groupby('config'):
 summary.append({'config':nm,'auc_CI_low':x.auc.quantile(.025),'auc_CI_high':x.auc.quantile(.975),'brier_CI_low':x.brier.quantile(.025),'brier_CI_high':x.brier.quantile(.975)})
pd.DataFrame(summary).to_csv(folder/'ALL_11_BOOTSTRAP_95CI.csv',index=False)
print(pd.DataFrame(summary).to_string(index=False))
