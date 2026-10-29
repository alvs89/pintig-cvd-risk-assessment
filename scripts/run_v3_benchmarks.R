.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(cmprsk))
suppressPackageStartupMessages(library(data.table))

root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts","pintig_v3_modeling_config.R"))
infile <- file.path(root,"data","processed","pintig_frozen_clean_analysis_v3_16predictors.csv")
outdir <- file.path(root,"analysis","modeling","v3_16predictors")
dir.create(outdir, showWarnings=FALSE, recursive=TRUE)

d <- fread(infile)
preds <- pintig_v3_predictors
tau <- 3652.5
stopifnot(
  nrow(d)==4191L, uniqueN(d$participant_id)==4191L,
  length(preds)==16L,
  sum(d$event_type==1)==369L,
  sum(d$event_type==2)==218L,
  sum(d$event_type==0)==3604L
)

cox_oof <- list()
fg_oof <- list()
cox_coef <- list()
fg_coef <- list()
fold_summary <- list()

for (fold in 1:5) {
  tr_raw <- copy(d[outer_fold != fold])
  te_raw <- copy(d[outer_fold == fold])
  z <- pintig_impute_train_validation_v3(tr_raw, te_raw)
  tr <- z$train
  te <- z$validation
  imp <- z$imputer

  f1 <- as.formula(paste("Surv(analysis_time_days, event_type==1) ~", paste(preds, collapse="+")))
  f2 <- as.formula(paste("Surv(analysis_time_days, event_type==2) ~", paste(preds, collapse="+")))
  c1 <- coxph(f1, data=tr, ties="efron", x=TRUE)
  c2 <- coxph(f2, data=tr, ties="efron", x=TRUE)

  bh1 <- basehaz(c1, centered=FALSE)
  bh2 <- basehaz(c2, centered=FALSE)
  times <- sort(unique(c(bh1$time[bh1$time<=tau], bh2$time[bh2$time<=tau], tau)))
  H1 <- approx(bh1$time,bh1$hazard,xout=times,method="constant",f=0,rule=2)$y
  H2 <- approx(bh2$time,bh2$hazard,xout=times,method="constant",f=0,rule=2)$y
  dH1 <- c(H1[1],diff(H1))
  dH2 <- c(H2[1],diff(H2))
  rr1 <- exp(predict(c1,newdata=te,type="lp",reference="zero"))
  rr2 <- exp(predict(c2,newdata=te,type="lp",reference="zero"))
  cif <- numeric(nrow(te))
  surv_now <- rep(1,nrow(te))
  for (k in seq_along(times)) {
    dh1 <- pmax(dH1[k],0)*rr1
    dh2 <- pmax(dH2[k],0)*rr2
    cif <- cif + surv_now*dh1
    surv_now <- surv_now*exp(-(dh1+dh2))
  }
  cif <- pmin(pmax(cif,0),1)

  cox_oof[[fold]] <- data.table(
    participant_id=te$participant_id,outer_fold=fold,
    analysis_time_days=te$analysis_time_days,event_type=te$event_type,
    pred_cif_major_cvd_10y=cif
  )

  cc1 <- summary(c1)$coefficients
  cc2 <- summary(c2)$coefficients
  cox_coef[[fold]] <- rbind(
    data.table(outer_fold=fold,cause="major_cvd",feature=rownames(cc1),
               coefficient=cc1[,"coef"],hazard_ratio=cc1[,"exp(coef)"]),
    data.table(outer_fold=fold,cause="competing_death",feature=rownames(cc2),
               coefficient=cc2[,"coef"],hazard_ratio=cc2[,"exp(coef)"])
  )

  xtr <- as.matrix(tr[,..preds])
  xte <- as.matrix(te[,..preds])
  fg <- crr(ftime=tr$analysis_time_days,fstatus=tr$event_type,
            cov1=xtr,failcode=1,cencode=0,variance=TRUE)
  pg <- predict(fg,cov1=xte)
  tt <- pg[,1]
  idx <- max(which(tt<=tau))
  fgpred <- pmin(pmax(as.numeric(pg[idx,-1]),0),1)

  fg_oof[[fold]] <- data.table(
    participant_id=te$participant_id,outer_fold=fold,
    analysis_time_days=te$analysis_time_days,event_type=te$event_type,
    pred_cif_major_cvd_10y=fgpred
  )
  fg_coef[[fold]] <- data.table(
    outer_fold=fold,feature=names(fg$coef),coefficient=as.numeric(fg$coef),
    subdistribution_hazard_ratio=exp(as.numeric(fg$coef))
  )

  fold_summary[[fold]] <- data.table(
    outer_fold=fold,n_train=nrow(tr),n_eval=nrow(te),
    eval_major_cvd=sum(te$event_type==1),
    eval_competing_death=sum(te$event_type==2),
    bp_medication_impute=imp$bp_medication_mode,
    smoker_cigarettes_per_day_impute=imp$current_smoker_cigarettes_per_day_median,
    heart_rate_bpm_impute=imp$heart_rate_bpm_median,
    cox_mean_10y=mean(cif),cox_min_10y=min(cif),cox_max_10y=max(cif),
    fg_converged=isTRUE(fg$converged),
    fg_mean_10y=mean(fgpred),fg_min_10y=min(fgpred),fg_max_10y=max(fgpred)
  )
  cat("Completed benchmark fold",fold,"\n")
}

cox_oof <- rbindlist(cox_oof)[order(participant_id)]
fg_oof <- rbindlist(fg_oof)[order(participant_id)]
fold_summary <- rbindlist(fold_summary)
stopifnot(
  nrow(cox_oof)==4191L,nrow(fg_oof)==4191L,
  all(cox_oof$pred_cif_major_cvd_10y>=0 & cox_oof$pred_cif_major_cvd_10y<=1),
  all(fg_oof$pred_cif_major_cvd_10y>=0 & fg_oof$pred_cif_major_cvd_10y<=1)
)

fwrite(cox_oof,file.path(outdir,"v3_cox_oof_predictions.csv"))
fwrite(fg_oof,file.path(outdir,"v3_finegray_oof_predictions.csv"))
fwrite(rbindlist(cox_coef),file.path(outdir,"v3_cox_fold_coefficients.csv"))
fwrite(rbindlist(fg_coef),file.path(outdir,"v3_finegray_fold_coefficients.csv"))
fwrite(fold_summary,file.path(outdir,"v3_benchmark_fold_summary.csv"))

cat("\nV3 COX/FINE-GRAY BENCHMARKS COMPLETE\n")
print(fold_summary)
