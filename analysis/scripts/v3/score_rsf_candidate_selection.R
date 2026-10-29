.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(data.table))
suppressPackageStartupMessages(library(riskRegression))
suppressPackageStartupMessages(library(prodlim))
suppressPackageStartupMessages(library(cmprsk))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
d <- fread(file.path(root,"data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv"))
setorder(d,participant_id)
tau <- 3652.5
rows <- list()
for (n in c(14L,15L)) {
  base <- file.path(root,"analysis/modeling",paste0("rsf_selection_candidate_",n),"folds")
  paths <- file.path(base,paste0("fold_",1:5),"rsf_oof_predictions.csv")
  if (!all(file.exists(paths))) {
    cat("NOT COMPLETE:",n,"missing:",paste(paths[!file.exists(paths)],collapse="; "), "\n")
    next
  }
  x <- rbindlist(lapply(paths,fread))
  setorder(x,participant_id)
  stopifnot(nrow(x)==nrow(d),uniqueN(x$participant_id)==4191L,
            identical(x$participant_id,d$participant_id),
            identical(x$event_type,d$event_type),
            identical(x$analysis_time_days,d$analysis_time_days),
            identical(x$outer_fold,d$outer_fold))
  r <- x$pred_cif_major_cvd_10y
  stopifnot(all(is.finite(r)), all(r>=0 & r<=1))
  sc <- Score(object=list(RSF=matrix(r,ncol=1)),
     formula=Hist(analysis_time_days,event_type)~1,data=d,cause=1,
     times=tau,metrics=c("auc","brier"),null.model=FALSE,
     cens.model="KaplanMeier",se.fit=FALSE,contrasts=FALSE,verbose=0)
  auc <- as.data.table(sc$AUC$score)$AUC[1]
  brier <- as.data.table(sc$Brier$score)$Brier[1]
  z <- log(-log(1-pmin(pmax(r,1e-6),1-1e-6)))
  slope <- as.numeric(crr(d$analysis_time_days,d$event_type,
                          cov1=matrix(z,ncol=1),failcode=1,cencode=0,variance=FALSE)$coef)
  rows[[as.character(n)]] <- data.table(predictor_count=n,n=length(r),
     AUC=auc,Brier=brier,calibration_slope=slope,mean_predicted=mean(r))
}
out <- file.path(root,"analysis/results/v3/RSF_FOCUSED_SELECTION_POOLED.csv")
if (length(rows)) {fwrite(rbindlist(rows),out);print(rbindlist(rows));cat("Saved:",out,"\n")}
if(length(rows)!=2L) quit(status=2L)
