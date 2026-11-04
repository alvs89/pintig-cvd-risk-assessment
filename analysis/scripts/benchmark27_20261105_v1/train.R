.libPaths(c('C:/Users/Alvin Guillermo/Documents/R/win-library/4.6',.libPaths()))
suppressPackageStartupMessages({library(data.table);library(jsonlite);library(survival);library(prodlim);library(riskRegression);library(splines)})
options(mc.cores=2)
set.seed(271105)
out <- 'analysis/results/benchmark27_20261105_v1'
rsf <- 'analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3'
stopifnot(dir.exists(out),!file.exists(file.path(out,'TRAINING_COMPLETE.json')))
protocol <- fromJSON(file.path(rsf,'protocol.json')); cols <- fromJSON(file.path(rsf,'predictors.json'))
d <- fread(protocol$input);setorder(d,participant_id)
d[,smoking_status:=factor(smoking_status,levels=c('Never','Former','Current'))]
ses <- fread('data/processed/questionnaire_27_questionnaire_aligned_20261103_v1/SYNTHETIC_questionnaire_responses.csv')
setorder(ses,participant_id);stopifnot(identical(d$participant_id,ses$participant_id))
d <- cbind(d,ses[,.(education_category,income_band,income_supported_people,income_representative_php_year)])
folds <- fread('analysis/modeling/v3_16predictors/v3_inner_fold_assignments.csv')
source('scripts/pintig_v3_modeling_config.R')
for(expr in parse('analysis/scripts/rsf27_questionnaire_aligned_v1/train.R')) {
  if(is.call(expr)&&identical(expr[[1]],as.name('<-'))&&as.character(expr[[2]]) %in% c('fit_ses','impute')) eval(expr)
}
for(expr in parse('analysis/scripts/v4_corrected/run_nested.R')) {
  if(is.call(expr)&&identical(expr[[1]],as.name('<-'))&&as.character(expr[[2]]) %in% c('gfit','ipcw_brier')) eval(expr)
}
hs<-seq(0,3652.5,length.out=41)
warnings_log<-list(); timing<-list(); tuning<-list(); selected<-list()
run_fit <- function(kind, tr, candidate, outer, inner) {
  # Freeze spline bases from training only, with the same columns used for validation.
  bases<-list(); fitcols<-cols
  if(candidate==2) for(nm in c('age_years','sbp_mmhg')) {
    b<-ns(tr[[nm]],df=3); bases[[nm]]<-b
    cn<-paste0(nm,'_s',1:3);tr[,(cn):=as.data.table(b)];fitcols<-c(setdiff(fitcols,nm),cn)
  }
  form<-as.formula(paste('Hist(analysis_time_days,event_type)~',paste(fitcols,collapse='+')))
  started<-proc.time()[['elapsed']]
  m<-withCallingHandlers(if(kind=='Cox') CSC(form,data=tr,cause=1,surv.type='hazard',fitter='coxph') else FGR(form,data=tr,cause=1),warning=function(w){warnings_log[[length(warnings_log)+1L]]<<-data.table(model=kind,outer=outer,inner=inner,candidate=candidate,message=conditionMessage(w));invokeRestart('muffleWarning')})
  elapsed<-proc.time()[['elapsed']]-started
  if(kind=='FineGray') stopifnot(isTRUE(m$crrFit$converged),all(is.finite(m$crrFit$coef)))
  if(kind=='Cox') stopifnot(all(vapply(m$models,function(x)all(is.finite(coef(x))),logical(1))))
  timing[[length(timing)+1L]]<<-data.table(model=kind,outer=outer,inner=inner,candidate=candidate,fit_seconds=elapsed)
  list(model=m,bases=bases)
}
predict_cif<-function(fitted,va,times) {
  for(nm in names(fitted$bases)) {cn<-paste0(nm,'_s',1:3);va[,(cn):=as.data.table(predict(fitted$bases[[nm]],va[[nm]]))]}
  pp<-as.matrix(predictRisk(fitted$model,newdata=va,times=times,cause=1))
  stopifnot(all(is.finite(pp)),all(pp>=0&pp<=1),all(apply(pp,1,function(x)all(diff(x)>= -1e-10))))
  pp
}
for(kind in c('Cox','FineGray')) for(k in 1:5) {
  target<-file.path(out,paste0(kind,'_fold',k,'_oof.csv'))
  stopifnot(!file.exists(target))
  started<-proc.time()[['elapsed']]
  tr<-copy(d[outer_fold!=k]); te<-copy(d[outer_fold==k]); ff<-folds[outer_fold==k]
  stopifnot(!any(tr$participant_id%in%te$participant_id),setequal(tr$participant_id,ff$participant_id),!anyDuplicated(ff$participant_id))
  tr[,inner_fold:=ff$inner_fold[match(participant_id,ff$participant_id)]]
  scores<-list()
  for(j in 1:2) for(i in 1:3) {
    a<-tr[inner_fold!=i];b<-tr[inner_fold==i];z<-impute(a,b)
    stopifnot(!any(a$participant_id%in%b$participant_id))
    fit<-run_fit(kind,z$train,j,k,i);pp<-predict_cif(fit,z$validation,3652.5)[,1]
    scores[[length(scores)+1L]]<-data.table(model=kind,outer=k,inner=i,candidate=j,brier=ipcw_brier(a,b,pp))
    cat('INNER',kind,k,j,i,'\n');flush.console()
  }
  tt<-rbindlist(scores);tuning[[length(tuning)+1L]]<-tt
  best<-tt[,.(score=mean(brier)),by=candidate][order(score,candidate)]$candidate[1]
  z<-impute(tr,te);fit<-run_fit(kind,z$train,best,k,0)
  pp<-cbind(0,predict_cif(fit,z$validation,hs[-1]));colnames(pp)<-paste0('risk_',0:40)
  fwrite(cbind(te[,.(participant_id,outer_fold,analysis_time_days,event_type)],as.data.table(pp)),target)
  saveRDS(list(fit=fit,imputer=z$imputer,ses_artifact=z$ses_artifact,predictors=cols,training_ids=tr$participant_id),file.path(out,paste0(kind,'_fold',k,'_RESEARCH_ONLY.rds')))
  selected[[length(selected)+1L]]<-data.table(model=kind,outer=k,candidate=best,pipeline_seconds=proc.time()[['elapsed']]-started)
  fwrite(rbindlist(timing),file.path(out,'fit_times.csv'));fwrite(rbindlist(tuning),file.path(out,'inner_tuning.csv'));fwrite(rbindlist(selected),file.path(out,'selected.csv'))
  if(length(warnings_log)) fwrite(rbindlist(warnings_log),file.path(out,'warnings.csv'))
  cat('OUTER_COMPLETE',kind,k,'\n');flush.console()
}
writeLines(capture.output(sessionInfo()),file.path(out,'session_info.txt'))
write_json(list(status='PASS',new_inner_fits=60,new_outer_fits=10,rsf_retrained=FALSE),file.path(out,'TRAINING_COMPLETE.json'),auto_unbox=TRUE,pretty=TRUE)
