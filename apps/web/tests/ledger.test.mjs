import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { newTrip, mutateTrip, balances, evenShares, parseMoney, validateTrip, LIMITS, assertDocumentSize, isChangeRetry } from '../lib/domain.mjs';
import { filterExpenses } from '../lib/filters.mjs';
import { sha256, encode, inspectBackup } from '../lib/backup.mjs';
import { handleApi } from '../lib/api.mjs';
import { openStorage } from '../standalone/storage.mjs';

const make=()=>newTrip({id:crypto.randomUUID(),name:'還原驗證旅程',currency:'TWD',members:['小安','小宇','小林']});
const expense=t=>({id:crypto.randomUUID(),title:'共同晚餐',category:'餐飲',date:'2026-09-22',amount:10000,payerId:t.members[0].id,mode:'equal',memberIds:t.members.map(m=>m.id)});
test('integer money: exact precision, zero/negative/overflow/unknown currency rejected',()=>{
  assert.equal(parseMoney('1.01','USD'),101);assert.equal(parseMoney('101','JPY'),101);
  for(const [amount,currency] of [['1.001','USD'],['1.1','JPY'],['0','TWD'],['-1','TWD'],['NaN','TWD'],['1','XXX'],['999999999999','USD']])assert.throws(()=>parseMoney(amount,currency));
});
test('equal split preserves every minor unit and deterministic remainder',()=>{assert.deepEqual(evenShares(100,['a','b','c']).map(x=>x.amount),[34,33,33]);assert.deepEqual(evenShares(2,['a','b','c']).map(x=>x.amount),[1,1,0]);assert.throws(()=>evenShares(2,['a','a']));assert.throws(()=>evenShares(2,[]));});
test('exact split rejects mismatched sum and nonmembers without mutating original',()=>{const t=make(),input=expense(t);assert.throws(()=>mutateTrip(t,'expense',{...input,mode:'exact',shares:[{memberId:t.members[0].id,amount:9999}]}));assert.throws(()=>mutateTrip(t,'expense',{...input,memberIds:[crypto.randomUUID()]}));assert.equal(t.expenses.length,0);const result=mutateTrip(t,'expense',{...input,mode:'exact',shares:[{memberId:t.members[1].id,amount:10000}]});assert.equal(result.expenses[0].shares[0].amount,10000);});
test('confirmed partial repayment reduces debt; duplicate is idempotent; void restores it',()=>{let t=make();t=mutateTrip(t,'expense',expense(t));const [a,b,c]=t.members;assert.deepEqual(balances(t),{[a.id]:6666,[b.id]:-3333,[c.id]:-3333});const repayment={id:crypto.randomUUID(),fromId:b.id,toId:a.id,amount:3000,date:'2026-09-22'};t=mutateTrip(t,'repayment',repayment);assert.equal(balances(t)[b.id],-333);assert.equal(balances(t)[a.id],3666);assert.equal(Object.values(balances(t)).reduce((a,b)=>a+b),0);assert.equal(mutateTrip(t,'repayment',repayment).repayments.length,1);assert.throws(()=>mutateTrip(t,'repayment',{...repayment,id:crypto.randomUUID(),amount:334}));t=mutateTrip(t,'void-repayment',{id:repayment.id});assert.equal(balances(t)[b.id],-3333);});
test('backup validation rejects broken references, duplicate IDs and unknown versions',async()=>{const t=make();assert.throws(()=>validateTrip({...t,members:[t.members[0],t.members[0]]}));await assert.rejects(inspectBackup({format:'tripledger-backup',schemaVersion:9,trip:t,files:[]}));});

