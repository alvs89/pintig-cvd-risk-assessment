.libPaths(c('C:/Users/Alvin Guillermo/Documents/R/win-library/4.6',.libPaths()))
suppressPackageStartupMessages({library(riskRegression);library(prodlim);library(data.table);library(survival)})
out<-'analysis/results/benchmark27_20261105_v1';rsf<-'analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3'
stopifnot(!file.exists(file.path(out,'riskRegression_auc.csv')))
view<-fread(file.path(rsf,'evaluation_followup_view.csv'));grid<-seq(3652.5/40,3652.5,length.out=40)
aa<-list();bb<-list();cc<-list();cal<-list();ph<-list()
for(name in c('RSF','Cox','FineGray')) {
 folder<-if(name=='RSF')rsf else out;prefix<-if(name=='RSF')'' else paste0(name,'_')
 d<-rbindlist(lapply(1:5,function(k)fread(file.path(folder,paste0(prefix,'fold',k,'_oof.csv')))));setorder(d,participant_id)
 stopifnot(identical(d$participant_id,view$participant_id));d[,evaluation_time_days:=view$evaluation_time_days]
 p<-as.matrix(d[,paste0('risk_',1:40),with=FALSE])
 sc<-Score(setNames(list(p),name),Hist(evaluation_time_days,event_type)~1,data=d,cause=1,times=grid,metrics=c('auc','brier'),null.model=FALSE,cens.model='KaplanMeier',se.fit=FALSE,contrasts=FALSE,verbose=0)
 aa[[name]]<-as.data.table(sc$AUC$score);bb[[name]]<-as.data.table(sc$Brier$score)
 grp<-pmin(10L,ceiling(rank(p[,40],ties.method='first')/(nrow(d)/10)))
 cal[[name]]<-rbindlist(lapply(1:10,function(g){sg<-d[grp==g];m<-prodlim(Hist(evaluation_time_days,event_type)~1,data=sg);data.table(model=name,decile=g,n=nrow(sg),predicted=mean(p[grp==g,40]),observed=as.numeric(predictRisk(m,newdata=sg[1],times=3652.5,cause=1)))}))
 d[,row_index:=.I];setorder(d,evaluation_time_days,-event_type)
 wg<-ipcw(Hist(evaluation_time_days,event_type)~1,data=d,method='marginal',times=3652.5,subject.times=d$evaluation_time_days,lag=1,keep=NULL)
 tt<-d$evaluation_time_days;ee<-d$event_type;w<-numeric(nrow(d));ev<-ee!=0&tt<=3652.5;free<-tt>3652.5
 w[ev]<-1/as.numeric(wg$IPCW.subject.times)[ev];w[free]<-1/as.numeric(wg$IPCW.times)[1]
 zz<-qlogis(pmin(pmax(p[d$row_index,40],1e-7),1-1e-7));yy<-as.integer(ee==1&tt<=3652.5)
 fit<-glm(yy~zz,weights=w,family=quasibinomial());citl<-glm(yy~1+offset(zz),weights=w,family=quasibinomial())
 stopifnot(fit$converged,citl$converged);cc[[name]]<-data.table(model=name,slope_R=coef(fit)[2],citl_R=coef(citl)[1])
}
fwrite(rbindlist(aa),file.path(out,'riskRegression_auc.csv'));fwrite(rbindlist(bb),file.path(out,'riskRegression_brier.csv'))
fwrite(rbindlist(cc),file.path(out,'calibration_R_reference.csv'));fwrite(rbindlist(cal),file.path(out,'calibration_deciles.csv'))
for(k in 1:5){bundle<-readRDS(file.path(out,paste0('Cox_fold',k,'_RESEARCH_ONLY.rds')));for(cause in names(bundle$fit$model$models)){
 z<-try(cox.zph(bundle$fit$model$models[[cause]]),silent=TRUE)
 if(inherits(z,'try-error')) ph[[length(ph)+1L]]<-data.table(fold=k,cause=cause,term='unavailable',chisq=NA_real_,df=NA_real_,p=NA_real_)
 else {t<-as.data.table(z$table,keep.rownames='term');t[,`:=`(fold=k,cause=cause)];ph[[length(ph)+1L]]<-t}
}}
fwrite(rbindlist(ph,fill=TRUE),file.path(out,'cox_ph_diagnostics.csv'))
cat('REFERENCE_COMPLETE\n')
