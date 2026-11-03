.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6",.libPaths()))
suppressPackageStartupMessages(library(randomForestSRC))
suppressPackageStartupMessages(library(data.table))
suppressPackageStartupMessages(library(survival))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
d <- fread(file.path(root,"data/processed/pintig_experimental_v4_26predictors_SIMULATED_DO_NOT_DEPLOY.csv"))
stopifnot(nrow(d)==4191L,uniqueN(d$participant_id)==4191L)
base <- c("age_years","sex_male","sbp_mmhg","dbp_mmhg","waist_cm","current_smoker","hypertension_history","bp_medication","alcohol_drinks_week","activity_min_week","diet_score_0_100","ses_index_0_100","family_history_cvd","diabetes","cigarettes_per_day","heart_rate_bpm")
sim <- c("smoking_pack_years","urban_rural_residence","sitting_minutes_day","heavy_episodic_alcohol","former_smoker","lipid_lowering_medication","hip_circumference_cm","diabetes_medication","psychosocial_stress","sleep_duration_hours")
sets <- list(base16=base,sim21=c(base,sim[1:5]),sim26=c(base,sim))
tau <- 3652.5
# Train-only median/mode imputation, no full-dataset prefit
impute <- function(tr,te,cols) {
 for (c in cols) {
  vv <- tr[[c]][is.finite(tr[[c]])]
  if (!length(vv)) stop(paste("all missing predictor",c))
  fill <- median(vv)
  set(tr,which(!is.finite(tr[[c]])),c,fill)
  set(te,which(!is.finite(te[[c]])),c,fill)
 }
 list(train=tr,test=te)
}
get_cif <- function(obj) {
 k <- max(which(obj$time.interest<=tau))
 ci <- match("CIF.1",dimnames(obj$cif)[[3]])
 if(is.na(ci)) ci <- 1L
 as.numeric(obj$cif[,k,ci])
}
out <- list();i <- 0L
for (nm in names(sets)) {
 cols <- sets[[nm]]
 for (fold in 1:5) {
  tr <- copy(d[outer_fold!=fold]);te <- copy(d[outer_fold==fold])
  zz <- impute(tr,te,cols)
  tr <- zz$train;te <- zz$test
  f <- as.formula(paste("Surv(analysis_time_days,event_type)~",paste(cols,collapse="+")))
  t0 <- proc.time()[["elapsed"]]
  model <- rfsrc(f,data=tr[,c("analysis_time_days","event_type",cols),with=FALSE],ntree=100,mtry=max(2L,as.integer(sqrt(length(cols)))),nodesize=15,nsplit=10,splitrule="logrankCR",cause=1,seed=20261030L+fold)
  elapsed <- proc.time()[["elapsed"]]-t0
  pp <- get_cif(predict(model,newdata=te[,..cols]))
  i <- i+1L
  out[[i]] <- data.table(config=nm,fold=fold,participant_id=te$participant_id,time=te$analysis_time_days,event=te$event_type,prob=pmin(pmax(pp,0),1),fit_seconds=elapsed)
  cat("COMPLETE ",nm," fold ",fold," seconds=",elapsed,"\n",sep="")
  rm(model);gc(FALSE)
 }
}
oof <- rbindlist(out)
dir.create(file.path(root,"analysis/results/v4_simulation"),recursive=TRUE,showWarnings=FALSE)
fwrite(oof,file.path(root,"analysis/results/v4_simulation/RSF_PILOT_OOF_SIMULATION.csv"))
cat("SAVED ",nrow(oof)," OOF rows\n")