test('persistent API: account isolation, CAS, retries, receipt backup and independent SQLite restore',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'tripledger-'));let storage=openStorage(join(dir,'source'));let restored;
  const call=async(path,data,subject='owner-A',target=storage)=>{const req=new Request(`http://localhost/api/${path}`,{method:data===undefined?'GET':'POST',...(data!==undefined?{headers:{'content-type':'application/json','origin':'http://localhost'},body:JSON.stringify(data)}:{})});const response=await handleApi(req,{...target,subject,mode:'standalone'});return {status:response.status,value:await response.json()};};
  try{
    assert.equal((await call('state',undefined,null)).status,401);
    const id=crypto.randomUUID();let result=await call('trips',{id,name:'測試旅程',currency:'TWD',members:['小安','小宇']});assert.equal(result.status,201);let t=result.value.trip;
    const bytes=Uint8Array.from([137,80,78,71,13,10,26,10]),input={...expense(t),revision:t.revision,file:{mime:'image/png',data:encode(bytes)}};
    result=await call(`trips/${id}/expense`,input);assert.equal(result.status,200);t=result.value.trip;
    assert.equal((await call(`trips/${id}/expense`,input)).value.trip.expenses.length,1);
    assert.equal((await call(`trips/${id}/expense`,{...input,id:crypto.randomUUID()})).status,409);
    for(const path of [`trips/${id}/backup`,`trips/${id}/receipts/${t.expenses[0].receipt.id}`])assert.equal((await call(path,undefined,'owner-B')).status,404);
    assert.equal((await call(`trips/${id}/repayment`,{id:crypto.randomUUID(),revision:t.revision,fromId:t.members[1].id,toId:t.members[0].id,amount:2000,date:'2026-09-22'})).status,200);
    const before=(await call('state')).value.trips[0], backup=(await call(`trips/${id}/backup`)).value;
    assert.equal(backup.files.length,1);assert.equal(backup.files[0].sha256,await sha256(bytes));
    storage.close();storage=openStorage(join(dir,'source'));assert.deepEqual((await call('state')).value.trips[0],before);
    restored=openStorage(join(dir,'restored'));
    const imported=await call('import',backup,'local-owner',restored);assert.equal(imported.status,201);const after=imported.value.trip;
    assert.equal(after.id,before.id);assert.deepEqual(balances(after),balances(before));assert.deepEqual(after.members,before.members);assert.deepEqual(after.repayments,before.repayments);assert.equal(after.expenses[0].id,before.expenses[0].id);
    assert.deepEqual(await restored.objects.get(`${id}/${after.expenses[0].receipt.id}`),bytes);
    assert.equal((await call('import',backup,'local-owner',restored)).status,409);
    const corrupt=structuredClone(backup);corrupt.trip.id=crypto.randomUUID();corrupt.files[0].data=encode(new Uint8Array([1,2,3]));assert.equal((await call('import',corrupt,'local-owner',restored)).status,400);assert.equal((await call('state',undefined,'local-owner',restored)).value.trips.length,1);
    const raceTrip=make(),owner=await storage.repo.account('race');await storage.repo.insert(raceTrip,owner);const outcomes=await Promise.all([storage.repo.update({...raceTrip,name:'A'},owner,1),storage.repo.update({...raceTrip,name:'B'},owner,1)]);assert.equal(outcomes.filter(Boolean).length,1);
  }finally{storage.close();restored?.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep+'tripledger-'));rmSync(dir,{recursive:true,force:true});}
});

