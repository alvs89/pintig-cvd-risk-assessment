.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(randomForestSRC))
suppressPackageStartupMessages(library(survival))
suppressPackageStartupMessages(library(data.table))

root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts","pintig_v3_modeling_config.R"))
infile <- file.path(root,"data","processed","pintig_frozen_clean_analysis_v3_16predictors.csv")
outdir <- file.path(root,"analysis","modeling","v3_16predictors")
dir.create(outdir, showWarnings=FALSE, recursive=TRUE)

d <- fread(infile)
preds <- pintig_v3_predictors
tau <- 3652.5
stopifnot(
  nrow(d)==4191L, uniqueN(d$participant_id)==4191L,
  length(preds)==16L,
  sum(d$event_type==1)==369L,
  sum(d$event_type==2)==218L,
  sum(d$event_type==0)==3604L
)

make_inner_folds <- function(dat, seed) {
  set.seed(seed)
  out <- integer(nrow(dat))
  for (ev in sort(unique(dat$event_type))) {
    idx <- which(dat$event_type == ev)
    idx <- sample(idx,length(idx),replace=FALSE)
    out[idx] <- rep(1:3,length.out=length(idx))
  }
  out
}

brier_cr <- function(time,status,pred,tau=3652.5) {
  ut <- sort(unique(time))
  G <- 1
  g_after <- numeric(length(ut))
  for (j in seq_along(ut)) {
    tt <- ut[j]
    at_risk <- sum(time >= tt)
    d_cens <- sum(time == tt & status == 0)
    if (d_cens > 0) G <- G * (1 - d_cens/at_risk)
    g_after[j] <- G
  }
  Gbefore <- function(x) {
    idx <- findInterval(x,ut,left.open=TRUE)
    out <- rep(1,length(x))
    z <- idx > 0
    out[z] <- g_after[idx[z]]
    pmax(out,1e-6)
  }
  y <- as.numeric(status==1 & time<=tau)
  w <- numeric(length(time))
  obs_event <- time<=tau & status!=0
  known_free <- time>tau | (time==tau & status==0)
  if (any(obs_event)) w[obs_event] <- 1/Gbefore(time[obs_event])
  if (any(known_free)) w[known_free] <- 1/Gbefore(rep(tau,sum(known_free)))
  mean(w*(y-pred)^2)
}

get_cif1 <- function(obj,tau=3652.5) {
  k <- max(which(obj$time.interest <= tau))
  cn <- dimnames(obj$cif)[[3]]
  ci <- match("CIF.1",cn)
  if (is.na(ci)) ci <- 1L
  pmin(pmax(as.numeric(obj$cif[,k,ci]),0),1)
}

form <- as.formula(paste("Surv(analysis_time_days,event_type) ~",paste(preds,collapse="+")))

# Prespecified mtry landmarks for p=16: sqrt(p)=4, p/3≈5, p/2=8.
mtry_vals <- c(4L,5L,8L)
nodesize_vals <- c(5L,10L,15L,20L)
nsplit_vals <- c(0L,10L,50L)
coarse_grid <- CJ(mtry=mtry_vals,nodesize=nodesize_vals,nsplit=nsplit_vals)
coarse_grid[,config_id:=.I]

all_oof <- list()
all_coarse <- list()
all_refine <- list()
all_ntree <- list()
all_selected <- list()
inner_assignments <- list()

