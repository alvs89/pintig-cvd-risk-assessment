.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6",.libPaths()))
suppressPackageStartupMessages(library(randomForestSRC))
suppressPackageStartupMessages(library(data.table))
suppressPackageStartupMessages(library(survival))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts/pintig_v3_modeling_config.R"))
d <- fread(file.path(root,"data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv"))
stopifnot(nrow(d)==4191L, uniqueN(d$participant_id)==4191L)
added <- c("smoking_pack_years","urban_rural_residence","sitting_minutes_day","heavy_episodic_alcohol","former_smoker","lipid_lowering_medication","hip_circumference_cm","diabetes_medication","psychosocial_stress","sleep_duration_hours")
tau <- 3652.5
get_cif <- function(obj) {
 k <- max(which(obj$time.interest<=tau))
 cn <- dimnames(obj$cif)[[3]]
 ci <- match("CIF.1",cn); if(is.na(ci)) ci <- 1L
 as.numeric(obj$cif[,k,ci])
}
output <- file.path(root,"analysis/results/v4_simulation")
dir.create(output,recursive=TRUE,showWarnings=FALSE)
outfile <- file.path(output,"RSF_ALL_COUNTS_16_26_OOF_SIMULATION.csv")
if(file.exists(outfile)) file.remove(outfile)
for (n in 16:26) {
 cols <- c(pintig_v3_predictors,head(added,n-16L))
 for (fold in 1:5) {
  tr <- copy(d[outer_fold!=fold]);te <- copy(d[outer_fold==fold])
  imp <- pintig_impute_train_validation_v3(tr,te)
  tr <- imp$train;te <- imp$validation
  for (c in added) if(c %in% cols) {
    vv <- tr[[c]]
    if(anyNA(vv)) stop(paste("simulation field has missing values:",c))
  }
  form <- as.formula(paste("Surv(analysis_time_days,event_type)~",paste(cols,collapse="+")))
  t0 <- proc.time()[["elapsed"]]
  model <- rfsrc(form,data=tr[,c("analysis_time_days","event_type",cols),with=FALSE],ntree=100L,mtry=max(2L,as.integer(sqrt(length(cols)))),nodesize=15L,nsplit=10L,splitrule="logrankCR",cause=1,seed=20261030L+fold)
  fit_seconds <- proc.time()[["elapsed"]]-t0
  pp <- get_cif(predict(model,newdata=te[,..cols]))
  x <- data.table(config=paste0("n",n),n_predictors=n,fold=fold,participant_id=te$participant_id,time=te$analysis_time_days,event=te$event_type,prob=pmin(pmax(pp,0),1),fit_seconds=fit_seconds)
  fwrite(x,outfile,append=file.exists(outfile))
  cat("DONE",n,fold,round(fit_seconds,2),"sec\n");flush.console()
  rm(model);gc(FALSE)
 }
}
cat("COMPLETE:",outfile,"\n")
