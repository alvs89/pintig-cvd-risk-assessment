"""Pilot descriptive IPCW scores at 10 years, not definitive predictor selection."""
import numpy as np,pandas as pd
from pathlib import Path
from sklearn.metrics import roc_auc_score
root=Path(__file__).resolve().parents[3]; inp=root/'analysis/results/v4_simulation/RSF_PILOT_OOF_SIMULATION.csv'
d=pd.read_csv(inp);tau=3652.5
out=[]
for name,g in d.groupby('config'):
 g=g.copy();t=g.time.to_numpy();e=g.event.to_numpy();p=g.prob.to_numpy()
 # KM censor survival: censor status==0, events 1 and competing 2 treated as noncensoring
 xx=np.sort(np.unique(t));G=1.0;gb={}
 for x in xx:
  gb[x]=G
  risk=(t>=x).sum();cen=((t==x)&(e==0)).sum()
  if cen:G*=1-cen/risk
 def g_before(v):
  arr=np.asarray(v); return np.maximum([gb[x] for x in arr],1e-4)
 # for endpoint Y=1 if event1 by tau; observed competing death is known Y=0
 case=(e==1)&(t<=tau)
 known0=(t>tau)|((e==2)&(t<=tau))
 observable=case|known0
 weight=np.zeros(len(g))
 weight[case]=1/g_before(t[case])
 weight[known0 & (t>tau)]=1/max(1e-4,gb[xx[xx<=tau][-1]] if np.any(xx<=tau) else 1)
 weight[known0 & (e==2)&(t<=tau)]=1/g_before(t[known0 & (e==2)&(t<=tau)])
 y=case.astype(int)
 auc=roc_auc_score(y[observable],p[observable],sample_weight=weight[observable])
 brier=np.sum(weight*(y-p)**2)/len(g)
 out.append(dict(config=name,n=len(g),num_features={'base16':16,'sim21':21,'sim26':26}[name],
  ipcw_10y_auc=round(float(auc),6),ipcw_10y_brier=round(float(brier),6),
  mean_predicted_risk=round(float(p.mean()),6),ipcw_event_incidence_estimate=round(float(np.sum(weight*y)/len(g)),6),
  fit_seconds_total=round(float(g.groupby('fold').fit_seconds.first().sum()),2),
  ibs='NOT_COMPUTED_requires_CIF_curves',calibration_slope='NOT_COMPUTED',
  note='fixed hyperparameters, 5 fold pilot; synthetic candidate features; not nested tuning or clinical validation'))
res=pd.DataFrame(out);dest=root/'analysis/results/v4_simulation/RSF_PILOT_METRICS_SIMULATION_ONLY.csv';res.to_csv(dest,index=False)
print(res.to_string(index=False));print('Saved',dest)

