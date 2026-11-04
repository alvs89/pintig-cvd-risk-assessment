// Synthetic model-contract fixture only; never a real assessment or clinical result.
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import { MODEL27,MODEL27_SHA256,TRANSFORM27,PREDICTORS27,validateResearch27Request } from '../../src/services/research27Contract.mjs';
import { verifyResearchCif27,firstThresholdCrossing } from '../../src/services/researchCig27.ts';
const version=process.argv[2] ?? 'v2';
assert.match(version,/^v\d+$/);
const folder=path.resolve(`analysis/results/research_cig27_verification_20261105_${version}`);
await mkdir(folder); // fail rather than overwrite verification artifacts
const model=path.resolve('analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3/model_RESEARCH_ONLY.rds');
const hash=async()=>createHash('sha256').update(await readFile(model)).digest('hex');
assert.equal(await hash(),MODEL27_SHA256);
const features:Record<string,number|string|null>=Object.fromEntries(PREDICTORS27.map(k=>[k,0]));
Object.assign(features,{age_years:50,sex_male:1,ses_index_0_100:null,waist_cm:85,hip_circumference_cm:100,sbp_mmhg:120,dbp_mmhg:80,heart_rate_bpm:70,smoking_status:'Never',activity_min_week:150,sitting_minutes_day:360,diet_score_0_100:50,sleep_duration_hours:7});
const request={researchOnly:true,modelVersion:MODEL27,modelSha256:MODEL27_SHA256,transformVersion:TRANSFORM27,features,ses:{education_category:3,income_band:2,income_supported_people:4}};
assert.equal(validateResearch27Request(request),null);
await writeFile(path.join(folder,'fictional_request.json'),JSON.stringify(request,null,2));
const run=spawnSync('C:\\Program Files\\R\\R-4.6.1\\bin\\Rscript.exe',['scripts/research-cig27/predict.R',path.join(folder,'fictional_request.json'),path.join(folder,'actual_model_response.json')],{encoding:'utf8',windowsHide:true});
await writeFile(path.join(folder,'R_execution.txt'),run.stdout+'\n'+run.stderr);
assert.equal(run.status,0,run.stderr);
const body=JSON.parse(await readFile(path.join(folder,'actual_model_response.json'),'utf8'));
const curve=verifyResearchCif27(body);assert.ok(curve);
assert.equal(curve.annual[9].probability,curve.risk);assert.equal(await hash(),MODEL27_SHA256);
await writeFile(path.join(folder,'verification.json'),JSON.stringify({status:'PASS',fictionalFixtureOnly:true,modelHash:MODEL27_SHA256,modelUnchanged:true,actualCifPoints:curve.points.length,annualPoints:curve.annual.length,risk10:curve.risk,thresholdCrossings:Object.fromEntries([.05,.1,.2].map(t=>[t,firstThresholdCrossing(curve,t)])),currentQuestionnaireCompatible:false},null,2));
console.log(JSON.stringify({status:'PASS',points:curve.points.length,annual:curve.annual.length,questionnaireCompatible:false}));
