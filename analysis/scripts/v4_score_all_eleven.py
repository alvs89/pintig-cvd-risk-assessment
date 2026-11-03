import pandas as pd,numpy as np
from pathlib import Path
from sklearn.metrics import roc_auc_score
from scipy.optimize import minimize
root=Path(__file__).resolve().parents[2]; folder=root/'analysis/results/v4_simulation/nested'
prev=pd.read_csv(folder/'NESTED_OOF_WITH_CIF_LONG.csv')
new=pd.read_csv(folder/'NESTED_REMAINING_OOF_WITH_CIF_LONG.csv')
prev['config']=prev['config'].map({'base16':'n16','smoking18':'n18_smoking','behaviour20':'n20_behaviour','all26':'n26'})
whole=pd.concat([prev,new],ignore_index=True)
assert whole.groupby('config').participant_id.nunique().eq(4191).all(),whole.groupby('config').participant_id.nunique().to_dict()
whole.to_csv(folder/'ALL_11_NESTED_OOF_WITH_CIF_LONG.csv',index=False)
hs=np.sort(whole.horizon_days.unique())
def km(t,e):
 times=np.sort(np.unique(t));starts=np.searchsorted(np.sort(t),times,'left')
 counts=np.bincount(np.searchsorted(times,t[e==0]),minlength=len(times))
 qq=np.cumprod(1-counts/(len(t)-starts))
 def G(arr,before=False):
  ix=np.searchsorted(times,arr,side='left' if before else 'right')-1
  return np.maximum(np.where(ix>=0,qq[np.maximum(0,ix)],1.),1e-5)
 return G
def yweight(t,e,h,G):
 case=(e==1)&(t<=h);comp=(e==2)&(t<=h);after=t>h
 w=np.zeros(len(t))
 w[case|comp]=1/G(t[case|comp],True)
 w[after]=1/G(np.full(sum(after),h))
 return case.astype(float),w
def calibrate(y,p,w):
 x=np.log(-np.log1p(-np.clip(p,1e-6,1-1e-6)))
 xx=np.column_stack([np.ones(len(x)),x])
 def f(b):
  q=np.clip(-np.expm1(-np.exp(np.clip(xx@b,-20,20))),1e-8,1-1e-8)
  return -np.sum(w*(y*np.log(q)+(1-y)*np.log1p(-q)))
 opt=minimize(f,np.array([0.,1.]),method='BFGS')
 return opt.x
outs=[]
for nm,g in whole.groupby('config'):
 g=g.sort_values(['participant_id','horizon_days'])
 t=g[g.horizon_days==hs[-1]].time.to_numpy()
 e=g[g.horizon_days==hs[-1]].event.to_numpy()
 G=km(t,e);bv=[]
 for h in hs:
  pred=g[g.horizon_days==h].prob.to_numpy()
  y,w=yweight(t,e,h,G);bv.append(float(np.mean(w*(y-pred)**2)))
 p=g[g.horizon_days==hs[-1]].prob.to_numpy();y,w=yweight(t,e,hs[-1],G)
 v=w>0;a=roc_auc_score(y[v],p[v],sample_weight=w[v])
 b=calibrate(y,p,w)
 out={'config':nm,'n_predictors':int(nm[1:3]),'auc_10y':a,'brier_10y':bv[-1],'ibs_year1_to10':np.trapezoid(bv,hs)/(hs[-1]-hs[0]),'calibration_intercept_approx':b[0],'calibration_slope_approx':b[1],'fit_seconds':g[g.horizon_days==hs[-1]].groupby('fold').fit_seconds.first().sum(),'mean_predicted':p.mean(),'observed_ipcw':np.mean(w*y)}
 outs.append(out);print(nm,a,bv[-1],flush=True)
pd.DataFrame(outs).sort_values('n_predictors').to_csv(folder/'ALL_11_NESTED_METRICS.csv',index=False)
print(pd.DataFrame(outs).sort_values('n_predictors').to_string(index=False))
