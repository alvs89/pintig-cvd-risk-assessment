.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6",.libPaths()))
suppressPackageStartupMessages(library(randomForestSRC));suppressPackageStartupMessages(library(data.table));suppressPackageStartupMessages(library(survival))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts/pintig_v3_modeling_config.R"))
add <- c("smoking_pack_years","urban_rural_residence","sitting_minutes_day","heavy_episodic_alcohol","former_smoker","lipid_lowering_medication","hip_circumference_cm","diabetes_medication","psychosocial_stress","sleep_duration_hours")
sets <- list(base16=pintig_v3_predictors,smoking18=c(pintig_v3_predictors,add[c(1,5)]),behaviour20=c(pintig_v3_predictors,add[c(3,4,9,10)]),all26=c(pintig_v3_predictors,add))
dest<-file.path(root,"analysis/results/v4_simulation/SENSITIVITY_2SEEDS_OOF.csv");if(file.exists(dest))file.remove(dest)
for(seed in c(20261031L,20261101L)) {
 d<-fread(file.path(root,paste0("data/processed/pintig_experimental_v4_scenario_",seed,".csv")))
 for(nm in names(sets)) {
  cols<-sets[[nm]]
  fm<-as.formula(paste("Surv(analysis_time_days,event_type)~",paste(cols,collapse="+")))
  for(fold in 1:5) {
   zz<-pintig_impute_train_validation_v3(copy(d[outer_fold!=fold]),copy(d[outer_fold==fold]))
   m<-rfsrc(fm,data=zz$train[,c("analysis_time_days","event_type",cols),with=FALSE],ntree=100L,mtry=max(2L,as.integer(sqrt(length(cols)))),nodesize=15L,nsplit=10L,splitrule="logrankCR",cause=1,seed=20261030L+fold)
   pp<-predict(m,newdata=zz$validation[,..cols]);ci<-match("CIF.1",dimnames(pp$cif)[[3]]);if(is.na(ci))ci<-1L
   k<-max(which(pp$time.interest<=3652.5))
   pred<-pp$cif[,k,ci]
   x<-data.table(scenario_seed=seed,config=nm,fold=fold,participant_id=zz$validation$participant_id,time=zz$validation$analysis_time_days,event=zz$validation$event_type,prob=pmin(pmax(pred,0),1))
   fwrite(x,dest,append=file.exists(dest))
   cat("SENS_COMPLETE",seed,nm,fold,"\n");flush.console();rm(m);gc(FALSE)
  }
 }
}
