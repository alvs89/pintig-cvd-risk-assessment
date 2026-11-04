// Local, fictional model-contract fixture; does not enable questionnaire inference.
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { verifyResearchCif27 } from '../../src/services/researchCig27.ts';
const folder='analysis/results/research_cig27_verification_20261105_v2';
const request=JSON.parse(await readFile(`${folder}/fictional_request.json`,'utf8'));
const expected=JSON.parse(await readFile(`${folder}/actual_model_response.json`,'utf8'));
const health=await fetch('http://127.0.0.1:8767/health');assert.equal(health.status,200);
const status=await health.json();assert.equal(status.questionnaireCompatibility,'blocked');
const post=(body:unknown,authorized=true)=>fetch('http://127.0.0.1:8767/research-cig-27',{
 method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:5173',...(authorized?{'X-Pintig-Research':'questionnaire-27-cig-research-only'}:{})},body:JSON.stringify(body)});
const response=await post(request);assert.equal(response.status,200);
const actual=await response.json();assert.ok(verifyResearchCif27(actual));
assert.deepEqual(actual.cif.times,expected.cif.times);
// Parallel forest reductions can differ at machine precision across R processes.
const maxDifference=Math.max(...actual.cif.probabilities.map((p:number,i:number)=>Math.abs(p-expected.cif.probabilities[i])));
assert.ok(maxDifference<1e-12);assert.ok(Math.abs(actual.risk10-expected.risk10)<1e-12);
const missing=structuredClone(request);delete missing.features.dbp_mmhg;
assert.equal((await post(missing)).status,422);
assert.equal((await post({...request,transformVersion:'unverified'})).status,422);
assert.equal((await post(request,false)).status,403);
const report={status:'PASS',actualModelService:true,allNativePointsMatchDirectR:true,maxAbsoluteDifference:maxDifference,tolerance:1e-12,missingInputRejected:true,incompatibleTransformRejected:true,unauthorizedRejected:true,currentQuestionnaireCompatible:false};
await writeFile(`${folder}/service_verification.json`,JSON.stringify(report,null,2),{flag:'wx'});
console.log(report);
