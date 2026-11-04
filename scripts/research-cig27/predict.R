# Read-only inference: exact saved forest, all event-time CIF steps, no fitting.
.libPaths(c('C:/Users/Alvin Guillermo/Documents/R/win-library/4.6',.libPaths()))
suppressPackageStartupMessages({library(data.table);library(randomForestSRC);library(jsonlite)})
args<-commandArgs(trailingOnly=TRUE);stopifnot(length(args)==2)
input<-fromJSON(args[1]);bundle<-readRDS('analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3/model_RESEARCH_ONLY.rds')
stopifnot(input$modelVersion=='rsf27-questionnaire-aligned-proxy-20261103-v3',input$transformVersion=='rsf27-training-definitions-v3',isTRUE(input$researchOnly),bundle$model$ntree==200)
cols<-bundle$predictors;stopifnot(identical(sort(names(input$features)),sort(cols)))
f<-input$features;f$ses_index_0_100<-NA_real_;x<-as.data.table(f)
for(nm in setdiff(cols,'smoking_status'))stopifnot(is.numeric(x[[nm]]),length(x[[nm]])==1)
stopifnot(all(is.finite(unlist(x[,setdiff(cols,c('ses_index_0_100','smoking_status')),with=FALSE]))))
s<-input$ses;stopifnot(s$education_category%in%0:8,s$income_band%in%0:5,s$income_supported_people>=1)
# Same synthetic representative assumptions and exact frozen training PCA/ECDF.
income_values<-c(0,83238,249714,499428,998856,1997712)
ed<-factor(s$education_category,levels=0:8)
income<-log1p(income_values[s$income_band+1]/sqrt(s$income_supported_people))
basis<-model.matrix(~ ed + income - 1)[,names(bundle$ses_artifact$center),drop=FALSE]
score<-as.numeric(((basis-bundle$ses_artifact$center)/bundle$ses_artifact$scale)%*%bundle$ses_artifact$rotation)
x[,ses_index_0_100:=100*mean(bundle$ses_artifact$training_score<=score)]
x[,smoking_status:=factor(smoking_status,levels=bundle$smoking_levels)]
stopifnot(!anyNA(x[,..cols])) # no missing-value substitution for questionnaire inference
p<-predict(bundle$model,newdata=x[,..cols]);cause<-match('CIF.1',dimnames(p$cif)[[3]]);stopifnot(!is.na(cause))
actual_times<-p$time.interest;actual_cif<-p$cif[1,,cause]
stopifnot(all(is.finite(actual_times)),all(diff(actual_times)>0),max(bundle$model$yvar[,'analysis_time_days'])>=3652.5)
times<-sort(unique(c(0,actual_times[actual_times>0&actual_times<=3652.5],3652.5)))
# Right-continuous lookup at model event times, including the horizon; no interpolation.
prob<-vapply(times,function(t){i<-which(actual_times<=t);if(!length(i)||t==0)0 else actual_cif[max(i)]},numeric(1))
stopifnot(all(is.finite(prob)),all(prob>=0&prob<=1),all(diff(prob)>=0))
write_json(list(schemaVersion='research-27p-cif-v1',modelVersion=input$modelVersion,modelSha256=input$modelSha256,transformVersion=input$transformVersion,
 researchOnly=TRUE,outcomeId='recorded-cvd-proxy',competingEvent='death-before-recorded-cvd-cause-unverified',numberOfTrees=200,
 curveSource='all-model-event-times-step-cif',risk10=tail(prob,1),derivedSesIndex=x$ses_index_0_100,
 cif=list(timeUnit='days',daysPerYear=365.25,supportedUntil=3652.5,probabilityUnit='fraction',times=times,probabilities=prob)),args[2],auto_unbox=TRUE,digits=16)
