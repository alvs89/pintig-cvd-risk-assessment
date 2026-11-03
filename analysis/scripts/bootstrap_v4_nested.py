"""Paired patient-level bootstrap of nested simulation OOF AUC/Brier; descriptive only."""
from pathlib import Path
import pandas as pd,numpy as np
from sklearn.metrics import roc_auc_score
root=Path(__file__).resolve().parents[2];folder=root/'analysis/results/v4_simulation/nested'
d=pd.read_csv(folder/'NESTED_OOF_WITH_CIF_LONG.csv')
last=d[d.horizon_days==d.horizon_days.max()].copy()
groups={}
for nm,g in last.groupby('config'):
 g=g.sort_values('participant_id');groups[nm]=g
ids=next(iter(groups.values())).participant_id.to_numpy()
assert all(np.array_equal(g.participant_id.to_numpy(),ids) for g in groups.values())
t=next(iter(groups.values())).time.to_numpy();e=next(iter(groups.values())).event.to_numpy()
p={nm:g.prob.to_numpy() for nm,g in groups.items()}
def weights(t,e,h=3652.5):
 ix=np.argsort(t);t0=t[ix];e0=e[ix];times,starts=np.unique(t0,return_index=True)
 counts=np.bincount(np.searchsorted(times,t0)[e0==0],minlength=len(times))
 q=np.cumprod(1-counts/(len(t)-starts))
 def G(val,before):
  idx=np.searchsorted(times,val,side='left' if before else 'right')-1
  return np.maximum(np.where(idx>=0,q[np.maximum(0,idx)],1),1e-5)
 case=(e==1)&(t<=h);comp=(e==2)&(t<=h);after=t>h
 w=np.zeros(len(t));w[case|comp]=1/G(t[case|comp],True);w[after]=1/G(np.repeat(h,after.sum()),False)
 return case.astype(int),w
rng=np.random.default_rng(20261031)
rows=[]
for rep in range(200):
 ix=rng.choice(len(ids),len(ids),replace=True) if rep else np.arange(len(ids))
 yy,w=weights(t[ix],e[ix]);valid=w>0
 results={}
 for nm in groups:
  pp=p[nm][ix]
  try: auc=roc_auc_score(yy[valid],pp[valid],sample_weight=w[valid])
  except ValueError:auc=np.nan
  brier=np.mean(w*(yy-pp)**2)
  results[nm]=(auc,brier)
  rows.append({'replicate':rep,'config':nm,'auc10':auc,'brier10':brier})
 for nm in groups:
  if nm!='base16':rows.append({'replicate':rep,'config':'DIFF_'+nm+'_minus_base16','auc10':results[nm][0]-results['base16'][0],'brier10':results[nm][1]-results['base16'][1]})
 if rep%50==0:print('BOOTSTRAP',rep,flush=True)
df=pd.DataFrame(rows);df.to_csv(folder/'BOOTSTRAP_REPLICATES_200.csv',index=False)
out=[]
for n,g in df[df.replicate>0].groupby('config'):
 out.append({'configuration':n,'auc_ci_low':g.auc10.quantile(.025),'auc_ci_high':g.auc10.quantile(.975),'brier_ci_low':g.brier10.quantile(.025),'brier_ci_high':g.brier10.quantile(.975)})
pd.DataFrame(out).to_csv(folder/'BOOTSTRAP_95PCT_CI.csv',index=False)
print(pd.DataFrame(out).to_string(index=False))