test('lost DB acknowledgement preserves committed receipts; definite conflict cleans unreferenced files',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'tripledger-'));const storage=openStorage(dir),owner=await storage.repo.account('owner');
  const t=make();await storage.repo.insert(t,owner);
  const bytes=Uint8Array.from([137,80,78,71,13,10,26,10]);const input={...expense(t),revision:1,file:{mime:'image/png',data:encode(bytes)}};
  const request=(path,body)=>new Request(`http://localhost/api/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  try {
    const repo={...storage.repo,update:async(...args)=>{await storage.repo.update(...args);throw new Error('simulated lost commit acknowledgement');}};
    assert.equal((await handleApi(request(`trips/${t.id}/expense`,input),{...storage,repo,subject:'owner'})).status,500);
    const saved=await storage.repo.get(t.id,owner);assert.ok(await storage.objects.get(`${t.id}/${saved.expenses[0].receipt.id}`));
    const backupResponse=await handleApi(new Request(`http://localhost/api/trips/${t.id}/backup`),{...storage,subject:'owner'});assert.equal(backupResponse.status,200);const backup=await backupResponse.json();backup.trip.id=crypto.randomUUID();
    const importing={...storage.repo,insert:async(...args)=>{await storage.repo.insert(...args);throw new Error('simulated import acknowledgement loss');}};
    assert.equal((await handleApi(request('import',backup),{...storage,repo:importing,subject:'owner'})).status,500);
    const imported=await storage.repo.get(backup.trip.id,owner);assert.ok(await storage.objects.get(`${imported.id}/${imported.expenses[0].receipt.id}`));
    assert.equal((await handleApi(new Request(`http://localhost/api/trips/${imported.id}/backup`),{...storage,subject:'owner'})).status,200);
    const removed=[];const rejecting={...storage.repo,update:async()=>0};
    const failed=await handleApi(request(`trips/${t.id}/expense`,{...input,id:crypto.randomUUID(),revision:saved.revision}),{...storage,repo:rejecting,subject:'owner',objects:{...storage.objects,delete:async key=>{removed.push(key);await storage.objects.delete(key);}}});
    assert.equal(failed.status,409);assert.equal(removed.length,1);assert.equal(await storage.objects.get(removed[0]),null);assert.ok(await storage.objects.get(`${t.id}/${saved.expenses[0].receipt.id}`));
  }finally{storage.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep+'tripledger-'));rmSync(dir,{recursive:true,force:true});}
});

test('correction retains receipt and paid repayment, may reverse debt, and retries do not overwrite later corrections',()=>{
  let t=newTrip({id:crypto.randomUUID(),name:'兩人旅程',currency:'TWD',members:['甲','乙']});
  const input=expense(t);t=mutateTrip(t,'expense',input);
  t=mutateTrip(t,'repayment',{id:crypto.randomUUID(),fromId:t.members[1].id,toId:t.members[0].id,amount:5000,date:'2026-09-22'});
  const paid=structuredClone(t.repayments),before=structuredClone(t);
  const change={...input,amount:6000,title:'車票更正',category:'交通',date:'2026-09-23',operationId:crypto.randomUUID()};
  t=mutateTrip(t,'edit-expense',change);assert.deepEqual(balances(t),{[t.members[0].id]:-2000,[t.members[1].id]:2000});
  assert.deepEqual(t.repayments,paid);assert.equal(t.history[0].before.amount,10000);assert.equal(t.history[0].after.amount,6000);assert.equal(before.expenses[0].amount,10000);
  t=mutateTrip(t,'edit-expense',{...change,operationId:crypto.randomUUID(),amount:8000,payerId:t.members[1].id,mode:'exact',shares:[{memberId:t.members[0].id,amount:8000}]});
  assert.equal(isChangeRetry(t,'edit-expense',change),true);assert.deepEqual(mutateTrip(t,'edit-expense',change),t);
  assert.throws(()=>mutateTrip(t,'edit-expense',{...change,title:'同ID不同內容'}));
  for(const patch of [{date:'2026-02-30'},{mode:'exact',shares:[{memberId:t.members[0].id,amount:1}]},{payerId:crypto.randomUUID()},{category:'無效'}])assert.throws(()=>mutateTrip(t,'edit-expense',{...change,...patch,operationId:crypto.randomUUID()}));
  assert.equal(t.history.length,2);assert.equal(Object.values(balances(t)).reduce((a,b)=>a+b),0);
  const broken=structuredClone(t);broken.history[1].before.title='斷裂';assert.throws(()=>validateTrip(broken));
});