for (outer in 1:5) {
  cat("\n===== V3 OUTER FOLD",outer,"=====\n")
  tr_raw <- copy(d[outer_fold != outer]); setorder(tr_raw,participant_id)
  te_raw <- copy(d[outer_fold == outer]); setorder(te_raw,participant_id)

  tr_raw[,inner_fold:=make_inner_folds(tr_raw,20261006L+outer)]
  inner_assignments[[outer]] <- tr_raw[,.(participant_id,outer_fold=outer,inner_fold,event_type)]
  fwrite(rbindlist(inner_assignments),file.path(outdir,"v3_inner_fold_assignments.csv"))

  coarse_rows <- list()
  for (g in 1:nrow(coarse_grid)) {
    cfg <- coarse_grid[g]
    bs <- numeric(3)
    secs <- numeric(3)
    for (inner in 1:3) {
      itr_raw <- copy(tr_raw[inner_fold != inner])
      iva_raw <- copy(tr_raw[inner_fold == inner])
      z <- pintig_impute_train_validation_v3(itr_raw,iva_raw)
      itr <- z$train
      iva <- z$validation

      t0 <- proc.time()[["elapsed"]]
      m <- rfsrc(
        form,
        data=itr[,c("analysis_time_days","event_type",preds),with=FALSE],
        ntree=100,mtry=cfg$mtry,nodesize=cfg$nodesize,nsplit=cfg$nsplit,
        splitrule="logrankCR",cause=1,
        seed=202710000L+outer*1000L+g*10L+inner
      )
      secs[inner] <- proc.time()[["elapsed"]]-t0
      pp <- get_cif1(predict(m,newdata=iva[,..preds]),tau)
      bs[inner] <- brier_cr(iva$analysis_time_days,iva$event_type,pp,tau)
      rm(m); gc(FALSE)
    }
    coarse_rows[[g]] <- data.table(
      outer_fold=outer,config_id=cfg$config_id,screen_ntree=100L,
      mtry=cfg$mtry,nodesize=cfg$nodesize,nsplit=cfg$nsplit,
      brier1=bs[1],brier2=bs[2],brier3=bs[3],
      mean_brier=mean(bs),sd_brier=sd(bs),fit_seconds=sum(secs)
    )
    if (g%%6==0) cat("Outer",outer,"screen",g,"/",nrow(coarse_grid),"\n")
  }

  coarse <- rbindlist(coarse_rows)
  setorder(coarse,mean_brier,sd_brier)
  all_coarse[[outer]] <- coarse
  fwrite(rbindlist(all_coarse),file.path(outdir,"v3_rsf_stageA_screening.csv"))

  top3 <- coarse[1:min(3,.N),.(config_id,mtry,nodesize,nsplit)]
  refine_rows <- list()
  for (j in 1:nrow(top3)) {
    cfg <- top3[j]
    bs <- numeric(3)
    secs <- numeric(3)
    for (inner in 1:3) {
      itr_raw <- copy(tr_raw[inner_fold != inner])
      iva_raw <- copy(tr_raw[inner_fold == inner])
      z <- pintig_impute_train_validation_v3(itr_raw,iva_raw)
      itr <- z$train
      iva <- z$validation

      t0 <- proc.time()[["elapsed"]]
      m <- rfsrc(
        form,
        data=itr[,c("analysis_time_days","event_type",preds),with=FALSE],
        ntree=500,mtry=cfg$mtry,nodesize=cfg$nodesize,nsplit=cfg$nsplit,
        splitrule="logrankCR",cause=1,
        seed=202720000L+outer*1000L+j*10L+inner
      )
      secs[inner] <- proc.time()[["elapsed"]]-t0
      pp <- get_cif1(predict(m,newdata=iva[,..preds]),tau)
      bs[inner] <- brier_cr(iva$analysis_time_days,iva$event_type,pp,tau)
      rm(m); gc(FALSE)
    }
    refine_rows[[j]] <- data.table(
      outer_fold=outer,config_id=cfg$config_id,ntree=500L,
      mtry=cfg$mtry,nodesize=cfg$nodesize,nsplit=cfg$nsplit,
      brier1=bs[1],brier2=bs[2],brier3=bs[3],
      mean_brier=mean(bs),sd_brier=sd(bs),fit_seconds=sum(secs)
    )
    cat("Outer",outer,"refine",j,"/3\n")
  }

  refine <- rbindlist(refine_rows)
  setorder(refine,mean_brier,sd_brier)
  best_struct <- refine[1]
  all_refine[[outer]] <- refine
  fwrite(rbindlist(all_refine),file.path(outdir,"v3_rsf_stageB_refinement.csv"))

  nt_rows <- list()
  nt_rows[["500"]] <- copy(best_struct)[,c("config_id"):=NULL]
  for (nt in c(1000L,1500L)) {
    bs <- numeric(3)
    secs <- numeric(3)
    for (inner in 1:3) {
      itr_raw <- copy(tr_raw[inner_fold != inner])
      iva_raw <- copy(tr_raw[inner_fold == inner])
      z <- pintig_impute_train_validation_v3(itr_raw,iva_raw)
      itr <- z$train
      iva <- z$validation

      t0 <- proc.time()[["elapsed"]]
      m <- rfsrc(
        form,
        data=itr[,c("analysis_time_days","event_type",preds),with=FALSE],
        ntree=nt,mtry=best_struct$mtry,nodesize=best_struct$nodesize,nsplit=best_struct$nsplit,
        splitrule="logrankCR",cause=1,
        seed=202730000L+outer*1000L+nt+inner
      )
      secs[inner] <- proc.time()[["elapsed"]]-t0
      pp <- get_cif1(predict(m,newdata=iva[,..preds]),tau)
      bs[inner] <- brier_cr(iva$analysis_time_days,iva$event_type,pp,tau)
      rm(m); gc(FALSE)
    }
    nt_rows[[as.character(nt)]] <- data.table(
      outer_fold=outer,ntree=nt,mtry=best_struct$mtry,
      nodesize=best_struct$nodesize,nsplit=best_struct$nsplit,
      brier1=bs[1],brier2=bs[2],brier3=bs[3],
      mean_brier=mean(bs),sd_brier=sd(bs),fit_seconds=sum(secs)
    )
  }

  nts <- rbindlist(nt_rows,fill=TRUE)
  if (!"ntree" %in% names(nts) || any(is.na(nts$ntree))) nts[is.na(ntree),ntree:=500L]
  setorder(nts,mean_brier,sd_brier,ntree)
  best <- nts[1]
  all_ntree[[outer]] <- nts
  all_selected[[outer]] <- best
  fwrite(rbindlist(all_ntree,fill=TRUE),file.path(outdir,"v3_rsf_stageC_ntree.csv"))
  fwrite(rbindlist(all_selected,fill=TRUE),file.path(outdir,"v3_rsf_selected_hyperparameters.csv"))

  cat("Selected outer",outer,": ntree=",best$ntree,
      " mtry=",best$mtry," nodesize=",best$nodesize,
      " nsplit=",best$nsplit," mean inner Brier=",
      format(best$mean_brier,digits=6),"\n",sep="")

  zouter <- pintig_impute_train_validation_v3(
    copy(tr_raw[,inner_fold:=NULL]),
    copy(te_raw)
  )
  tr <- zouter$train
  te <- zouter$validation

  final <- rfsrc(
    form,
    data=tr[,c("analysis_time_days","event_type",preds),with=FALSE],
    ntree=best$ntree,mtry=best$mtry,nodesize=best$nodesize,nsplit=best$nsplit,
    splitrule="logrankCR",cause=1,importance="permute",
    seed=202740000L+outer
  )
  pte <- predict(final,newdata=te[,..preds])
  risk <- get_cif1(pte,tau)

  all_oof[[outer]] <- data.table(
    participant_id=te$participant_id,outer_fold=outer,
    analysis_time_days=te$analysis_time_days,event_type=te$event_type,
    pred_cif_major_cvd_10y=risk
  )
  fwrite(rbindlist(all_oof)[order(participant_id)],
         file.path(outdir,"v3_rsf_oof_predictions.csv"))

  cat("Outer",outer,"OOF mean=",mean(risk)," min=",min(risk)," max=",max(risk),"\n")
  rm(final,pte); gc(FALSE)
}

oof <- rbindlist(all_oof)[order(participant_id)]
stopifnot(
  nrow(oof)==4191L,uniqueN(oof$participant_id)==4191L,
  all(oof$pred_cif_major_cvd_10y>=0 & oof$pred_cif_major_cvd_10y<=1)
)
sumtab <- oof[,.(n=.N,major_cvd=sum(event_type==1),competing_death=sum(event_type==2),
                 mean_pred=mean(pred_cif_major_cvd_10y),
                 min_pred=min(pred_cif_major_cvd_10y),
                 max_pred=max(pred_cif_major_cvd_10y)),by=outer_fold]
fwrite(sumtab,file.path(outdir,"v3_rsf_fold_summary.csv"))

cat("\nV3 NESTED RSF COMPLETE\n")
print(sumtab)
