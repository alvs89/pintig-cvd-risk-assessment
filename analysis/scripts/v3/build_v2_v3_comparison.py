from pathlib import Path
import pandas as pd

root=Path(r"C:\Users\Alvin Guillermo\Downloads\PINTIG System")
old=Path(r"C:\Users\Alvin Guillermo\Downloads\pintig_pre_model_data_audit")
outdir=root/"analysis"/"reports"/"v3"
outdir.mkdir(parents=True,exist_ok=True)

v2=pd.read_csv(old/"r_model_results"/"final_evaluation"/"FINAL_MODEL_COMPARISON.csv")
v2cal=pd.read_csv(old/"r_model_results"/"tradeoff_completion"/"CALIBRATION_COMPLETE_10Y_FINAL.csv")
v2fold=pd.read_csv(old/"r_model_results"/"final_evaluation"/"fold_metric_mean_sd.csv")
v2comp=pd.read_csv(old/"r_model_results"/"tradeoff_completion"/"COMPUTATIONAL_TRADEOFF_FINAL.csv")
v3=pd.read_csv(root/"analysis"/"modeling"/"v3_16predictors"/"final_evaluation"/"V3_FINAL_MODEL_COMPARISON.csv")
v3fold=pd.read_csv(root/"analysis"/"modeling"/"v3_16predictors"/"final_evaluation"/"v3_fold_metric_mean_sd.csv")
v3comp=pd.read_csv(root/"analysis"/"results"/"v3"/"V3_COMPUTATIONAL_BENCHMARK.csv")
abl=pd.read_csv(root/"analysis"/"results"/"v3"/"V3_INCREMENTAL_PREDICTOR_ABLATION_METRICS.csv")
vi=pd.read_csv(root/"analysis"/"results"/"v3"/"V2_V3_RSF_FULLDATA_PERMUTATION_IMPORTANCE.csv")

v2c=v2.merge(v2cal[["model","calibration_slope","calibration_in_large_cloglog"]],on="model",how="left")
v2c=v2c[["model","AUC","Brier","IBS_trapezoid","cause_specific_harrell_c","calibration_slope","calibration_in_large_cloglog","mean_predicted","overall_observed_AJ_CIF"]].rename(columns={"IBS_trapezoid":"IBS"})
v3c=v3[["model","AUC","Brier","IBS","cause_specific_harrell_c","calibration_slope","calibration_in_large_cloglog","mean_predicted","overall_observed_AJ_CIF"]]
cmp=v2c.merge(v3c,on="model",suffixes=("_v2","_v3"))
for m in ["AUC","Brier","IBS","cause_specific_harrell_c","calibration_slope","calibration_in_large_cloglog","mean_predicted"]:
    cmp["delta_"+m]=cmp[m+"_v3"]-cmp[m+"_v2"]
cmp.to_csv(outdir/"V2_V3_METRIC_COMPARISON.csv",index=False)

f=v2fold.merge(v3fold,on="model",suffixes=("_v2","_v3"))
for m in ["AUC_mean","AUC_sd","Brier_mean","Brier_sd","IBS_mean","IBS_sd"]:
    f["delta_"+m]=f[m+"_v3"]-f[m+"_v2"]
f.to_csv(outdir/"V2_V3_FOLD_STABILITY_COMPARISON.csv",index=False)

v2comp["model"]=v2comp["model"].replace({"CoxPH":"Cox"})
ccomp=v2comp.merge(v3comp,on="model",suffixes=("_v2","_v3"))
for m in ["training_time_seconds","average_inference_ms","serialized_model_MB"]:
    if m+"_v2" in ccomp.columns and m+"_v3" in ccomp.columns:
        ccomp["delta_"+m]=ccomp[m+"_v3"]-ccomp[m+"_v2"]
ccomp.to_csv(outdir/"V2_V3_COMPUTATIONAL_COMPARISON.csv",index=False)

cox=pd.read_csv(root/"analysis"/"modeling"/"v3_16predictors"/"v3_cox_fold_coefficients.csv")
fg=pd.read_csv(root/"analysis"/"modeling"/"v3_16predictors"/"v3_finegray_fold_coefficients.csv")
new=["diabetes","cigarettes_per_day","heart_rate_bpm"]
rows=[]
for feat in new:
    z=cox[(cox.feature==feat)&(cox.cause=="major_cvd")]
    rows.append({"predictor":feat,"model":"Cox_major_CVD","mean_coefficient":z.coefficient.mean(),"min_coefficient":z.coefficient.min(),"max_coefficient":z.coefficient.max(),"mean_ratio":z.hazard_ratio.mean(),"min_ratio":z.hazard_ratio.min(),"max_ratio":z.hazard_ratio.max(),"positive_folds":int((z.coefficient>0).sum()),"negative_folds":int((z.coefficient<0).sum())})
    z=fg[fg.feature==feat]
    rows.append({"predictor":feat,"model":"FineGray","mean_coefficient":z.coefficient.mean(),"min_coefficient":z.coefficient.min(),"max_coefficient":z.coefficient.max(),"mean_ratio":z.subdistribution_hazard_ratio.mean(),"min_ratio":z.subdistribution_hazard_ratio.min(),"max_ratio":z.subdistribution_hazard_ratio.max(),"positive_folds":int((z.coefficient>0).sum()),"negative_folds":int((z.coefficient<0).sum())})
pd.DataFrame(rows).to_csv(outdir/"V3_NEW_PREDICTOR_COEFFICIENT_STABILITY.csv",index=False)

v3vi=vi[vi.version=="v3_16_predictors"].copy().sort_values("importance",ascending=False)
v3vi["rank"]=range(1,len(v3vi)+1)
v3vi.to_csv(outdir/"V3_RSF_IMPORTANCE_RANKS.csv",index=False)

