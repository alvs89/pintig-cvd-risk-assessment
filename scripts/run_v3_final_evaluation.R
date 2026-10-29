.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(cmprsk))
suppressPackageStartupMessages(library(randomForestSRC))
suppressPackageStartupMessages(library(riskRegression))
suppressPackageStartupMessages(library(prodlim))
suppressPackageStartupMessages(library(data.table))

root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts","pintig_v3_modeling_config.R"))
infile <- file.path(root,"data","processed","pintig_frozen_clean_analysis_v3_16predictors.csv")
outdir <- file.path(root,"analysis","modeling","v3_16predictors","final_evaluation")
dir.create(outdir,recursive=TRUE,showWarnings=FALSE)

d <- fread(infile)
setorder(d,participant_id)
preds <- pintig_v3_predictors
tau <- 3652.5
eval_times <- seq(365.25/4,tau,by=365.25/4)
stopifnot(
  nrow(d)==4191L,uniqueN(d$participant_id)==4191L,length(preds)==16L,
  sum(d$event_type==1)==369L,sum(d$event_type==2)==218L,
  length(eval_times)==40L,tail(eval_times,1)==tau
)

sel <- fread(file.path(root,"analysis","modeling","v3_16predictors","v3_rsf_selected_hyperparameters.csv"))
stopifnot(nrow(sel)==5L)

cox_cif_matrix <- function(c1,c2,newdata,eval_times) {
  bh1 <- basehaz(c1,centered=FALSE)
  bh2 <- basehaz(c2,centered=FALSE)
  jump_times <- sort(unique(c(bh1$time,bh2$time)))
  jump_times <- jump_times[jump_times <= max(eval_times)]
  H1 <- approx(bh1$time,bh1$hazard,xout=jump_times,method="constant",f=0,rule=2)$y
  H2 <- approx(bh2$time,bh2$hazard,xout=jump_times,method="constant",f=0,rule=2)$y
  dH1 <- c(H1[1],diff(H1))
  dH2 <- c(H2[1],diff(H2))
  rr1 <- exp(predict(c1,newdata=newdata,type="lp",reference="zero"))
  rr2 <- exp(predict(c2,newdata=newdata,type="lp",reference="zero"))
  n <- nrow(newdata)
  out <- matrix(0,n,length(eval_times))
  S <- rep(1,n)
  F1 <- rep(0,n)
  eidx <- 1L
  for (k in seq_along(jump_times)) {
    dh1 <- pmax(dH1[k],0)*rr1
    dh2 <- pmax(dH2[k],0)*rr2
    F1 <- F1 + S*dh1
    S <- S*exp(-(dh1+dh2))
    while (eidx <= length(eval_times) &&
           (k==length(jump_times) || eval_times[eidx] < jump_times[k+1])) {
      if (eval_times[eidx] >= jump_times[k]) out[,eidx] <- F1
      eidx <- eidx+1L
    }
  }
  while (eidx <= length(eval_times)) {
    out[,eidx] <- F1
    eidx <- eidx+1L
  }
  pmin(pmax(out,0),1)
}

fg_cif_matrix <- function(fg,xnew,eval_times) {
  pr <- predict(fg,cov1=xnew)
  tt <- pr[,1]
  vals <- pr[,-1,drop=FALSE]
  out <- matrix(0,nrow(xnew),length(eval_times))
  for (j in seq_along(eval_times)) {
    idx <- which(tt <= eval_times[j])
    if (length(idx)>0) out[,j] <- vals[max(idx),]
  }
  pmin(pmax(out,0),1)
}

rsf_cif_matrix <- function(pr,eval_times) {
  cn <- dimnames(pr$cif)[[3]]
  ci <- match("CIF.1",cn)
  if (is.na(ci)) ci <- 1L
  out <- matrix(0,dim(pr$cif)[1],length(eval_times))
  for (j in seq_along(eval_times)) {
    idx <- which(pr$time.interest <= eval_times[j])
    if (length(idx)>0) out[,j] <- pr$cif[,max(idx),ci]
  }
  pmin(pmax(out,0),1)
}

N <- nrow(d)
Tn <- length(eval_times)
coxmat <- matrix(NA_real_,N,Tn)
fgmat <- matrix(NA_real_,N,Tn)
rsfmat <- matrix(NA_real_,N,Tn)
fold_runtime <- list()
fold_imputation <- list()

