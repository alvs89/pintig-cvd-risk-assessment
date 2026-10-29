.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(cmprsk))
suppressPackageStartupMessages(library(riskRegression))
suppressPackageStartupMessages(library(prodlim))
suppressPackageStartupMessages(library(data.table))

root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts","pintig_v3_modeling_config.R"))
d <- fread(file=file.path(root,"data","processed","pintig_frozen_clean_analysis_v3_16predictors.csv"))
setorder(d,participant_id)
tau <- 3652.5

base13 <- setdiff(pintig_v3_predictors,c("diabetes","cigarettes_per_day","heart_rate_bpm"))
variants <- list(
  base13=base13,
  plus_all3=pintig_v3_predictors,
  without_diabetes=setdiff(pintig_v3_predictors,"diabetes"),
  without_cigarettes_per_day=setdiff(pintig_v3_predictors,"cigarettes_per_day"),
  without_heart_rate_bpm=setdiff(pintig_v3_predictors,"heart_rate_bpm")
)

cox_cif10 <- function(c1,c2,newdata,tau) {
  bh1 <- basehaz(c1,centered=FALSE); bh2 <- basehaz(c2,centered=FALSE)
  times <- sort(unique(c(bh1$time[bh1$time<=tau],bh2$time[bh2$time<=tau],tau)))
  H1 <- approx(bh1$time,bh1$hazard,xout=times,method="constant",f=0,rule=2)$y
  H2 <- approx(bh2$time,bh2$hazard,xout=times,method="constant",f=0,rule=2)$y
  dH1 <- c(H1[1],diff(H1)); dH2 <- c(H2[1],diff(H2))
  rr1 <- exp(predict(c1,newdata=newdata,type="lp",reference="zero"))
  rr2 <- exp(predict(c2,newdata=newdata,type="lp",reference="zero"))
  F1 <- numeric(nrow(newdata)); S <- rep(1,nrow(newdata))
  for(k in seq_along(times)) {
    h1 <- pmax(dH1[k],0)*rr1; h2 <- pmax(dH2[k],0)*rr2
    F1 <- F1 + S*h1; S <- S*exp(-(h1+h2))
  }
  pmin(pmax(F1,0),1)
}

get_metrics <- function(pred,name,variant) {
  sc <- Score(object=list(model=matrix(pred,ncol=1)),
              formula=Hist(analysis_time_days,event_type)~1,
              data=d,cause=1,times=tau,metrics=c("auc","brier"),
              summary=NULL,null.model=FALSE,cens.model="KaplanMeier",
              se.fit=FALSE,contrasts=FALSE,verbose=0)
  auc <- as.data.table(sc$AUC$score)$AUC[1]
  bri <- as.data.table(sc$Brier$score)$Brier[1]
  pr <- pmin(pmax(pred,1e-6),1-1e-6)
  z <- log(-log(1-pr))
  cal <- crr(ftime=d$analysis_time_days,fstatus=d$event_type,cov1=matrix(z,ncol=1),
             failcode=1,cencode=0,variance=TRUE)
  ajfit <- prodlim(Hist(analysis_time_days,event_type)~1,data=d)
  obs <- as.numeric(predictRisk(ajfit,newdata=d[1],times=tau,cause=1))
  data.table(variant=variant,model=name,predictor_count=length(variants[[variant]]),
             AUC=auc,Brier=bri,calibration_slope=as.numeric(cal$coef),
             mean_predicted=mean(pred),observed_AJ=obs,
             CITL_cloglog=log(-log(1-obs))-log(-log(1-mean(pr))))
}

predrows <- list(); metrics <- list()
for(vn in names(variants)) {
  preds <- variants[[vn]]
  cat("Variant",vn,"with",length(preds),"predictors\n")
  cp <- rep(NA_real_,nrow(d)); fp <- rep(NA_real_,nrow(d))
  for(fold in 1:5) {
    trr <- copy(d[outer_fold!=fold]); ter <- copy(d[outer_fold==fold])
    z <- pintig_impute_train_validation_v3(trr,ter)
    tr <- z$train; te <- z$validation
    f1 <- as.formula(paste("Surv(analysis_time_days,event_type==1)~",paste(preds,collapse="+")))
    f2 <- as.formula(paste("Surv(analysis_time_days,event_type==2)~",paste(preds,collapse="+")))
    c1 <- coxph(f1,data=tr,ties="efron",x=TRUE)
    c2 <- coxph(f2,data=tr,ties="efron",x=TRUE)
    pc <- cox_cif10(c1,c2,te,tau)
    fg <- crr(ftime=tr$analysis_time_days,fstatus=tr$event_type,
              cov1=as.matrix(tr[,..preds]),failcode=1,cencode=0,variance=FALSE)
    pp <- predict(fg,cov1=as.matrix(te[,..preds]))
    idx <- max(which(pp[,1]<=tau))
    pf <- pmin(pmax(as.numeric(pp[idx,-1]),0),1)
    ii <- match(te$participant_id,d$participant_id)
    cp[ii] <- pc; fp[ii] <- pf
  }
  stopifnot(!anyNA(cp),!anyNA(fp))
  predrows[[paste0(vn,"_Cox")]] <- data.table(participant_id=d$participant_id,variant=vn,model="Cox",pred=cp)
  predrows[[paste0(vn,"_FineGray")]] <- data.table(participant_id=d$participant_id,variant=vn,model="FineGray",pred=fp)
  metrics[[paste0(vn,"_Cox")]] <- get_metrics(cp,"Cox",vn)
  metrics[[paste0(vn,"_FineGray")]] <- get_metrics(fp,"FineGray",vn)
}
mm <- rbindlist(metrics)
base <- mm[variant=="plus_all3",.(model,AUC_full=AUC,Brier_full=Brier)]
mm <- merge(mm,base,by="model",all.x=TRUE)
mm[,delta_AUC_vs_full:=AUC-AUC_full]
mm[,delta_Brier_vs_full:=Brier-Brier_full]
setorder(mm,model,variant)
outdir <- file.path(root,"analysis","results","v3")
fwrite(mm,file.path(outdir,"V3_NEW_PREDICTOR_LEAVE_ONE_OUT_COX_FINEGRAY.csv"))
fwrite(rbindlist(predrows),file.path(outdir,"V3_NEW_PREDICTOR_ABLATION_OOF_10Y.csv"))
cat("\nABLATION COMPLETE\n")
print(mm)
