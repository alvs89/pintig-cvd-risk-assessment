.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6",.libPaths()))
suppressPackageStartupMessages(library(randomForestSRC));suppressPackageStartupMessages(library(data.table));suppressPackageStartupMessages(library(survival))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts/pintig_v3_modeling_config.R"))
d <- fread(file.path(root,"data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv"))
stopifnot(nrow(d)==4191L,uniqueN(d$participant_id)==4191L)
added<-c("smoking_pack_years","urban_rural_residence","sitting_minutes_day","heavy_episodic_alcohol","former_smoker","lipid_lowering_medication","hip_circumference_cm","diabetes_medication","psychosocial_stress","sleep_duration_hours")
counts<-c(17L,19L,21L,22L,23L,24L,25L)
outdir<-file.path(root,"analysis/results/v4_simulation/nested")
outfile<-file.path(outdir,"NESTED_REMAINING_OOF_WITH_CIF_LONG.csv")
tune<-file.path(outdir,"NESTED_REMAINING_TUNING.csv")
if(file.exists(outfile))file.remove(outfile)
if(file.exists(tune))file.remove(tune)
get_cif<-function(m,dat,cols){
 x<-predict(m,newdata=dat[,..cols])
 ci<-match("CIF.1",dimnames(x$cif)[[3]])
 if(is.na(ci))ci<-1L
 list(times=x$time.interest,values=x$cif[,,ci,drop=FALSE][,,1])
}
brier10<-function(t,e,p,h=3652.5){
 known<-t>h | ((e==1|e==2)&t<=h)
 y<-as.integer(e==1&t<=h)
 mean((p[known]-y[known])^2)
}
for(n in counts){
 cols<-c(pintig_v3_predictors,head(added,n-16L))
 fm<-as.formula(paste("Surv(analysis_time_days,event_type)~",paste(cols,collapse="+")))
 for(outer in 1:5){
  tr<-copy(d[outer_fold!=outer]);te<-copy(d[outer_fold==outer])
  set.seed(20261101L+outer);tr[,inner_fold:=0L]
  for(ev in unique(tr$event_type)){
   ix<-which(tr$event_type==ev)
   tr$inner_fold[ix]<-sample(rep(1:3,length.out=length(ix)))
  }
  cfg<-data.table(config_id=1:2,mtry=c(max(2L,as.integer(sqrt(length(cols)))),max(2L,as.integer(length(cols)/3))),nodesize=c(15L,10L),nsplit=c(10L,5L))
  screen<-numeric(nrow(cfg))
  for(j in 1:nrow(cfg)){
   scores<-numeric(3)
   for(inner in 1:3){
    z<-pintig_impute_train_validation_v3(copy(tr[inner_fold!=inner]),copy(tr[inner_fold==inner]))
    m<-rfsrc(fm,data=z$train[,c("analysis_time_days","event_type",cols),with=FALSE],ntree=100L,mtry=cfg$mtry[j],nodesize=cfg$nodesize[j],nsplit=cfg$nsplit[j],splitrule="logrankCR",cause=1,seed=20260000L+outer*100L+inner*10L+j)
    pc<-get_cif(m,z$validation,cols);at<-max(which(pc$times<=3652.5))
    scores[inner]<-brier10(z$validation$analysis_time_days,z$validation$event_type,pc$values[,at])
    rm(m)
   }
   screen[j]<-mean(scores)
  }
  best<-which.min(screen)
  fwrite(data.table(config=paste0("n",n),fold=outer,selected=best,mtry=cfg$mtry[best],nodesize=cfg$nodesize[best],nsplit=cfg$nsplit[best],mean_inner_screen_brier=screen[best]),tune,append=file.exists(tune))
  tr[,inner_fold:=NULL]
  z<-pintig_impute_train_validation_v3(copy(tr),copy(te))
  start<-proc.time()[["elapsed"]]
  m<-rfsrc(fm,data=z$train[,c("analysis_time_days","event_type",cols),with=FALSE],ntree=200L,mtry=cfg$mtry[best],nodesize=cfg$nodesize[best],nsplit=cfg$nsplit[best],splitrule="logrankCR",cause=1,seed=20265000L+outer)
  seconds<-proc.time()[["elapsed"]]-start
  pc<-get_cif(m,z$validation,cols)
  grid<-seq(365.25,3652.5,by=365.25);ix<-findInterval(grid,pc$times)
  mat<-sapply(ix,function(k)if(k==0L)rep(0,nrow(z$validation))else pc$values[,k])
  long<-data.table(config=rep(paste0("n",n),nrow(z$validation)*length(grid)),fold=outer,participant_id=rep(z$validation$participant_id,each=length(grid)),time=rep(z$validation$analysis_time_days,each=length(grid)),event=rep(z$validation$event_type,each=length(grid)),horizon_days=rep(grid,nrow(z$validation)),prob=as.vector(t(mat)),fit_seconds=seconds)
  fwrite(long,outfile,append=file.exists(outfile))
  cat("REMAINING_COMPLETE",n,outer,"secs",round(seconds,2),"\n");flush.console()
  rm(m);gc(FALSE)
 }
}
cat("ALL_REMAINING_COMPLETE\n")