test('archive is read-only, renaming audited, no-op operations do not consume history, capacity reserves unarchive',()=>{
  let t=make();const input=expense(t);t=mutateTrip(t,'expense',input);
  t=mutateTrip(t,'rename-trip',{id:t.id,operationId:crypto.randomUUID(),name:'已整理旅程'});
  assert.equal(t.history.length,1);assert.equal(mutateTrip(t,'rename-trip',{id:t.id,operationId:crypto.randomUUID(),name:t.name}),t);
  const archive={id:t.id,operationId:crypto.randomUUID(),archived:true};t=mutateTrip(t,'set-archived',archive);
  for(const [action,data] of [['expense',expense(t)],['edit-expense',{...input,operationId:crypto.randomUUID(),amount:5000}],['void-expense',{id:input.id}],['repayment',{id:crypto.randomUUID()}],['rename-trip',{id:t.id,name:'不允許'}]])assert.throws(()=>mutateTrip(t,action,data));
  assert.equal(mutateTrip(t,'set-archived',archive),t);
  t=mutateTrip(t,'set-archived',{id:t.id,operationId:crypto.randomUUID(),archived:false});
  t=mutateTrip(t,'void-expense',{id:input.id,operationId:crypto.randomUUID()});assert.equal(t.history.at(-1).action,'void-expense');
  assert.throws(()=>mutateTrip(t,'edit-expense',{...input,operationId:crypto.randomUUID()}));
  let full=make();for(let i=0;i<LIMITS.history-2;i++)full=mutateTrip(full,'rename-trip',{id:full.id,operationId:crypto.randomUUID(),name:`旅程 ${i}`});
  full=mutateTrip(full,'set-archived',{id:full.id,operationId:crypto.randomUUID(),archived:true});
  full=mutateTrip(full,'set-archived',{id:full.id,operationId:crypto.randomUUID(),archived:false});assert.equal(full.history.length,300);
  assert.throws(()=>mutateTrip(full,'set-archived',{id:full.id,operationId:crypto.randomUUID(),archived:true}));
  const invalid=structuredClone(t);const edits=invalid.history.filter(h=>h.action==='void-expense');invalid.history=invalid.history.filter(h=>h.action!=='void-expense');invalid.history.splice(2,0,...edits);assert.throws(()=>validateTrip(invalid));
  assert.throws(()=>assertDocumentSize({text:'測'.repeat(Math.floor(LIMITS.documentBytes/3))}));
  assert.throws(()=>assertDocumentSize({archived:true,text:'a'.repeat(LIMITS.documentBytes-400)}));
});

test('v1 import preserves exact shares; v2 rejects missing audit fields and tampered snapshots',async()=>{
  let t=make();t=mutateTrip(t,'expense',{...expense(t),mode:'exact',shares:[{memberId:t.members[0].id,amount:9999},{memberId:t.members[1].id,amount:1}]});
  const legacy=structuredClone(t);delete legacy.history;delete legacy.archived;delete legacy.expenses[0].splitMode;
  const old=await inspectBackup({format:'tripledger-backup',schemaVersion:1,trip:legacy,files:[]});assert.equal(old.trip.archived,false);assert.deepEqual(old.trip.history,[]);assert.equal(old.trip.expenses[0].splitMode,'exact');assert.deepEqual(old.trip.expenses[0].shares,t.expenses[0].shares);
  await assert.rejects(inspectBackup({format:'tripledger-backup',schemaVersion:2,trip:legacy,files:[]}));
  t=mutateTrip(t,'edit-expense',{...expense(t),id:t.expenses[0].id,operationId:crypto.randomUUID()});const invalid=structuredClone(t);invalid.history[0].before.shares[0].amount=1;assert.throws(()=>validateTrip(invalid));
});

