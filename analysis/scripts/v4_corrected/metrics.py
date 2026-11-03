"""Competing-risk horizon metrics; cause 1 cases, competing events are controls.

Administrative censoring at h is known event-free THROUGH h only when verified.
Reverse KM uses event-before-censor ordering at ties (prodlim convention).
No fitting or file I/O on import.
"""
import numpy as np
from scipy.special import expit, logit
from scipy.optimize import root, brentq
from sklearn.metrics import roc_auc_score

TAU = 3652.5

def censor_km(t, e):
    t, e = np.asarray(t), np.asarray(e)
    u, inv, counts = np.unique(t, return_inverse=True, return_counts=True)
    risk = len(t) - np.r_[0, np.cumsum(counts)[:-1]]
    cens = np.bincount(inv, weights=e == 0, minlength=len(u))
    events = counts - cens
    denom = risk - events
    survival = np.cumprod(1 - np.divide(cens, denom, out=np.zeros(len(u)), where=denom > 0))
    def g(x, left=False):
        idx = np.searchsorted(u, x, side='left' if left else 'right') - 1
        return np.where(idx >= 0, survival[np.maximum(idx, 0)], 1.)
    return g

def weights(t, e, h, train=None, complete_at_h=None):
    t, e = np.asarray(t), np.asarray(e)
    complete = np.zeros(len(t), bool) if complete_at_h is None else np.asarray(complete_at_h, bool)
    if np.any(complete & ~((t == h) & (e == 0))):
        raise ValueError('Complete-at-h flags must designate censoring exactly at h')
    g = censor_km(t, e) if train is None else censor_km(*train)
    event = (e != 0) & (t <= h)
    free = (t > h) | complete
    w = np.zeros(len(t))
    ge = g(t[event], left=True)
    # Verified terminal administrative censoring is not loss before the horizon.
    gh = g(h, left=bool(np.any(complete)))
    if np.any(ge <= 0) or (np.any(free) and gh <= 0):
        raise ValueError('Censoring positivity failure')
    w[event] = 1 / ge
    w[free] = 1 / gh
    return ((e == 1) & (t <= h)).astype(float), w

def calibration(y, p, w):
    x = logit(np.clip(p, 1e-7, 1-1e-7))
    X = np.column_stack([np.ones(len(x)), x])
    def score(b): return X.T @ (w * (expit(X @ b) - y))
    def jac(b):
        q = expit(X @ b)
        return X.T @ ((w*q*(1-q))[:, None]*X)
    fit = root(score, [0., 1.], jac=jac)
    if not fit.success or np.max(np.abs(score(fit.x))) > 1e-5:
        return np.nan, np.nan, np.nan
    citl = brentq(lambda a: np.sum(w*(expit(a+x)-y)), -40, 40)
    return float(fit.x[1]), float(citl), float(fit.x[0])

def evaluate(t, e, pred, horizons, complete_at_tau):
    brier, auc = [], []
    for j, h in enumerate(horizons):
        if h == 0:
            brier.append(0.); auc.append(np.nan); continue
        complete = complete_at_tau if h == TAU else None
        y, w = weights(t, e, h, complete_at_h=complete)
        brier.append(float(np.mean(w*(pred[:, j]-y)**2)))
        valid = w > 0
        auc.append(float(roc_auc_score(y[valid], pred[valid, j], sample_weight=w[valid])))
    slope, citl, intercept = calibration(y, pred[:, -1], w)
    return dict(auc_10y=auc[-1], brier_10y=brier[-1],
                ibs_0_10y=float(np.trapezoid(brier, horizons)/TAU),
                calibration_slope=slope, calibration_in_large_logit=citl,
                calibration_intercept_joint=intercept,
                mean_predicted=float(pred[:, -1].mean()),
                observed_ipcw=float(np.mean(w*y))), np.asarray(brier), np.asarray(auc)
