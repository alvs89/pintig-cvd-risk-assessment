# Focused nested validation of the frozen 27-feature PROXY dataset; not deployment.
.libPaths(c('C:/Users/Alvin Guillermo/Documents/R/win-library/4.6',.libPaths()))
suppressPackageStartupMessages(library(data.table))
suppressPackageStartupMessages(library(randomForestSRC))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(jsonlite))
options(rf.cores=2, mc.cores=2)
out <- 'analysis/results/rsf27_proxy_20261103_v1'
protocol <- fromJSON(file.path(out,'protocol.json'))
cols <- fromJSON(file.path(out,'predictors.json'))
d <- fread(protocol$input);setorder(d,participant_id)
d[,smoking_status:=factor(smoking_status,levels=c('Never','Former','Current'))]
folds <- fread('analysis/modeling/v3_16predictors/v3_inner_fold_assignments.csv')
view <- fread(file.path(out,'evaluation_followup_view.csv'))
stopifnot(nrow(d)==4191,uniqueN(d$participant_id)==4191,length(cols)==27)
source('scripts/pintig_v3_modeling_config.R')
# Reuse corrected v4 evaluator functions without executing its old experiments.
old <- parse('analysis/scripts/v4_corrected/run_nested.R')
for(expr in old) if(is.call(expr)&&identical(expr[[1]],as.name('<-'))&&
                    as.character(expr[[2]]) %in% c('gfit','ipcw_brier','cif')) eval(expr)
stopifnot(all(view$complete_at_tau %in% 0:1),identical(d$participant_id,view$participant_id),
          identical(as.integer(d$event_type==0 & d$analysis_time_days==3652.5),view$complete_at_tau))
grid <- seq(0,3652.5,length.out=41)
cfg <- data.table(candidate=1:2,mtry=c(5L,9L),nodesize=c(15L,10L),nsplit=c(10L,5L))
form <- as.formula(paste('Surv(analysis_time_days,event_type)~',paste(cols,collapse='+')))
impute <- function(tr,va) {
  # Same v3 training-only mode/median rules, using renamed smoking features.
  tr<-copy(tr);va<-copy(va)
  observed<-tr[smoking_status=='Current'&!is.na(current_smoking_intensity_cigs_day),current_smoking_intensity_cigs_day]
  stopifnot(length(observed)>0)
  imp<-list(bp_medication=pintig_mode_value(tr$bp_medication),heart_rate_bpm=median(tr$heart_rate_bpm,na.rm=TRUE),
            current_smoking_intensity_cigs_day=median(observed))
  apply<-function(x){
    x[smoking_status!='Current'&is.na(current_smoking_intensity_cigs_day),current_smoking_intensity_cigs_day:=0]
    for(nm in names(imp)) set(x,which(is.na(x[[nm]])),nm,imp[[nm]])
    stopifnot(!anyNA(x[,..cols]))
    x
  }
  list(train=apply(tr),validation=apply(va),imputer=imp)
}
fit <- function(dat,j,trees,seed) rfsrc(form,data=dat[,c('analysis_time_days','event_type',cols),with=FALSE],
  ntree=trees,mtry=cfg$mtry[j],nodesize=cfg$nodesize[j],nsplit=cfg$nsplit[j],
  splitrule='logrankCR',cause=1,seed=seed)