a=abl.copy()
def vals(spec):
    return a[a.specification==spec].set_index("model")

rec=[]
for p,spec in [("diabetes","plus_diabetes"),("cigarettes_per_day","plus_cigarettes_per_day"),("heart_rate_bpm","plus_heart_rate_bpm")]:
    q=vals(spec)
    rec.append({
        "predictor":p,
        "cox_delta_auc":q.loc["Cox","delta_AUC_vs_base"],
        "fg_delta_auc":q.loc["FineGray","delta_AUC_vs_base"],
        "cox_delta_brier":q.loc["Cox","delta_Brier_vs_base"],
        "fg_delta_brier":q.loc["FineGray","delta_Brier_vs_base"],
        "cox_delta_c":q.loc["Cox","delta_C_vs_base"],
        "fg_delta_c":q.loc["FineGray","delta_C_vs_base"],
        "rsf_importance":float(v3vi.loc[v3vi.feature==p,"importance"].iloc[0]),
        "rsf_rank":int(v3vi.loc[v3vi.feature==p,"rank"].iloc[0]),
    })
rec=pd.DataFrame(rec)
rec.to_csv(outdir/"V3_NEW_PREDICTOR_EVIDENCE_SUMMARY.csv",index=False)

lines=[]
lines += ["# PINTIG v2 vs v3 Provisional Model Comparison","",
"## Scope",
"- v2: 13 predictors, 4,191 participants.",
"- v3: same 4,191 participants and outcomes, plus diabetes, cigarettes_per_day, and heart_rate_bpm (16 predictors total).",
"- Same five frozen outer folds and 10-year competing-risk target.",
"- All v3 predictor imputation is learned from training partitions only.",
"- Existing v2 files/results were not overwritten.","",
"## Pooled performance"]
for _,r in cmp.sort_values("model").iterrows():
    lines.append(f"- {r['model']}: AUC {r.AUC_v2:.4f} -> {r.AUC_v3:.4f} ({r.delta_AUC:+.4f}); Brier {r.Brier_v2:.5f} -> {r.Brier_v3:.5f} ({r.delta_Brier:+.5f}); IBS {r.IBS_v2:.5f} -> {r.IBS_v3:.5f} ({r.delta_IBS:+.5f}); C {r.cause_specific_harrell_c_v2:.4f} -> {r.cause_specific_harrell_c_v3:.4f} ({r.delta_cause_specific_harrell_c:+.4f}); calibration slope {r.calibration_slope_v2:.3f} -> {r.calibration_slope_v3:.3f}.")
lines += ["",
"Interpretation: v3 modestly improves discrimination and prediction error for all three model families. Cox and Fine-Gray remain slightly better than RSF in pooled AUC/IBS tradeoffs; RSF calibration slope moves materially closer to 1.","",
"## Added-predictor evidence"]
for _,r in rec.iterrows():
    lines.append(f"- {r.predictor}: Cox AUC delta {r.cox_delta_auc:+.4f}; Fine-Gray AUC delta {r.fg_delta_auc:+.4f}; Cox Brier delta {r.cox_delta_brier:+.5f}; Fine-Gray Brier delta {r.fg_delta_brier:+.5f}; RSF VIMP rank {int(r.rsf_rank)}/16 (importance {r.rsf_importance:.6f}).")
lines += ["",
"### Recommendation",
"- diabetes: RETAIN as a high-priority candidate. It has strong, directionally consistent regression effects across all five folds, improves prediction error and concordance, and ranks 7/16 in RSF permutation importance. Its single-variable AUC effect is small, so the evidence is supportive rather than proof of a large standalone gain.",
"- cigarettes_per_day: INVESTIGATE / DO NOT LOCK YET. It improves Brier and concordance modestly but slightly reduces AUC when added alone; it also pushes current_smoker to near-zero/negative RSF importance, indicating redundancy between smoking status and intensity. Consider a smoking representation strategy rather than automatically keeping both.",
"- heart_rate_bpm: INVESTIGATE FURTHER. It gives a small AUC gain in Cox/Fine-Gray but slightly worsens concordance/calibration and has very low RSF importance (rank 12/16). Its adjusted regression coefficient is consistently slightly negative for major CVD, which warrants clinical/methodological review before inclusion.",
"",
"## Important limitation",
"The v3 all-16 model improves over v2, but the gain is from the three-variable bundle. The one-at-a-time ablation helps isolate incremental effects in Cox/Fine-Gray, while RSF importance is exploratory full-data importance rather than an independent held-out effect estimate. These provisional Framingham teaching-data results do not establish Philippine clinical validity.",
"",
"## Files",
"- Metric comparison: analysis/reports/v3/V2_V3_METRIC_COMPARISON.csv",
"- Fold stability: analysis/reports/v3/V2_V3_FOLD_STABILITY_COMPARISON.csv",
"- Computational comparison: analysis/reports/v3/V2_V3_COMPUTATIONAL_COMPARISON.csv",
"- Added-predictor evidence: analysis/reports/v3/V3_NEW_PREDICTOR_EVIDENCE_SUMMARY.csv",
"- Coefficient stability: analysis/reports/v3/V3_NEW_PREDICTOR_COEFFICIENT_STABILITY.csv",
"- RSF importance ranks: analysis/reports/v3/V3_RSF_IMPORTANCE_RANKS.csv",
"- Ablation metrics: analysis/results/v3/V3_INCREMENTAL_PREDICTOR_ABLATION_METRICS.csv"
]
(outdir/"V2_V3_PROVISIONAL_COMPARISON_REPORT.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
print("\n".join(lines))
