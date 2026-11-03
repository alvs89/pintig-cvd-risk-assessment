"""Exploratory pilot: fold OOF IPCW at 10y, fixed hyperparams, simulation-only."""
import numpy as np,pandas as pd
from pathlib import Path
from sklearn.metrics import roc_auc_score
root=Path(__file__).resolve().parents[3];d=pd.read_csv(root/'analysis/results/v4_simulation/RSF_ALL_COUNTS_16_26_OOF_SIMULATION.csv')
tau=3652.5
result=[]
for name,g in d.groupby('config',sort=False):
 t=g.time.to_numpy();e=g.event.to_numpy();p=g.prob.to_numpy()
 xx=np.sort(np.unique(t));G=1.;Gbefore={}
 for v in xx:
  Gbefore[v]=G; atrisk=(t>=v).sum(); nc=((t==v)&(e==0)).sum()
  G*=1-nc/atrisk if atrisk else 1.
 def weight_before(vals):return np.maximum(np.array([Gbefore[v] for v in vals]),1e-4)
 case=(e==1)&(t<=tau);control=(t>tau)|((e==2)&(t<=tau));use=case|control
 w=np.zeros(len(g));w[case]=1/weight_before(t[case])
 w[control&(e==2)&(t<=tau)]=1/weight_before(t[control&(e==2)&(t<=tau)])
 valid=xx[xx<=tau];gtau=Gbefore[valid[-1]] if len(valid) else 1.
 w[control&(t>tau)]=1/max(gtau,1e-4)
 y=case.astype(int)
 result.append({'predictors':int(g.n_predictors.iloc[0]),'auc_10y_ipcw':float(roc_auc_score(y[use],p[use],sample_weight=w[use])),'brier_10y_ipcw':float(np.sum(w*(y-p)**2)/len(g)), 'predicted_incidence':float(np.mean(p)), 'observed_cif_ipcw_approx':float(np.sum(w*y)/len(g)),'total_fit_seconds':float(g.groupby('fold').fit_seconds.first().sum()),'IBS':'NOT_COMPUTED','calibration_slope':'NOT_COMPUTED','CV_method':'5-fold fixed hyperparameters, NOT nested; simulation only'})
res=pd.DataFrame(result).sort_values('predictors');out=root/'analysis/results/v4_simulation/RSF_ALL_COUNTS_16_26_METRICS_SIMULATION.csv';res.to_csv(out,index=False)
print(res.to_string(index=False,float_format=lambda x:f'{x:.5f}'));print('saved',out)
