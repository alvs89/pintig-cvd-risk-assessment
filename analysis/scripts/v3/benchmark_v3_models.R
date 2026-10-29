.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(cmprsk))
suppressPackageStartupMessages(library(randomForestSRC))
suppressPackageStartupMessages(library(data.table))

root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts","pintig_v3_modeling_config.R"))
d <- fread(file=file.path(root,"data","processed","pintig_frozen_clean_analysis_v3_16predictors.csv"))
imp <- pintig_learn_imputer_v3(d)
d <- pintig_apply_imputer_v3(d,imp)
preds <- pintig_v3_predictors
tau <- 3652.5
form1 <- as.formula(paste("Surv(analysis_time_days,event_type==1)~",paste(preds,collapse="+")))
form2 <- as.formula(paste("Surv(analysis_time_days,event_type==2)~",paste(preds,collapse="+")))
formr <- as.formula(paste("Surv(analysis_time_days,event_type)~",paste(preds,collapse="+")))
modeldir <- file.path(root,"analysis","modeling","v3_16predictors","provisional_full_data_models")
outdir <- file.path(root,"analysis","results","v3")
dir.create(modeldir,recursive=TRUE,showWarnings=FALSE)
dir.create(outdir,recursive=TRUE,showWarnings=FALSE)

times <- list()
cox_fits <- vector("list",3)
for(i in 1:3){
  t0<-proc.time()[["elapsed"]]
  c1<-coxph(form1,data=d,ties="efron",x=TRUE)
  c2<-coxph(form2,data=d,ties="efron",x=TRUE)
  sec<-proc.time()[["elapsed"]]-t0
  times[[length(times)+1]]<-data.table(model="Cox",run=i,seconds=sec)
  cox_fits[[i]]<-list(cause1=c1,cause2=c2)
}
cox<-cox_fits[[3]]
cox$bh1<-basehaz(cox$cause1,centered=FALSE); cox$bh2<-basehaz(cox$cause2,centered=FALSE)
cox$predictors<-preds; cox$imputer<-imp
coxfile<-file.path(modeldir,"pintig_v3_provisional_full_cox.rds")
saveRDS(cox,coxfile)

fg_fits<-vector("list",3)
for(i in 1:3){
  t0<-proc.time()[["elapsed"]]
  fg<-crr(ftime=d$analysis_time_days,fstatus=d$event_type,cov1=as.matrix(d[,..preds]),failcode=1,cencode=0,variance=TRUE)
  sec<-proc.time()[["elapsed"]]-t0
  times[[length(times)+1]]<-data.table(model="FineGray",run=i,seconds=sec)
  fg_fits[[i]]<-fg
}
fg<-fg_fits[[3]]
fgobj<-list(model=fg,predictors=preds,imputer=imp)
fgfile<-file.path(modeldir,"pintig_v3_provisional_full_finegray.rds")
saveRDS(fgobj,fgfile)

# Reuse the already fitted 500-tree full v3 RSF as run 1, and fit two identical benchmark replicates.
rsffile<-file.path(modeldir,"pintig_v3_provisional_full_rsf.rds")
rf<-readRDS(rsffile)
meta<-fread(file=file.path(modeldir,"v3_full_rsf_metadata.csv"))
times[[length(times)+1]]<-data.table(model="RSF",run=1L,seconds=meta$fit_seconds[1])
for(i in 2:3){
  t0<-proc.time()[["elapsed"]]
  z<-rfsrc(formr,data=d[,c("analysis_time_days","event_type",preds),with=FALSE],
           ntree=500,mtry=4,nodesize=20,nsplit=10,splitrule="logrankCR",cause=1,
           importance="permute",seed=202660005L+i)
  sec<-proc.time()[["elapsed"]]-t0
  times[[length(times)+1]]<-data.table(model="RSF",run=i,seconds=sec)
  if(i==3) rf<-z else rm(z)
  gc(FALSE)
}
# Preserve original full v3 RSF artifact; benchmark replicate is not substituted.

cox_risk10 <- function(obj,row,tau=3652.5){
  bh1<-obj$bh1; bh2<-obj$bh2
  ts<-sort(unique(c(bh1$time[bh1$time<=tau],bh2$time[bh2$time<=tau],tau)))
  H1<-approx(bh1$time,bh1$hazard,xout=ts,method="constant",f=0,rule=2)$y
  H2<-approx(bh2$time,bh2$hazard,xout=ts,method="constant",f=0,rule=2)$y
  d1<-c(H1[1],diff(H1)); d2<-c(H2[1],diff(H2))
  r1<-exp(predict(obj$cause1,newdata=row,type="lp",reference="zero"))
  r2<-exp(predict(obj$cause2,newdata=row,type="lp",reference="zero"))
  S<-1; F<-0
  for(k in seq_along(ts)){a<-pmax(d1[k],0)*r1;b<-pmax(d2[k],0)*r2;F<-F+S*a;S<-S*exp(-(a+b))}
  as.numeric(F)
}
fg_risk10 <- function(obj,row,tau=3652.5){
  xnew <- as.matrix(row[,obj$predictors,with=FALSE])
  pr<-predict(obj$model,cov1=xnew); j<-max(which(pr[,1]<=tau)); as.numeric(pr[j,2])
}
rsf_risk10 <- function(obj,row,tau=3652.5){
  pr<-predict(obj,newdata=row[,..preds]); j<-max(which(pr$time.interest<=tau))
  cn<-dimnames(pr$cif)[[3]]; ci<-match("CIF.1",cn); if(is.na(ci))ci<-1L
  as.numeric(pr$cif[1,j,ci])
}
row<-d[1]
for(i in 1:5){cox_risk10(cox,row);fg_risk10(fgobj,row);rsf_risk10(rf,row)}
bench <- function(fun,obj,n=500L){
  x<-numeric(n)
  for(i in seq_len(n)){t0<-proc.time()[["elapsed"]];invisible(fun(obj,row));x[i]<-(proc.time()[["elapsed"]]-t0)*1000}
  c(mean=mean(x),median=median(x),p95=as.numeric(quantile(x,.95)),sd=sd(x))
}
bc<-bench(cox_risk10,cox); bf<-bench(fg_risk10,fgobj); br<-bench(rsf_risk10,rf)
inf<-data.table(model=c("Cox","FineGray","RSF"),
                average_inference_ms=c(bc["mean"],bf["mean"],br["mean"]),
                median_inference_ms=c(bc["median"],bf["median"],br["median"]),
                p95_inference_ms=c(bc["p95"],bf["p95"],br["p95"]),
                inference_sd_ms=c(bc["sd"],bf["sd"],br["sd"]))
tr<-rbindlist(times)
fwrite(tr,file.path(outdir,"V3_COMPUTATIONAL_TRAINING_REPEATS.csv"))
summ<-tr[,.(training_time_seconds=mean(seconds),training_time_sd=sd(seconds)),by=model]
sizes<-data.table(model=c("Cox","FineGray","RSF"),
                  serialized_model_MB=c(file.info(coxfile)$size,file.info(fgfile)$size,file.info(rsffile)$size)/(1024^2))
final<-Reduce(function(x,y)merge(x,y,by="model"),list(summ,inf,sizes))
fwrite(tr,file.path(outdir,"V3_COMPUTATIONAL_TRAINING_REPEATS.csv"))
fwrite(final,file.path(outdir,"V3_COMPUTATIONAL_BENCHMARK.csv"))
cat("V3 COMPUTATIONAL BENCHMARK COMPLETE\n");print(final)
