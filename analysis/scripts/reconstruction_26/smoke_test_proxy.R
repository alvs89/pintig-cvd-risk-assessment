.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6",.libPaths()))
suppressPackageStartupMessages(library(randomForestSRC))
suppressPackageStartupMessages(library(data.table))
suppressPackageStartupMessages(library(survival))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
d <- fread(file.path(root,"data/processed/questionnaire_26_outcome_recovered_20261101_v1/pintig_framingham_26predictors_PROXY_EXPERIMENTAL.csv"))
pred <- names(d)[1:26]
stopifnot(ncol(d)==32,nrow(d)==4191L,uniqueN(d$participant_id)==4191L,all(d$event_type %in% 0:2),all(d$analysis_time_days>=0),all(d$analysis_time_days<=3652.5))
source(file.path(root,"scripts/pintig_v3_modeling_config.R"))
tr<-copy(d[outer_fold!=1]);te<-copy(d[outer_fold==1])
z<-pintig_impute_train_validation_v3(tr,te)
stopifnot(all(complete.cases(z$train[,..pred])),all(complete.cases(z$validation[,..pred])))
set.seed(200)
ss<-z$train[sample(.N,650L)]
stopifnot(all(c(0,1,2)%in%ss$event_type))
model<-rfsrc(as.formula(paste("Surv(analysis_time_days,event_type)~",paste(pred,collapse="+"))),data=ss[,c("analysis_time_days","event_type",pred),with=FALSE],ntree=40L,mtry=5L,nodesize=15L,nsplit=5L,splitrule="logrankCR",cause=1,seed=20261101L)
p<-predict(model,newdata=z$validation[1:20,..pred])
stopifnot(!is.null(p$cif),all(is.finite(p$cif)),all(p$cif>=0),all(p$cif<=1))
cat("SMOKE_TEST_PASS rows",nrow(d),"predictors",length(pred),"events",paste(table(d$event_type),collapse=","),"CIFdim",paste(dim(p$cif),collapse="x"),"\n")