form_c1 <- as.formula(paste("Surv(analysis_time_days,event_type==1)~",paste(preds,collapse="+")))
form_c2 <- as.formula(paste("Surv(analysis_time_days,event_type==2)~",paste(preds,collapse="+")))
form_rsf <- as.formula(paste("Surv(analysis_time_days,event_type)~",paste(preds,collapse="+")))

for (outer in 1:5) {
  cat("Reconstructing v3 full risk curves, outer fold",outer,"\n")
  tr_raw <- copy(d[outer_fold != outer])
  te_raw <- copy(d[outer_fold == outer])
  z <- pintig_impute_train_validation_v3(tr_raw,te_raw)
  tr <- z$train
  te <- z$validation
  imp <- z$imputer
  fold_imputation[[outer]] <- data.table(
    outer_fold=outer,
    bp_medication_mode=imp$bp_medication_mode,
    smoker_cigarettes_per_day_median=imp$current_smoker_cigarettes_per_day_median,
    heart_rate_bpm_median=imp$heart_rate_bpm_median
  )

  t0 <- proc.time()[["elapsed"]]
  c1 <- coxph(form_c1,data=tr,ties="efron",x=TRUE)
  c2 <- coxph(form_c2,data=tr,ties="efron",x=TRUE)
  cm <- cox_cif_matrix(c1,c2,te,eval_times)
  tcox <- proc.time()[["elapsed"]]-t0

  t0 <- proc.time()[["elapsed"]]
  fg <- crr(
    ftime=tr$analysis_time_days,fstatus=tr$event_type,
    cov1=as.matrix(tr[,..preds]),failcode=1,cencode=0,variance=TRUE
  )
  fm <- fg_cif_matrix(fg,as.matrix(te[,..preds]),eval_times)
  tfg <- proc.time()[["elapsed"]]-t0

  hp <- sel[outer_fold==outer]
  t0 <- proc.time()[["elapsed"]]
  rf <- rfsrc(
    form_rsf,
    data=tr[,c("analysis_time_days","event_type",preds),with=FALSE],
    ntree=hp$ntree,mtry=hp$mtry,nodesize=hp$nodesize,nsplit=hp$nsplit,
    splitrule="logrankCR",cause=1,
    seed=202740000L+outer
  )
  rp <- predict(rf,newdata=te[,..preds])
  rmv <- rsf_cif_matrix(rp,eval_times)
  trsf <- proc.time()[["elapsed"]]-t0

  ii <- match(te$participant_id,d$participant_id)
  coxmat[ii,] <- cm
  fgmat[ii,] <- fm
  rsfmat[ii,] <- rmv

  fold_runtime[[outer]] <- data.table(
    outer_fold=outer,cox_seconds=tcox,finegray_seconds=tfg,rsf_seconds=trsf
  )
  rm(c1,c2,fg,rf,rp,cm,fm,rmv); gc(FALSE)
}

stopifnot(
  !anyNA(coxmat),!anyNA(fgmat),!anyNA(rsfmat),
  all(coxmat>=0 & coxmat<=1),
  all(fgmat>=0 & fgmat<=1),
  all(rsfmat>=0 & rsfmat<=1)
)
colnames(coxmat) <- colnames(fgmat) <- colnames(rsfmat) <- paste0("t",seq_len(Tn))

oof10 <- data.table(
  participant_id=d$participant_id,outer_fold=d$outer_fold,
  analysis_time_days=d$analysis_time_days,event_type=d$event_type,
  Cox=coxmat[,Tn],FineGray=fgmat[,Tn],RSF=rsfmat[,Tn]
)
fwrite(oof10,file.path(outdir,"v3_all_models_oof_10y_predictions.csv"))
saveRDS(list(times=eval_times,Cox=coxmat,FineGray=fgmat,RSF=rsfmat),
        file.path(outdir,"v3_oof_risk_curves_quarterly.rds"))

sc <- Score(
  object=list(Cox=coxmat,FineGray=fgmat,RSF=rsfmat),
  formula=Hist(analysis_time_days,event_type)~1,
  data=d,cause=1,times=eval_times,
  metrics=c("auc","brier"),summary="ibs",
  null.model=FALSE,cens.model="KaplanMeier",
  se.fit=TRUE,contrasts=list(c(1,2),c(1,3),c(2,3)),
  conf.int=0.95,verbose=0
)
saveRDS(sc,file.path(outdir,"v3_riskRegression_Score_pooled.rds"))

