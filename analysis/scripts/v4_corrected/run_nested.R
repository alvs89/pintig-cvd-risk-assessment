# New run only. Reuses the frozen v3 feature/imputation contract and inner folds.
.libPaths(c('C:/Users/Alvin Guillermo/Documents/R/win-library/4.6',.libPaths()))
suppressPackageStartupMessages(library(data.table))
suppressPackageStartupMessages(library(randomForestSRC))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(jsonlite))
options(rf.cores=2,mc.cores=2)
root <- normalizePath(getwd(),winslash='/')
out <- file.path(root,'analysis/results/v4_corrected_20261031_v1')
source(file.path(root,'scripts/pintig_v3_modeling_config.R'))
args <- commandArgs(trailingOnly=TRUE)
scenario <- if(length(args)) args[1] else 'primary'
training_seed <- if(length(args)>1) as.integer(args[2]) else 20265000L
selected <- if(length(args)>2) strsplit(args[3],',',fixed=TRUE)[[1]] else paste0('n',16:26)
run <- file.path(out,paste0(scenario,'_train',training_seed))
dir.create(run,recursive=TRUE,showWarnings=FALSE)
configs <- fromJSON(file.path(out,'configurations.json'))
input <- if(scenario=='primary') file.path(root,'data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv') else file.path(out,'scenarios',paste0(scenario,'.csv'))
d <- fread(input);setorder(d,participant_id)
folds <- fread(file.path(root,'analysis/modeling/v3_16predictors/v3_inner_fold_assignments.csv'))
stopifnot(nrow(d)==4191,uniqueN(d$participant_id)==4191)
grid <- seq(0,3652.5,length.out=41)
writeLines(c(capture.output(sessionInfo()),paste('randomForestSRC',packageVersion('randomForestSRC'))),file.path(run,paste0('session_info_',paste(selected,collapse='_'),'.txt')))

