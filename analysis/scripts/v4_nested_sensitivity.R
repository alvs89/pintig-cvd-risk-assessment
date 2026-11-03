.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6",.libPaths()))
suppressPackageStartupMessages(library(randomForestSRC));suppressPackageStartupMessages(library(data.table));suppressPackageStartupMessages(library(survival))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts/pintig_v3_modeling_config.R"))
sim <- fread(file.path(root,"data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv"))
stopifnot(nrow(sim)==4191L,uniqueN(sim$participant_id)==4191L)
added <- c("smoking_pack_years","urban_rural_residence","sitting_minutes_day","heavy_episodic_alcohol","former_smoker","lipid_lowering_medication","hip_circumference_cm","diabetes_medication","psychosocial_stress","sleep_duration_hours")
sets <- list(base16=pintig_v3_predictors,smoking18=c(pintig_v3_predictors,added[c(1,5)]),behaviour20=c(pintig_v3_predictors,added[c(3,4,9,10)]),all26=c(pintig_v3_predictors,added))
# Training-fold-only imputation for observed fields; synthetic fields complete by generator design.
prep <- function(a,b) {
 z <- pintig_impute_train_validation_v3(copy(a),copy(b))
 z
}
predcurve <- function(m,newdata,cols) {
 p <- predict(m,newdata=newdata[,..cols]); ci <- match("CIF.1",dimnames(p$cif)[[3]]);if(is.na(ci))ci<-1L
 list(times=p$time.interest,values=p$cif[,,ci,drop=FALSE][,,1])
}
brier10 <- function(t,e,p,h=3652.5) {
 # training-only IPCW censor KM on inner training subset needs handled by caller; use squared error on known 10y outcomes for inner tuning screen (ranking heuristic).
 known <- t>h | (e %in% c(1,2) & t<=h)
 y <- as.integer(e==1 & t<=h)
 mean((p[known]-y[known])^2)
}
outdir <- file.path(root,"analysis/results/v4_simulation/nested")
dir.create(outdir,showWarnings=FALSE,recursive=TRUE)
outfile <- file.path(outdir,"NESTED_OOF_WITH_CIF_LONG.csv")
tunefile <- file.path(outdir,"NESTED_TUNING.csv")
if(file.exists(outfile))file.remove(outfile)
if(file.exists(tunefile))file.remove(tunefile)
for (sn in names(sets)) {
 cols <- sets[[sn]];form <- as.formula(paste("Surv(analysis_time_days,event_type)~",paste(cols,collapse="+")))
 for (outer in 1:5) {
  tr <- copy(sim[outer_fold!=outer]);te<-copy(sim[outer_fold==outer])
  set.seed(20261101L+outer)
  tr[,inner_fold:=0L]
  for(ev in unique(tr$event_type)) {
   idx <- which(tr$event_type==ev);tr$inner_fold[idx] <- sample(rep(1:3,length.out=length(idx)))
  }
  cfg <- data.table(config_id=1:2, mtry=c(max(2L,as.integer(sqrt(length(cols)))),max(2L,as.integer(length(cols)/3))), nodesize=c(15L,10L), nsplit=c(10L,5L))
  screen <- numeric(nrow(cfg))
  for(j in 1:nrow(cfg)) {
   scores<-numeric(3)
   for(inner in 1:3) {
    z <- prep(tr[inner_fold!=inner],tr[inner_fold==inner])
    m <- rfsrc(form,data=z$train[,c("analysis_time_days","event_type",cols),with=FALSE],ntree=100L,mtry=cfg$mtry[j],nodesize=cfg$nodesize[j],nsplit=cfg$nsplit[j],splitrule="logrankCR",cause=1,seed=20260000L+outer*100L+inner*10L+j)
    pc <- predcurve(m,z$validation,cols); at <- max(which(pc$times<=3652.5))
    scores[inner]<-brier10(z$validation$analysis_time_days,z$validation$event_type,pc$values[,at])
    rm(m)
   }
   screen[j] <- mean(scores)
  }
  best<-which.min(screen)
  fwrite(data.table(config=sn,fold=outer,selected=best,mtry=cfg$mtry[best],nodesize=cfg$nodesize[best],nsplit=cfg$nsplit[best],mean_inner_screen_brier=screen[best]),tunefile,append=file.exists(tunefile))
  tr[,inner_fold:=NULL]
  z<-prep(tr,te);start<-proc.time()[["elapsed"]]
  m<-rfsrc(form,data=z$train[,c("analysis_time_days","event_type",cols),with=FALSE],ntree=200L,mtry=cfg$mtry[best],nodesize=cfg$nodesize[best],nsplit=cfg$nsplit[best],splitrule="logrankCR",cause=1,seed=20265000L+outer)
  seconds<-proc.time()[["elapsed"]]-start
  pc<-predcurve(m,z$validation,cols)
  grid<-seq(365.25,3652.5,by=365.25)
  ids<-findInterval(grid,pc$times);mat<-sapply(ids,function(ix)if(ix==0)rep(0,nrow(z$validation)) else pc$values[,ix])
  long<-data.table(config=rep(sn,nrow(z$validation)*length(grid)),fold=outer,participant_id=rep(z$validation$participant_id,each=length(grid)),time=rep(z$validation$analysis_time_days,each=length(grid)),event=rep(z$validation$event_type,each=length(grid)),horizon_days=rep(grid,nrow(z$validation)),prob=as.vector(t(mat)),fit_seconds=seconds)
  fwrite(long,outfile,append=file.exists(outfile))
  cat("NESTED_COMPLETE",sn,outer,"seconds",round(seconds,2),"\n");flush.console()
  rm(m);gc(FALSE)
 }
}
cat("NESTED_FINISHED\n")