auc_curve <- as.data.table(sc$AUC$score)
brier_curve <- as.data.table(sc$Brier$score)
fwrite(auc_curve,file.path(outdir,"v3_pooled_time_dependent_auc.csv"))
fwrite(brier_curve,file.path(outdir,"v3_pooled_brier_curve.csv"))

ibs_from_curve <- brier_curve[,{
  xx <- c(0,times)
  yy <- c(0,Brier)
  .(IBS=sum(diff(xx)*(head(yy,-1)+tail(yy,-1))/2)/max(xx))
},by=model]
fwrite(ibs_from_curve,file.path(outdir,"v3_pooled_ibs_trapezoid.csv"))

auc10 <- auc_curve[abs(times-tau)<1e-6]
brier10 <- brier_curve[abs(times-tau)<1e-6]
fwrite(auc10,file.path(outdir,"v3_pooled_10y_auc.csv"))
fwrite(brier10,file.path(outdir,"v3_pooled_10y_brier.csv"))

fold_metrics <- list()
for (outer in 1:5) {
  idx <- which(d$outer_fold==outer)
  sfold <- Score(
    object=list(
      Cox=coxmat[idx,,drop=FALSE],
      FineGray=fgmat[idx,,drop=FALSE],
      RSF=rsfmat[idx,,drop=FALSE]
    ),
    formula=Hist(analysis_time_days,event_type)~1,
    data=d[idx],cause=1,times=eval_times,
    metrics=c("auc","brier"),summary=NULL,
    null.model=FALSE,cens.model="KaplanMeier",
    se.fit=FALSE,contrasts=FALSE,verbose=0
  )
  a <- as.data.table(sfold$AUC$score)[abs(times-tau)<1e-6,.(model,AUC)]
  b <- as.data.table(sfold$Brier$score)[abs(times-tau)<1e-6,.(model,Brier)]
  bc <- as.data.table(sfold$Brier$score)
  ib <- bc[,{
    xx <- c(0,times)
    yy <- c(0,Brier)
    .(IBS=sum(diff(xx)*(head(yy,-1)+tail(yy,-1))/2)/max(xx))
  },by=model]
  zz <- Reduce(function(x,y) merge(x,y,by="model"),list(a,b,ib))
  zz[,outer_fold:=outer]
  fold_metrics[[outer]] <- zz
}
fold_metrics <- rbindlist(fold_metrics)
setcolorder(fold_metrics,c("outer_fold","model","AUC","Brier","IBS"))
fwrite(fold_metrics,file.path(outdir,"v3_fold_specific_primary_metrics.csv"))
fold_summary <- fold_metrics[,.(AUC_mean=mean(AUC),AUC_sd=sd(AUC),
                               Brier_mean=mean(Brier),Brier_sd=sd(Brier),
                               IBS_mean=mean(IBS),IBS_sd=sd(IBS)),by=model]
fwrite(fold_summary,file.path(outdir,"v3_fold_metric_mean_sd.csv"))

overall_aj_fit <- prodlim(Hist(analysis_time_days,event_type)~1,data=d)
overall_aj <- as.numeric(predictRisk(overall_aj_fit,newdata=d[1],times=tau,cause=1))

cal_rows <- list()
cal_summary <- list()
model_risks <- list(Cox=coxmat[,Tn],FineGray=fgmat[,Tn],RSF=rsfmat[,Tn])
for (nm in names(model_risks)) {
  rr <- model_risks[[nm]]
  grp <- ceiling(rank(rr,ties.method="first")/(length(rr)/10))
  grp[grp<1] <- 1
  grp[grp>10] <- 10
  tmp <- copy(d)
  tmp[,cal_group:=grp]
  tmp[,pred:=rr]
  rows_nm <- list()
  for (g in 1:10) {
    sg <- tmp[cal_group==g]
    ajfit <- prodlim(Hist(analysis_time_days,event_type)~1,data=sg)
    obs <- as.numeric(predictRisk(ajfit,newdata=sg[1],times=tau,cause=1))
    rows_nm[[g]] <- data.table(
      model=nm,decile=g,n=nrow(sg),events=sum(sg$event_type==1),
      competing_deaths=sum(sg$event_type==2),
      mean_predicted=mean(sg$pred),observed_AJ_CIF=obs,
      absolute_error=abs(mean(sg$pred)-obs)
    )
  }
  cal_rows[[nm]] <- rbindlist(rows_nm)
  cal_summary[[nm]] <- data.table(
    model=nm,mean_predicted=mean(rr),overall_observed_AJ_CIF=overall_aj,
    calibration_in_large_difference=mean(rr)-overall_aj,
    observed_to_expected_ratio=overall_aj/mean(rr),
    mean_abs_decile_calibration_error=mean(cal_rows[[nm]]$absolute_error)
  )
}
calibration <- rbindlist(cal_rows)
cal_summary <- rbindlist(cal_summary)
fwrite(calibration,file.path(outdir,"v3_calibration_deciles_10y.csv"))
fwrite(cal_summary,file.path(outdir,"v3_calibration_summary_10y.csv"))

