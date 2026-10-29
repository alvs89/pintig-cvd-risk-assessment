.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(cmprsk))
suppressPackageStartupMessages(library(riskRegression))
suppressPackageStartupMessages(library(prodlim))
suppressPackageStartupMessages(library(data.table))

root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts","pintig_v3_modeling_config.R"))
d <- fread(file.path(root,"data","processed","pintig_frozen_clean_analysis_v3_16predictors.csv"))
setorder(d,participant_id)
tau <- 3652.5

base13 <- c(
  "age_years","sex_male","sbp_mmhg","dbp_mmhg","waist_cm","current_smoker",
  "hypertension_history","bp_medication","alcohol_drinks_week","activity_min_week",
  "diet_score_0_100","ses_index_0_100","family_history_cvd"
)
specs <- list(
  v2_base13=base13,
  plus_diabetes=c(base13,"diabetes"),
  plus_cigarettes_per_day=c(base13,"cigarettes_per_day"),
  plus_heart_rate_bpm=c(base13,"heart_rate_bpm"),
  v3_all16=c(base13,"diabetes","cigarettes_per_day","heart_rate_bpm")
)

cox_predict_10 <- function(tr,te,preds) {
  f1 <- as.formula(paste("Surv(analysis_time_days,event_type==1)~",paste(preds,collapse="+")))
  f2 <- as.formula(paste("Surv(analysis_time_days,event_type==2)~",paste(preds,collapse="+")))
  c1 <- coxph(f1,data=tr,ties="efron",x=TRUE)
  c2 <- coxph(f2,data=tr,ties="efron",x=TRUE)
  b1 <- basehaz(c1,centered=FALSE); b2 <- basehaz(c2,centered=FALSE)
  ts <- sort(unique(c(b1$time[b1$time<=tau],b2$time[b2$time<=tau],tau)))
  H1 <- approx(b1$time,b1$hazard,xout=ts,method="constant",f=0,rule=2)$y
  H2 <- approx(b2$time,b2$hazard,xout=ts,method="constant",f=0,rule=2)$y
  d1 <- c(H1[1],diff(H1)); d2 <- c(H2[1],diff(H2))
  rr1 <- exp(predict(c1,newdata=te,type="lp",reference="zero"))
  rr2 <- exp(predict(c2,newdata=te,type="lp",reference="zero"))
  S <- rep(1,nrow(te)); F <- rep(0,nrow(te))
  for(k in seq_along(ts)) {
    a <- pmax(d1[k],0)*rr1; b <- pmax(d2[k],0)*rr2
    F <- F + S*a
    S <- S*exp(-(a+b))
  }
  pmin(pmax(F,0),1)
}

fg_predict_10 <- function(tr,te,preds) {
  fg <- crr(ftime=tr$analysis_time_days,fstatus=tr$event_type,
            cov1=as.matrix(tr[,..preds]),failcode=1,cencode=0,variance=FALSE)
  pr <- predict(fg,cov1=as.matrix(te[,..preds]))
  tt <- pr[,1]; idx <- max(which(tt<=tau))
  pmin(pmax(as.numeric(pr[idx,-1]),0),1)
}

allpred <- list()
for (spec_name in names(specs)) {
  preds <- specs[[spec_name]]
  for (model in c("Cox","FineGray")) {
    risk <- rep(NA_real_,nrow(d))
    for (outer in 1:5) {
      tr_raw <- copy(d[outer_fold!=outer]); te_raw <- copy(d[outer_fold==outer])
      z <- pintig_impute_train_validation_v3(tr_raw,te_raw)
      tr <- z$train; te <- z$validation
      rr <- if(model=="Cox") cox_predict_10(tr,te,preds) else fg_predict_10(tr,te,preds)
      risk[match(te$participant_id,d$participant_id)] <- rr
    }
    stopifnot(!anyNA(risk))
    allpred[[paste(spec_name,model,sep="__")]] <- data.table(
      participant_id=d$participant_id,outer_fold=d$outer_fold,
      analysis_time_days=d$analysis_time_days,event_type=d$event_type,
      specification=spec_name,model=model,risk10=risk
    )
    cat("Predictions complete:",spec_name,model,"\n")
  }
}
pred <- rbindlist(allpred)
outdir <- file.path(root,"analysis","results","v3")
dir.create(outdir,recursive=TRUE,showWarnings=FALSE)
fwrite(pred,file.path(outdir,"V3_INCREMENTAL_PREDICTOR_ABLATION_OOF.csv"))

rows <- list()
for (spec_name in names(specs)) {
  for (model_name in c("Cox","FineGray")) {
    p <- pred[specification==spec_name & model==model_name]
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
      specification=spec_name,model=model_name,predictor_count=length(specs[[spec_name]]),
      AUC=auc,Brier=br,calibration_slope=slope,cause_specific_harrell_c=cc,
      mean_predicted=mean(p$risk10)
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
fwrite(res,file.path(outdir,"V3_INCREMENTAL_PREDICTOR_ABLATION_METRICS.csv"))
cat("INCREMENTAL PREDICTOR ABLATION COMPLETE\n")
print(res)
