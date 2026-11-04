import http from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtemp,readFile,writeFile,rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL27,MODEL27_SHA256,validateResearch27Request } from '../../src/services/research27Contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const model=path.join(root,'analysis/results/rsf27_questionnaire_aligned_proxy_20261103_v3/model_RESEARCH_ONLY.rds');
const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
async function modelReady(){return createHash('sha256').update(await readFile(model)).digest('hex')===MODEL27_SHA256;}
let busy=false;
http.createServer(async(req,res)=>{
 if(!['127.0.0.1','::1'].includes(req.socket.remoteAddress))return send(res,403,{error:'loopback-only'});
 if(req.method==='GET'&&req.url==='/health') {try{return send(res,await modelReady()?200:503,{modelVersion:MODEL27,researchOnly:true,questionnaireCompatibility:'blocked',reason:'SES and predictor transformation differences remain.'});}catch{return send(res,503,{error:'Model artifact unavailable.'});}}
 if(req.method!=='POST'||req.url!=='/research-cig-27')return send(res,404,{error:'not-found'});
 if(!['http://127.0.0.1:5173','http://127.0.0.1:5174'].includes(req.headers.origin)||req.headers['x-pintig-research']!=='questionnaire-27-cig-research-only')return send(res,403,{error:'local-research-origin-required'});
 if(busy)return send(res,503,{error:'A research calculation is in progress. Try again shortly.'});
 let dir, acquired=false;
 try {
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>32768)return send(res,413,{error:'request-too-large'});chunks.push(chunk);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));const reason=validateResearch27Request(body);
  if(reason)return send(res,422,{error:reason});
  if(busy)return send(res,503,{error:'A research calculation is in progress. Try again shortly.'});
  busy=true;acquired=true;
  if(!await modelReady())return send(res,503,{error:'Saved model does not match the audited artifact.'});
  dir=await mkdtemp(path.join(tmpdir(),'pintig-cig27-'));
  const input=path.join(dir,'input.json'),output=path.join(dir,'output.json');await writeFile(input,JSON.stringify(body));
  await new Promise((resolve,reject)=>{
   const child=spawn('C:\\Program Files\\R\\R-4.6.1\\bin\\Rscript.exe',[path.join(root,'scripts/research-cig27/predict.R'),input,output],{cwd:root,windowsHide:true,stdio:'ignore'});
   const timer=setTimeout(()=>{child.kill();reject(new Error('Research calculation timed out.'));},45000);
   child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Model rejected the supplied inputs.'));});
  });
  send(res,200,JSON.parse(await readFile(output,'utf8')));
 }catch{send(res,422,{error:'Research graph unavailable: incompatible inputs or model execution failure.'});}
 finally{try{if(dir)await rm(dir,{recursive:true,force:true});}finally{if(acquired)busy=false;}}
}).listen(8767,'127.0.0.1',()=>console.log('PINTIG 27-predictor CIG service: http://127.0.0.1:8767 (questionnaire compatibility blocked)'));
