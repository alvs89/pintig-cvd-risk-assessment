"""Censor-adjusted discrete horizon CIF evaluation. Simulated features: methods pilot only."""
from pathlib import Path
import pandas as pd,numpy as np
from sklearn.metrics import roc_auc_score
from scipy.special import expit
from scipy.optimize import minimize
root=Path(__file__).resolve().parents[2]
folder=root/'analysis/results/v4_simulation/nested'
src=folder/'NESTED_OOF_WITH_CIF_LONG.csv'
d=pd.read_csv(src)
assert len(d.groupby(['config','participant_id','horizon_days']))==len(d)
horizons=np.sort(d.horizon_days.unique())
def estimate_g(t,e):
 order=np.argsort(t);t=t[order];e=e[order]
 unique,at=np.unique(t,return_index=True)
 risk=len(t)-at
 c=np.array([np.sum((t==v)&(e==0)) for v in unique])
 q=np.cumprod(1-c/risk)
 def G(times,before=False):
  ix=np.searchsorted(unique,np.asarray(times),side='left' if before else 'right')-1
  # for before: left insertion - 1, for at time after: right insertion -1
  return np.maximum(np.where(ix>=0,q[np.maximum(ix,0)],1.),1e-5)
 return G
def weights(t,e,h,G):
 case=(e==1)&(t<=h)
 comp=(e==2)&(t<=h)
 after=t>h
 w=np.zeros(len(t))
 w[case|comp]=1/G(t[case|comp],before=True)
 w[after]=1/G(np.repeat(h,np.sum(after)))
 return case.astype(float),w
def slope_cal(y,p,w):
 # pseudo-Bernoulli IPCW weighted calibration, approximation for competing risks
 x=np.log(-np.log(1-np.clip(p,1e-6,1-1e-6)))
 xx=np.stack([np.ones(len(x)),x],axis=1)
 def negll(b):
  eta=np.clip(xx@b,-30,30);prob=1-np.exp(-np.exp(eta))
  prob=np.clip(prob,1e-10,1-1e-10)
  return -np.sum(w*(y*np.log(prob)+(1-y)*np.log(1-prob)))
 r=minimize(negll,[0.,1.],method='BFGS')
 return (float(r.x[0]),float(r.x[1])) if r.success or np.all(np.isfinite(r.x)) else (np.nan,np.nan)
def one(g):
 last=g[g.horizon_days==horizons[-1]].sort_values('participant_id')
 t=last.time.to_numpy();e=last.event.to_numpy()
 G=estimate_g(t,e)
 briers=[]
 for h in horizons:
  sub=g[g.horizon_days==h].sort_values('participant_id')
  p=np.clip(sub.prob.to_numpy(),0,1)
  y,w=weights(t,e,h,G)
  briers.append(np.mean(w*(p-y)**2))
 p=last.prob.to_numpy();y,w=weights(t,e,horizons[-1],G)
 valid=w>0
 auc=roc_auc_score(y[valid],p[valid],sample_weight=w[valid])
 intercept,slope=slope_cal(y,p,w)
 return dict(n=int(len(t)),auc10=float(auc),brier10=float(briers[-1]),
   ibs_1to10y=float(np.trapezoid(briers,horizons)/(horizons[-1]-horizons[0])),
   calibration_intercept=float(intercept),calibration_slope=float(slope),
   mean_predicted=float(p.mean()),ipcw_observed_cif=float(np.mean(w*y)),
   fit_seconds=float(last.groupby('fold').fit_seconds.first().sum()))
rows=[]
for name,g in d.groupby('config',sort=True):
 val=one(g);rows.append({'configuration':name,**val});print('SCORED',name,val,flush=True)
out=pd.DataFrame(rows);out.to_csv(folder/'NESTED_FULL_METRICS.csv',index=False)

print(out.to_string(index=False))

