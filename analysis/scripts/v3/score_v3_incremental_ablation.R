.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(cmprsk))
suppressPackageStartupMessages(library(riskRegression))
suppressPackageStartupMessages(library(prodlim))
suppressPackageStartupMessages(library(data.table))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
d <- fread(file.path(root,"data","processed","pintig_frozen_clean_analysis_v3_16predictors.csv"))
setorder(d,participant_id)
pred <- fread(file.path(root,"analysis","results","v3","V3_INCREMENTAL_PREDICTOR_ABLATION_OOF.csv"))
tau <- 3652.5
specs <- c("v2_base13","plus_diabetes","plus_cigarettes_per_day","plus_heart_rate_bpm","v3_all16")
rows <- list()
for (spec_name in specs) {
  for (model_name in c("Cox","FineGray")) {
    p <- pred[specification==spec_name & model==model_name]
    setorder(p,participant_id)
    stopifnot(nrow(p)==4191L,identical(p$participant_id,d$participant_id))
    sc <- Score(object=list(M=matrix(p$risk10,ncol=1)),
                formula=Hist(analysis_time_days,event_type)~1,
                data=d,cause=1,times=tau,metrics=c("auc","brier"),
                null.model=FALSE,cens.model="KaplanMeier",
                se.fit=FALSE,contrasts=FALSE,verbose=0)
    auc <- as.data.table(sc$AUC$score)$AUC[1]
    br <- as.data.table(sc$Brier$score)$Brier[1]
    pr <- pmin(pmax(p$risk10,1e-6),1-1e-6)
    z <- log(-log(1-pr))
    cal <- crr(ftime=d$analysis_time_days,fstatus=d$event_type,
               cov1=matrix(z,ncol=1),failcode=1,cencode=0,variance=FALSE)
    slope <- as.numeric(cal$coef)
    cc <- survival::concordance(Surv(d$analysis_time_days,d$event_type==1)~p$risk10,reverse=TRUE)$concordance
    rows[[paste(spec_name,model_name,sep="__")]] <- data.table(
      specification=spec_name,model=model_name,
      AUC=auc,Brier=br,calibration_slope=slope,
      cause_specific_harrell_c=cc,mean_predicted=mean(p$risk10)
    )
  }
}
res <- rbindlist(rows)
base <- res[specification=="v2_base13",.(model,base_AUC=AUC,base_Brier=Brier,
                                       base_slope=calibration_slope,base_C=cause_specific_harrell_c)]
res <- merge(res,base,by="model",all.x=TRUE)
res[,delta_AUC_vs_base:=AUC-base_AUC]
res[,delta_Brier_vs_base:=Brier-base_Brier]
res[,delta_abs_slope_error_vs_base:=abs(calibration_slope-1)-abs(base_slope-1)]
res[,delta_C_vs_base:=cause_specific_harrell_c-base_C]
setorder(res,model,specification)
fwrite(res,file.path(root,"analysis","results","v3","V3_INCREMENTAL_PREDICTOR_ABLATION_METRICS.csv"))
cat("ABLATION SCORING COMPLETE\n")
print(res)