test('3-person 10-expense workflow: correction CAS, history export/restore, archive and list filters',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'tripledger-'));let storage=openStorage(join(dir,'source'));const restored=openStorage(join(dir,'destination'));
  const call=async(path,data,target=storage)=>{const response=await handleApi(new Request(`http://localhost/api/${path}`,{method:data===undefined?'GET':'POST',...(data===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(data)})}),{...target,subject:'owner'});return {status:response.status,value:await response.json()};};
  try{
    let t=(await call('trips',{id:crypto.randomUUID(),name:'十筆驗收',currency:'TWD',members:['甲','乙','丙']})).value.trip;
    const bytes=Uint8Array.from([137,80,78,71,13,10,26,10]);
    for(let i=0;i<10;i++)t=(await call(`trips/${t.id}/expense`,{...expense(t),title:`項目 ${i}`,category:i%2?'交通':'餐飲',date:i<5?'2026-09-22':'2026-09-23',revision:t.revision,...(i===0?{file:{mime:'image/png',data:encode(bytes)}}:{})})).value.trip;
    t=(await call(`trips/${t.id}/repayment`,{id:crypto.randomUUID(),revision:t.revision,fromId:t.members[1].id,toId:t.members[0].id,amount:1000,date:'2026-09-22'})).value.trip;
    const change={...expense(t),id:t.expenses[0].id,operationId:crypto.randomUUID(),revision:t.revision,title:'更正車票',amount:6000};
    const results=await Promise.all([call(`trips/${t.id}/edit-expense`,change),call(`trips/${t.id}/edit-expense`,{...change,operationId:crypto.randomUUID(),amount:9000})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    t=(await call('state')).value.trips[0];assert.equal(t.history.length,1);
    const successful=results[0].status===200?change:{...change,operationId:t.history[0].id,amount:9000};
    assert.equal((await call(`trips/${t.id}/edit-expense`,successful)).status,200);assert.equal((await call(`trips/${t.id}/edit-expense`,{...successful,title:'不同'})).status,409);
    assert.equal(filterExpenses(t,{query:'更正'}).length,1);assert.equal(filterExpenses(t,{category:'交通',from:'2026-09-23'}).length,3);assert.equal(filterExpenses(t,{status:'edited'}).length,1);assert.equal(filterExpenses(t,{from:'2026-09-24',to:'2026-09-22'}).length,0);
    t=(await call(`trips/${t.id}/void-expense`,{id:t.expenses[1].id,operationId:crypto.randomUUID(),revision:t.revision})).value.trip;
    assert.equal(filterExpenses(t,{status:'voided'}).length,1);
    t=(await call(`trips/${t.id}/rename-trip`,{id:t.id,operationId:crypto.randomUUID(),revision:t.revision,name:'完成驗收'})).value.trip;
    t=(await call(`trips/${t.id}/set-archived`,{id:t.id,operationId:crypto.randomUUID(),revision:t.revision,archived:true})).value.trip;
    assert.equal((await call(`trips/${t.id}/expense`,{...expense(t),revision:t.revision})).status,409);
    const backup=(await call(`trips/${t.id}/backup`)).value;assert.equal(backup.schemaVersion,4);assert.equal(backup.files[0].sha256,await sha256(bytes));
    const after=(await call('import',backup,restored)).value.trip;assert.deepEqual(after.history,t.history);assert.deepEqual(after.repayments,t.repayments);assert.deepEqual(balances(after),balances(t));assert.equal(after.archived,true);assert.deepEqual(await restored.objects.get(`${t.id}/${after.expenses[0].receipt.id}`),bytes);
    storage.close();storage=openStorage(join(dir,'source'));assert.deepEqual((await call('state')).value.trips[0],t);
    const restoredBackup=(await call(`trips/${t.id}/backup`,undefined,restored)).value;assert.deepEqual(restoredBackup.trip.history,backup.trip.history);
  }finally{storage.close();restored.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep+'tripledger-'));rmSync(dir,{recursive:true,force:true});}
});
