.libPaths(c('C:/Users/Alvin Guillermo/Documents/R/win-library/4.6',.libPaths()))
suppressPackageStartupMessages(library(data.table))
suppressPackageStartupMessages(library(jsonlite))
source('scripts/pintig_v3_modeling_config.R')
out<-'analysis/results/rsf27_proxy_20261103_v1'
cols<-fromJSON(file.path(out,'predictors.json'))
# Load only the imputation function; do not run any model fits.
for(expr in parse('analysis/scripts/rsf27_v1/train.R'))
 if(is.call(expr)&&identical(expr[[1]],as.name('<-'))&&identical(expr[[2]],as.name('impute')))eval(expr)
tr<-as.data.table(setNames(lapply(cols,function(n)if(n=='smoking_status')factor(rep('Current',4),levels=c('Never','Former','Current'))else rep(0,4)),cols))
tr[,`:=`(bp_medication=c(0,1,1,NA),heart_rate_bpm=c(60,70,90,NA),current_smoking_intensity_cigs_day=c(10,20,30,NA))]
va<-copy(tr);va[,`:=`(bp_medication=NA_real_,heart_rate_bpm=NA_real_,current_smoking_intensity_cigs_day=NA_real_)]
original<-copy(tr);z<-impute(tr,va)
stopifnot(identical(tr,original),z$imputer$bp_medication==1,z$imputer$heart_rate_bpm==70,z$imputer$current_smoking_intensity_cigs_day==20)
changed<-copy(va);changed[,`:=`(heart_rate_bpm=999,current_smoking_intensity_cigs_day=999,event_type=1,analysis_time_days=5)]
stopifnot(identical(impute(tr,changed)$imputer,z$imputer))
va[,smoking_status:=factor('Never',levels=c('Never','Former','Current'))]
stopifnot(all(impute(tr,va)$validation$current_smoking_intensity_cigs_day==0))
va[,ses_index_0_100:=NA_real_]
stopifnot(inherits(try(impute(tr,va),silent=TRUE),'try-error'))
for(expr in parse('analysis/scripts/v4_corrected/run_nested.R'))
 if(is.call(expr)&&identical(expr[[1]],as.name('<-'))&&as.character(expr[[2]])%in%c('gfit','ipcw_brier'))eval(expr)
tr_boundary<-data.table(analysis_time_days=rep(20,4),event_type=rep(0,4))
va_boundary<-data.table(analysis_time_days=rep(c(9,10,11),each=3),event_type=rep(0:2,3))
p_boundary<-c(.2,.7,.1,.2,.7,.1,.2,.2,.2)
stopifnot(abs(ipcw_brier(tr_boundary,va_boundary,p_boundary,10)-mean(c(0,.3^2,.1^2,.2^2,.3^2,.1^2,.2^2,.2^2,.2^2)))<1e-12)
write_json(list(status='PASS',tests=c('training-only imputation','no source mutation','no held-out outcome influence','non-current intensity zero','unsupported missing SES rejected')),
 file.path(out,'preprocessing_tests.json'),auto_unbox=TRUE,pretty=TRUE)
cat('PREPROCESSING_TESTS_PASS\n')
