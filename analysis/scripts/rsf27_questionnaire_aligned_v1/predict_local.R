# Local-only inference for the sealed questionnaire-aligned proxy RSF experiment.
# It emits a research estimate; no patient identifier, outcome or stored response
# is read by this script.
.libPaths(c('C:/Users/Alvin Guillermo/Documents/R/win-library/4.6',.libPaths()))
suppressPackageStartupMessages(library(data.table))
suppressPackageStartupMessages(library(randomForestSRC))
suppressPackageStartupMessages(library(jsonlite))
args <- commandArgs(trailingOnly=TRUE)
stopifnot(length(args)==2)
input <- fromJSON(args[1],simplifyVector=TRUE)
output <- args[2]
root <- normalizePath(getwd(),winslash='/')
bundle <- readRDS(file.path(root,'analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3/model_RESEARCH_ONLY.rds'))
cols <- bundle$predictors
stopifnot(identical(sort(names(input$features)),sort(cols)))
x <- as.data.table(as.list(input$features))
for (name in setdiff(cols,'smoking_status')) set(x,j=name,value=suppressWarnings(as.numeric(x[[name]])))
stopifnot(nrow(x)==1, all(is.finite(unlist(x[,setdiff(cols,c('smoking_status','bp_medication','heart_rate_bpm','current_smoking_intensity_cigs_day')),with=FALSE]))))
stopifnot(input$ses$education_category %in% 0:8,input$ses$income_band %in% 0:5,is.finite(input$ses$income_supported_people),input$ses$income_supported_people>=1)
income_values <- c(0,83238,249714,499428,998856,1997712)
ed <- factor(input$ses$education_category,levels=0:8)
income <- log1p(income_values[input$ses$income_band+1]/sqrt(input$ses$income_supported_people))
basis <- model.matrix(~ ed + income - 1)
basis <- basis[,names(bundle$ses_artifact$center),drop=FALSE]
score <- as.numeric(((basis-bundle$ses_artifact$center)/bundle$ses_artifact$scale) %*% bundle$ses_artifact$rotation)
x[,ses_index_0_100:=100*mean(bundle$ses_artifact$training_score<=score)]
x[,smoking_status:=factor(as.character(smoking_status),levels=bundle$smoking_levels)]
if(is.na(x$smoking_status)) stop('invalid smoking status')
x[smoking_status!='Current'&is.na(current_smoking_intensity_cigs_day),current_smoking_intensity_cigs_day:=0]
for(nm in names(bundle$imputer)) if(is.na(x[[nm]])) set(x,1,nm,bundle$imputer[[nm]])
stopifnot(!anyNA(x[,..cols]))
p <- predict(bundle$model,newdata=x[,..cols])
ci <- match('CIF.1',dimnames(p$cif)[[3]]);stopifnot(!is.na(ci))
times <- seq(0,3652.5,length.out=41)
prob <- vapply(times,function(t){i<-which(p$time.interest<=t);if(!length(i)) 0 else p$cif[1,max(i),ci]},numeric(1))
stopifnot(all(is.finite(prob)),all(prob>=0&prob<=1),all(diff(prob)>=-1e-10))
write_json(list(schemaVersion='pintig-experimental-proxy-rsf-v1',modelSource='competing-risk-rsf',modelVersion='rsf27-questionnaire-aligned-proxy-20261103-v3',outcomeId='recorded-cvd-proxy',outcomeLabel='Recorded cardiovascular disease within 10 years (research proxy)',eventCode='1',competingEventCode='2',risk10=prob[41],cif=list(timeUnit='days',daysPerYear=365.25,supportedUntil=3652.5,times=times,probabilities=prob),derivedSesIndex=as.numeric(x$ses_index_0_100)),output,auto_unbox=TRUE,pretty=FALSE)
