// Run with a local Sites dev server on 5173. This never contacts the published Site.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { balances } from '../lib/domain.mjs';
import { sha256 } from '../lib/backup.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const sites='http://localhost:5173',standalone='http://127.0.0.1:4180';
const signed=await fetch(`${sites}/signin-with-chatgpt?return_to=%2F`,{redirect:'manual'});
const siteCookie=signed.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
assert.ok(siteCookie,'Expected local preview sign-in cookie');
async function call(base,path,data,cookie='') {const response=await fetch(`${base}/api/${path}`,{method:data===undefined?'GET':'POST',headers:{cookie,'content-type':'application/json',origin:base},...(data===undefined?{}:{body:JSON.stringify(data)})});const value=await response.json();assert.ok(response.ok,`${response.status} ${JSON.stringify(value)}`);return value;}
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1kAAAAASUVORK5CYII=';
let {trip}=await call(sites,'trips',{id:crypto.randomUUID(),name:'搬家演練（含收據）',currency:'TWD',members:['記帳者','旅伴']},siteCookie);
({trip}=await call(sites,`trips/${trip.id}/expense`,{id:crypto.randomUUID(),revision:trip.revision,title:'車票測試',amount:126500,payerId:trip.members[0].id,memberIds:trip.members.map(m=>m.id),mode:'equal',category:'交通',date:'2026-09-22',file:{mime:'image/png',data:png}},siteCookie));
({trip}=await call(sites,`trips/${trip.id}/expense`,{id:crypto.randomUUID(),revision:trip.revision,title:'共同採購與個人物品',amount:10001,payments:[{memberId:trip.members[0].id,amount:10001}],memberIds:trip.members.map(m=>m.id),personalItems:[{name:'旅伴個人物品',memberId:trip.members[1].id,amount:2001}],mode:'mixed',category:'購物',date:'2026-09-22'},siteCookie));
({trip}=await call(sites,`trips/${trip.id}/repayment`,{id:crypto.randomUUID(),revision:trip.revision,fromId:trip.members[1].id,toId:trip.members[0].id,amount:20000,date:'2026-09-22'},siteCookie));
const backup=await call(sites,`trips/${trip.id}/backup`,undefined,siteCookie);
assert.equal(backup.schemaVersion,7);assert.deepEqual(backup.trip.expenses[1].personalItems,trip.expenses[1].personalItems);
const runDir=`${root}/.test-output/rehearsal-${Date.now()}`;mkdirSync(runDir,{recursive:true});writeFileSync(`${runDir}/backup.json`,JSON.stringify(backup,null,2));
const password=randomBytes(32).toString('hex');let server;
async function start(){server=spawn(process.execPath,['standalone/server.mjs'],{cwd:root,env:{...process.env,TRIPLEDGER_PASSWORD:password,PORT:'4180',DATA_DIR:`${runDir}/data`},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Standalone startup timeout')),15000);server.once('exit',code=>{clearTimeout(timer);reject(new Error(`Standalone exited ${code}`));});server.stdout.on('data',chunk=>{if(chunk.toString().includes('independent server')){clearTimeout(timer);resolve();}});server.stderr.on('data',chunk=>{if(!chunk.toString().includes('ExperimentalWarning'))process.stderr.write(chunk);});});}
async function stop(){if(server&&server.exitCode===null){const closed=new Promise(resolve=>server.once('exit',resolve));server.kill();await closed;}}
async function login(){const response=await fetch(`${standalone}/api/login`,{method:'POST',headers:{'content-type':'application/json',origin:standalone},body:JSON.stringify({password})});assert.equal(response.status,200);return response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');}
try{
  await start();let cookie=await login();assert.equal((await fetch(`${standalone}/api/state`)).status,401);
  const imported=await call(standalone,'import',backup,cookie),after=imported.trip;
  assert.equal(after.id,trip.id);assert.deepEqual(after.members,trip.members);assert.deepEqual(after.repayments,trip.repayments);assert.deepEqual(balances(after),balances(trip));assert.equal(after.expenses[0].id,trip.expenses[0].id);
  assert.deepEqual(after.expenses[1].equalMemberIds,trip.expenses[1].equalMemberIds);assert.deepEqual(after.expenses[1].personalItems,trip.expenses[1].personalItems);assert.deepEqual(after.expenses[1].shares,trip.expenses[1].shares);
  const receipt=await fetch(`${standalone}/api/trips/${trip.id}/receipts/${after.expenses[0].receipt.id}`,{headers:{cookie}});assert.equal(receipt.status,200);assert.equal(await sha256(new Uint8Array(await receipt.arrayBuffer())),backup.files[0].sha256);
  const second=await fetch(`${standalone}/api/import`,{method:'POST',headers:{cookie,'content-type':'application/json',origin:standalone},body:JSON.stringify(backup)});assert.equal(second.status,409);
  await stop();await start();cookie=await login();const state=await call(standalone,'state',undefined,cookie);assert.equal(state.trips.length,1);assert.deepEqual(balances(state.trips[0]),balances(trip));
  const report={passed:true,source:'Sites local D1 + R2',destination:'Windows Node.js + SQLite + local receipts (no Sites runtime)',tripId:trip.id,backupSchema:backup.schemaVersion,expenses:after.expenses.length,mixedItems:after.expenses[1].personalItems.length,repayments:after.repayments.length,receiptSha256:backup.files[0].sha256,balances:balances(after),restartVerified:true,duplicateImportRejected:true};
  writeFileSync(`${runDir}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,reportPath:`${runDir}/report.json`},null,2));
}finally{await stop();}
