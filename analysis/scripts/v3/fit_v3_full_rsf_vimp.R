.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(randomForestSRC))
suppressPackageStartupMessages(library(data.table))
suppressPackageStartupMessages(library(survival))

root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
oldroot <- "C:/Users/Alvin Guillermo/Downloads/pintig_pre_model_data_audit"
source(file.path(root,"scripts","pintig_v3_modeling_config.R"))
d <- fread(file=file.path(root,"data","processed","pintig_frozen_clean_analysis_v3_16predictors.csv"))
imp <- pintig_learn_imputer_v3(d)
dfull <- pintig_apply_imputer_v3(d,imp)
preds <- pintig_v3_predictors
form <- as.formula(paste("Surv(analysis_time_days,event_type)~",paste(preds,collapse="+")))

# Across v3 outer folds, 500 trees has the lowest mean Stage-C inner Brier.
stageC <- fread(file=file.path(root,"analysis","modeling","v3_16predictors","v3_rsf_stageC_ntree.csv"))
agg <- stageC[,.(mean_inner_brier=mean(mean_brier),sd_inner_brier=sd(mean_brier),
                mean_fit_seconds=mean(fit_seconds)),by=ntree][order(mean_inner_brier,ntree)]
selected_ntree <- agg$ntree[1]
stopifnot(selected_ntree==500L)

set.seed(202660006L)
t0 <- proc.time()[["elapsed"]]
rf3 <- rfsrc(form,
  data=dfull[,c("analysis_time_days","event_type",preds),with=FALSE],
  ntree=selected_ntree,mtry=4,nodesize=20,nsplit=10,
  splitrule="logrankCR",cause=1,importance="permute",
  seed=202660006L)
elapsed <- proc.time()[["elapsed"]]-t0

modeldir <- file.path(root,"analysis","modeling","v3_16predictors","provisional_full_data_models")
dir.create(modeldir,recursive=TRUE,showWarnings=FALSE)
saveRDS(rf3,file.path(modeldir,"pintig_v3_provisional_full_rsf.rds"))
fwrite(agg,file.path(modeldir,"v3_full_rsf_ntree_aggregate_selection.csv"))

extract_vimp <- function(rf,version) {
  vi <- rf$importance
  if (is.null(vi)) stop("No importance in ",version)
  if (is.vector(vi)) {
    out <- data.table(feature=names(vi),importance=as.numeric(vi))
  } else {
    m <- as.matrix(vi)
    rn <- rownames(m); cn <- colnames(m)
    # For targeted cause=1 forests, first importance column corresponds to event 1 if multiple.
    j <- 1L
    if (!is.null(cn)) {
      hit <- grep("1|cause.1|event.1",cn,ignore.case=TRUE)
      if (length(hit)>0) j <- hit[1]
    }
    out <- data.table(feature=rn,importance=as.numeric(m[,j]),
                      importance_column=if(is.null(cn)) as.character(j) else cn[j])
  }
  out[,version:=version]
  out
}

v3vi <- extract_vimp(rf3,"v3_16_predictors")
oldmodel <- file.path(oldroot,"r_model_results","tradeoff_completion","provisional_full_data_models","pintig_provisional_full_rsf.rds")
rf2 <- readRDS(oldmodel)
v2vi <- extract_vimp(rf2,"v2_13_predictors")
vi <- rbindlist(list(v2vi,v3vi),fill=TRUE)
setorder(vi,version,-importance)
fwrite(vi,file.path(root,"analysis","results","v3","V2_V3_RSF_FULLDATA_PERMUTATION_IMPORTANCE.csv"))

meta <- data.table(selected_ntree=selected_ntree,mtry=4L,nodesize=20L,nsplit=10L,
                   splitrule="logrankCR",cause=1L,fit_seconds=elapsed,
                   bp_medication_mode=imp$bp_medication_mode,
                   smoker_cigarettes_per_day_median=imp$current_smoker_cigarettes_per_day_median,
                   heart_rate_bpm_median=imp$heart_rate_bpm_median)
fwrite(meta,file.path(modeldir,"v3_full_rsf_metadata.csv"))
cat("FULL V3 RSF VIMP COMPLETE\n")
print(agg)
print(v3vi[order(-importance)])