gfit <- function(t,e) {
 u<-sort(unique(t));nr<-vapply(u,function(x)sum(t>=x),numeric(1));dc<-vapply(u,function(x)sum(t==x&e==0),numeric(1));de<-vapply(u,function(x)sum(t==x&e!=0),numeric(1))
 den<-nr-de;fac<-rep(1,length(u));fac[den>0]<-1-dc[den>0]/den[den>0];g<-cumprod(fac)
 function(x,left=FALSE){ix<-vapply(x,function(v)sum(if(left)u<v else u<=v),integer(1));v<-rep(1,length(ix));v[ix>0]<-g[ix[ix>0]];v}
}
ipcw_brier <- function(tr,va,p,h=3652.5) {
 G<-gfit(tr$analysis_time_days,tr$event_type)
 t<-va$analysis_time_days;e<-va$event_type;y<-as.numeric(e==1&t<=h)
 ev<-e!=0&t<=h;free<-t>h|(t==h&e==0)
 w<-numeric(length(t));ge<-G(t[ev],TRUE);gh<-G(h,TRUE)
 stopifnot(all(ge>0),gh>0)
 w[ev]<-1/ge;w[free]<-1/gh
 mean(w*(p-y)^2)
}
cif <- function(m,dat,cols,times) {
 p<-predict(m,newdata=dat[,..cols]);ci<-match('CIF.1',dimnames(p$cif)[[3]])
 stopifnot(!is.na(ci))
 sapply(times,function(t){i<-which(p$time.interest<=t);if(!length(i)) rep(0,nrow(dat)) else p$cif[,max(i),ci]})
}
for(nm in selected){
 cols<-configs[[nm]];stopifnot(length(cols)==as.integer(sub('n','',nm)))
 form<-as.formula(paste('Surv(analysis_time_days,event_type)~',paste(cols,collapse='+')))
 for(outer in 1:5){
  target<-file.path(run,paste0(nm,'_fold',outer,'.csv'))
  if(file.exists(target)){cat('RESUME_SKIP',nm,outer,'\n');next}
  started<-proc.time()[['elapsed']]
  tr<-copy(d[outer_fold!=outer]);te<-copy(d[outer_fold==outer])
  inf<-folds[outer_fold==outer]
  stopifnot(setequal(inf$participant_id,tr$participant_id),!anyDuplicated(inf$participant_id),!any(te$participant_id%in%inf$participant_id))
  tr[,inner_fold:=inf$inner_fold[match(participant_id,inf$participant_id)]]
  cfg<-data.table(config_id=1:2,mtry=c(max(2L,as.integer(sqrt(length(cols)))),max(2L,as.integer(length(cols)/3))),nodesize=c(15L,10L),nsplit=c(10L,5L))
  tune<-list();imps<-list()
  if(scenario=='primary'){
   for(j in 1:nrow(cfg))for(inner in 1:3){
    itr<-copy(tr[inner_fold!=inner]);iva<-copy(tr[inner_fold==inner])
    stopifnot(!any(itr$participant_id%in%iva$participant_id))
    z<-pintig_impute_train_validation_v3(itr,iva)
    imps[[length(imps)+1L]]<-as.data.table(c(list(configuration=nm,outer_fold=outer,inner_fold=inner,candidate=j),z$imputer))
    m<-rfsrc(form,data=z$train[,c('analysis_time_days','event_type',cols),with=FALSE],ntree=100L,mtry=cfg$mtry[j],nodesize=cfg$nodesize[j],nsplit=cfg$nsplit[j],splitrule='logrankCR',cause=1,seed=training_seed+outer*100L+inner*10L+j)
    p<-cif(m,z$validation,cols,3652.5)[,1]
    bs<-ipcw_brier(itr,iva,p)
    tune[[length(tune)+1L]]<-data.table(configuration=nm,outer_fold=outer,inner_fold=inner,candidate=j,brier=bs)
    rm(m)
   }
   tt<-rbindlist(tune);best<-tt[,.(mean_brier=mean(brier)),by=candidate][order(mean_brier,candidate)]$candidate[1]
   fwrite(tt,file.path(run,paste0(nm,'_fold',outer,'_tuning.csv')))
  }else{
   # Robustness deliberately holds original selected hyperparameters fixed.
   hp<-fread(file.path(out,'primary_train20265000',paste0(nm,'_fold',outer,'_selected.csv')))
   best<-hp$candidate
  }
  z<-pintig_impute_train_validation_v3(copy(tr[,inner_fold:=NULL]),te)
  imps[[length(imps)+1L]]<-as.data.table(c(list(configuration=nm,outer_fold=outer,inner_fold=0L,candidate=best),z$imputer))
  fwrite(rbindlist(imps),file.path(run,paste0(nm,'_fold',outer,'_imputation.csv')))
  fwrite(data.table(candidate=best,cfg[best],inner_trees=100L,outer_trees=200L),file.path(run,paste0(nm,'_fold',outer,'_selected.csv')))
  m<-rfsrc(form,data=z$train[,c('analysis_time_days','event_type',cols),with=FALSE],ntree=200L,mtry=cfg$mtry[best],nodesize=cfg$nodesize[best],nsplit=cfg$nsplit[best],splitrule='logrankCR',cause=1,seed=training_seed+outer)
  pp<-cif(m,z$validation,cols,grid)
  stopifnot(!anyNA(pp),all(pp>=0&pp<=1),all(apply(pp,1,function(x)all(diff(x)>= -1e-10))))
  colnames(pp)<-paste0('risk_',0:40)
  result<-cbind(te[,.(participant_id,outer_fold,analysis_time_days,event_type)],as.data.table(pp))
  fwrite(result,target)
  fwrite(data.table(configuration=nm,outer_fold=outer,seconds=proc.time()[['elapsed']]-started),file.path(run,paste0(nm,'_fold',outer,'_runtime.csv')))
  cat('COMPLETE',scenario,training_seed,nm,outer,'seconds',proc.time()[['elapsed']]-started,'\n');flush.console()
  rm(m);gc(FALSE)
 }
}