writeLines(c(capture.output(sessionInfo()),sapply(c('randomForestSRC','riskRegression','data.table','survival'),function(p)paste(p,packageVersion(p)))),file.path(out,'session_info.txt'))
for(k in 1:5){
  target<-file.path(out,paste0('fold',k,'_oof.csv'))
  if(file.exists(target)){cat('RESUME_SKIP',k,'\n');next}
  tr<-copy(d[outer_fold!=k]);te<-copy(d[outer_fold==k])
  ff<-folds[outer_fold==k]
  stopifnot(setequal(tr$participant_id,ff$participant_id),!anyDuplicated(ff$participant_id),!any(te$participant_id%in%ff$participant_id))
  tr[,inner_fold:=ff$inner_fold[match(participant_id,ff$participant_id)]]
  tuning<-list();imputers<-list();started<-proc.time()[['elapsed']]
  for(j in 1:2)for(i in 1:3){
    a<-tr[inner_fold!=i];b<-tr[inner_fold==i]
    stopifnot(!any(a$participant_id%in%b$participant_id))
    z<-impute(a,b)
    imputers[[length(imputers)+1L]]<-as.data.table(c(list(outer=k,inner=i,candidate=j),z$imputer))
    m<-fit(z$train,j,100L,20261103L+k*100L+i*10L+j)
    pp<-cif(m,z$validation,cols,3652.5)[,1]
    tuning[[length(tuning)+1L]]<-data.table(outer=k,inner=i,candidate=j,brier=ipcw_brier(a,b,pp))
    rm(m);cat('INNER_COMPLETE',k,i,j,'\n');flush.console()
  }
  tt<-rbindlist(tuning);best<-tt[,.(score=mean(brier)),by=candidate][order(score,candidate)]$candidate[1]
  fwrite(tt,file.path(out,paste0('fold',k,'_tuning.csv')))
  z<-impute(tr,te);imputers[[length(imputers)+1L]]<-as.data.table(c(list(outer=k,inner=0,candidate=best),z$imputer))
  fwrite(rbindlist(imputers),file.path(out,paste0('fold',k,'_imputers.csv')))
  m<-fit(z$train,best,200L,20261103L+k)
  pp<-cif(m,z$validation,cols,grid)
  stopifnot(!anyNA(pp),all(is.finite(pp)),all(pp>=0&pp<=1),all(apply(pp,1,function(x)all(diff(x)>= -1e-10))))
  colnames(pp)<-paste0('risk_',0:40)
  fwrite(cbind(te[,.(participant_id,outer_fold,analysis_time_days,event_type)],as.data.table(pp)),target)
  fwrite(data.table(cfg[best],seconds=proc.time()[['elapsed']]-started),file.path(out,paste0('fold',k,'_selected.csv')))
  cat('OUTER_COMPLETE',k,'\n');flush.console();rm(m);gc(FALSE)
}
if(!file.exists(file.path(out,'model_RESEARCH_ONLY.rds'))){
  tt<-rbindlist(lapply(1:5,function(k)fread(file.path(out,paste0('fold',k,'_tuning.csv')))))
  best<-tt[,.(score=mean(brier)),by=candidate][order(score,candidate)]$candidate[1]
  z<-impute(d,d[0]);m<-fit(z$train,best,200L,20261103L)
  saveRDS(list(model=m,imputer=z$imputer,predictors=cols,smoking_levels=levels(d$smoking_status),
    candidate=cfg[best],protocol=protocol,deployment_approved=FALSE),file.path(out,'model_RESEARCH_ONLY.rds'))
  # Serialization roundtrip uses fabricated numeric profiles, not cohort extracts.
  fixture<-as.data.table(lapply(cols,function(nm)if(nm=='smoking_status')factor('Never',levels=levels(d$smoking_status)) else 0));setnames(fixture,cols)
  fixture[,`:=`(age_years=50,sbp_mmhg=120,dbp_mmhg=80,heart_rate_bpm=70,waist_cm=85,hip_circumference_cm=100,
    ses_index_0_100=50,sleep_duration_hours=7,activity_min_week=150,sitting_minutes_day=360,diet_score_0_100=50)]
  before<-cif(m,fixture,cols,grid);after<-cif(readRDS(file.path(out,'model_RESEARCH_ONLY.rds'))$model,fixture,cols,grid)
  stopifnot(isTRUE(all.equal(before,after)))
  write_json(list(status='PASS',fictional_fixture_only=TRUE,deployment_approved=FALSE),file.path(out,'serialization_test.json'),auto_unbox=TRUE,pretty=TRUE)
}
cat('NESTED_TRAINING_AND_RESEARCH_REFIT_COMPLETE\n')