cloglog <- function(p) log(-log(1-p))
slopes <- list()
for (nm in names(model_risks)) {
  pr <- pmin(pmax(model_risks[[nm]],1e-6),1-1e-6)
  z <- cloglog(pr)
  fgcal <- crr(
    ftime=d$analysis_time_days,fstatus=d$event_type,
    cov1=matrix(z,ncol=1),failcode=1,cencode=0,variance=TRUE
  )
  beta <- as.numeric(fgcal$coef)
  se <- sqrt(as.numeric(fgcal$var))
  citl <- cloglog(overall_aj)-cloglog(mean(pr))
  slopes[[nm]] <- data.table(
    model=nm,calibration_slope=beta,calibration_slope_se=se,
    calibration_slope_lower95=beta-1.959964*se,
    calibration_slope_upper95=beta+1.959964*se,
    calibration_in_large_cloglog=citl
  )
}
slopes <- rbindlist(slopes)
fwrite(slopes,file.path(outdir,"v3_calibration_slope_citl_10y.csv"))

concord <- rbindlist(lapply(names(model_risks),function(nm){
  rr <- model_risks[[nm]]
  fit <- survival::concordance(
    Surv(d$analysis_time_days,d$event_type==1)~rr,
    reverse=TRUE
  )
  data.table(
    model=nm,cause_specific_harrell_c=fit$concordance,
    concordance_se=sqrt(fit$var)
  )
}))
fwrite(concord,file.path(outdir,"v3_secondary_cause_specific_concordance.csv"))

get_col <- function(D,candidate) {
  x <- candidate[candidate %in% names(D)]
  if (length(x)==0) return(rep(NA_real_,nrow(D)))
  D[[x[1]]]
}
a10 <- auc10[,.(model,AUC,
                AUC_lower=get_col(.SD,c("lower","Lower")),
                AUC_upper=get_col(.SD,c("upper","Upper")))]
b10 <- brier10[,.(model,Brier,
                  Brier_lower=get_col(.SD,c("lower","Lower")),
                  Brier_upper=get_col(.SD,c("upper","Upper")))]
comp <- merge(a10,b10,by="model",all=TRUE)
comp <- merge(comp,ibs_from_curve,by="model",all=TRUE)
comp <- merge(comp,slopes,by="model",all=TRUE)
comp <- merge(comp,cal_summary,by="model",all=TRUE)
comp <- merge(comp,concord,by="model",all=TRUE)
setorder(comp,IBS,Brier,-AUC)
fwrite(comp,file.path(outdir,"V3_FINAL_MODEL_COMPARISON.csv"))

fwrite(rbindlist(fold_runtime),file.path(outdir,"v3_final_outer_refit_runtime.csv"))
fwrite(rbindlist(fold_imputation),file.path(outdir,"v3_final_outer_imputation.csv"))
fwrite(data.table(eval_time_days=eval_times),file.path(outdir,"v3_evaluation_time_grid.csv"))

report <- c(
  "# PINTIG v3 16-Predictor Provisional Evaluation","",
  "This evaluation uses the same 4,191 participants, outcomes, and five outer folds as the frozen v2 analysis.",
  "The three added raw Framingham predictors are diabetes, cigarettes_per_day, and heart_rate_bpm.",
  "Missing predictor values are imputed from the training partition only.","",
  "## Final comparison",
  capture.output(print(comp)),"",
  "## Five-fold mean and SD",
  capture.output(print(fold_summary)),"",
  "These remain provisional Framingham teaching-dataset results and are not Philippine clinical validation."
)
writeLines(report,file.path(outdir,"V3_FINAL_EVALUATION_REPORT.md"))

cat("\nV3 FINAL EVALUATION COMPLETE\n")
print(comp)
