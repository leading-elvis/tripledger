import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {newTrip,mutateTrip,balances,suggestions,validateTrip,isChangeRetry} from '../lib/domain.mjs';
import {createBackup,inspectBackup,encode} from '../lib/backup.mjs';
import {filterExpenses} from '../lib/filters.mjs';
import {handleApi} from '../lib/api.mjs';
import {openStorage} from '../standalone/storage.mjs';
const make=(currency='TWD')=>newTrip({id:crypto.randomUUID(),name:'共同墊付驗收',currency,members:['甲','乙','丙']});
const input=t=>({id:crypto.randomUUID(),title:'共同晚餐',amount:10001,payments:[{memberId:t.members[0].id,amount:6000},{memberId:t.members[1].id,amount:4001}],mode:'equal',memberIds:t.members.map(m=>m.id),category:'餐飲',date:'2026-09-23'});
function legacy(t){const old=structuredClone(t);for(const e of [...old.expenses,...old.history.filter(h=>h.action.endsWith('expense')).flatMap(h=>[h.before,h.after])]){assert.equal(e.payments.length,1);e.payerId=e.payments[0].memberId;delete e.payments;}return old;}

test('multiple payers credit each contribution, preserve rounding and settle exact/excluded payers',()=>{
  for(const currency of ['TWD','JPY']){
    let t=make(currency);const [a,b,c]=t.members;const e=input(t);t=mutateTrip(t,'expense',e);
    assert.deepEqual(balances(t),{[a.id]:2666,[b.id]:667,[c.id]:-3333});assert.equal(suggestions(t).reduce((n,r)=>n+r.amount,0),3333);
    assert.equal(filterExpenses(t,{query:'乙'}).length,1);assert.equal(filterExpenses(t,{query:'丙'}).length,0);
    t=mutateTrip(t,'repayment',{id:crypto.randomUUID(),fromId:c.id,toId:b.id,amount:667,date:'2026-09-23'});
    assert.deepEqual(balances(t),{[a.id]:2666,[b.id]:0,[c.id]:-2666});
    t=mutateTrip(t,'void-expense',{id:e.id,operationId:crypto.randomUUID()});assert.deepEqual(balances(t),{[a.id]:0,[b.id]:-667,[c.id]:667});
    let exact=make(currency);const [x,y,z]=exact.members;exact=mutateTrip(exact,'expense',{...input(exact),mode:'exact',shares:[{memberId:z.id,amount:10001}]});assert.deepEqual(balances(exact),{[x.id]:6000,[y.id]:4001,[z.id]:-10001});
  }
});
test('invalid or ambiguous contributions are rejected without mutating the source',()=>{
  const t=make(),base=input(t),a=t.members[0].id;
  for(const payments of [[],null,[{memberId:a,amount:10000}],[{memberId:a,amount:0},{memberId:t.members[1].id,amount:10001}],[{memberId:a,amount:-1}],[{memberId:a,amount:1.5}],[{memberId:crypto.randomUUID(),amount:10001}],[{memberId:a,amount:6000},{memberId:a,amount:4001}],[{memberId:a,amount:100000000001}]])assert.throws(()=>mutateTrip(t,'expense',{...base,payments}));
  assert.throws(()=>mutateTrip(t,'expense',{...base,payerId:a}));assert.equal(t.expenses.length,0);
});
test('payer corrections keep receipt/repayments, audit all contributions and allow reordered retries',()=>{
  let t=make();const [a,b,c]=t.members,base=input(t),receipt={id:crypto.randomUUID(),mime:'image/png',size:8,sha256:'a'.repeat(64)};
  t=mutateTrip(t,'expense',{...base,payments:[{memberId:a.id,amount:10001}]},receipt);
  t=mutateTrip(t,'repayment',{id:crypto.randomUUID(),fromId:c.id,toId:a.id,amount:3000,date:'2026-09-23'});const repayments=structuredClone(t.repayments);
  const change={...base,operationId:crypto.randomUUID()};t=mutateTrip(t,'edit-expense',change);
  assert.deepEqual(balances(t),{[a.id]:-334,[b.id]:667,[c.id]:-333});assert.deepEqual(t.expenses[0].receipt,receipt);assert.deepEqual(t.repayments,repayments);
  assert.equal(t.history[0].before.payments.length,1);assert.equal(t.history[0].after.payments.length,2);
  assert.equal(isChangeRetry(t,'edit-expense',{...change,payments:[...change.payments].reverse()}),true);
  const later={...change,operationId:crypto.randomUUID(),payments:[{memberId:b.id,amount:10001}]};t=mutateTrip(t,'edit-expense',later);
  assert.strictEqual(mutateTrip(t,'edit-expense',change),t);assert.throws(()=>isChangeRetry(t,'edit-expense',{...change,payments:later.payments}));
});
test('real legacy payer fields and history upgrade from schemas 1-3; schema 4 requires every payment snapshot',async()=>{
  let t=make(),e=input(t);t=mutateTrip(t,'expense',{...e,payments:[{memberId:t.members[0].id,amount:e.amount}]});
  const v1=legacy(t);delete v1.archived;delete v1.history;delete v1.team;delete v1.expenses[0].createdBy;delete v1.expenses[0].splitMode;
  const first=await inspectBackup({format:'tripledger-backup',schemaVersion:1,trip:v1,files:[]});assert.deepEqual(balances(first.trip),balances(t));assert.deepEqual(first.trip.expenses[0].shares,t.expenses[0].shares);
  t=mutateTrip(t,'edit-expense',{...e,operationId:crypto.randomUUID(),payments:[{memberId:t.members[1].id,amount:e.amount}]});
  t=mutateTrip(t,'void-expense',{id:e.id,operationId:crypto.randomUUID()});const old=legacy(t);
  for(const version of [2,3]){const restored=await inspectBackup({format:'tripledger-backup',schemaVersion:version,trip:old,files:[]});assert.deepEqual(restored.trip,t);assert.equal(restored.trip.history[0].before.payments[0].memberId,t.members[0].id);}
  const backup=await createBackup({...t,revision:3},{get:()=>null});assert.equal(backup.schemaVersion,7);
  for(const which of ['expense','before','after']){const bad=structuredClone(backup);const fields=which==='expense'?bad.trip.expenses[0]:bad.trip.history[0][which];fields.payerId=fields.payments[0].memberId;delete fields.payments;await assert.rejects(inspectBackup(bad));}
  const corrupt=structuredClone(backup);corrupt.trip.history[0].before.payments[0].amount--;await assert.rejects(inspectBackup(corrupt));
});
test('near-capacity legacy documents remain readable and round-trip through schema 4',async()=>{
  const id=n=>`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`;
  const members=Array.from({length:20},(_,i)=>({id:id(i+1),name:`m${i}`}));
  const shares=k=>members.slice(0,k).map((m,i)=>({memberId:m.id,amount:Math.floor(100000000000/k)+(i<100000000000%k?1:0)}));
  const base={title:'x'.repeat(80),amount:100000000000,payerId:members[0].id,shares:shares(11),date:'2026-09-23',category:'其他',voided:false,splitMode:'exact'};
  const old={id:id(100),name:'容量測試',currency:'TWD',createdAt:'2026-09-23T00:00:00.000Z',updatedAt:'2026-09-23T00:00:00.000Z',archived:false,members,expenses:Array.from({length:300},(_,i)=>({id:id(1000+i),...base,shares:shares(i>=1&&i<=23?12:11),createdBy:null})),repayments:[],history:Array.from({length:300},(_,i)=>({id:id(10000+i),action:'edit-expense',targetId:id(1000),at:'2026-09-23T00:00:00.000Z',before:{...base,title:i%2?'y'.repeat(80):'x'.repeat(80)},after:{...base,title:i%2?'x'.repeat(80):'y'.repeat(80)},actorId:null})),team:{enabled:false,actors:[],events:[]}};
  assert.ok(Buffer.byteLength(JSON.stringify(old))<=1048576-32768);
  const {trip}=await inspectBackup({format:'tripledger-backup',schemaVersion:3,trip:old,files:[]});
  assert.ok(Buffer.byteLength(JSON.stringify(trip))>1048576);
  const backup=await createBackup(trip,{get:()=>null});assert.equal(backup.schemaVersion,7);
  const restored=await inspectBackup(backup);assert.deepEqual(restored.trip,trip);assert.deepEqual(balances(restored.trip),balances(old));
  assert.equal(JSON.stringify(backup).includes('payerId'),false);
});

test('persistent API: legacy database upgrade, payment retry/CAS, receipt restore and restart',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'tripledger-payers-'));let storage=openStorage(join(dir,'source'));const destination=openStorage(join(dir,'destination'));t.after(()=>{storage.close();destination.close();rmSync(dir,{recursive:true,force:true});});
  const call=async(path,data,target=storage)=>{const response=await handleApi(new Request(`http://localhost/api/${path}`,{method:data===undefined?'GET':'POST',...(data===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(data)})}),{...target,subject:'owner'});return {status:response.status,value:await response.json()};};
  let old=make();const oldInput=input(old);old=mutateTrip(old,'expense',{...oldInput,payments:[{memberId:old.members[0].id,amount:oldInput.amount}]});old=mutateTrip(old,'edit-expense',{...oldInput,operationId:crypto.randomUUID(),payments:[{memberId:old.members[1].id,amount:oldInput.amount}]});
  await storage.repo.insert(legacy(old),await storage.repo.account('owner'));let current=(await call('state')).value.trips[0];assert.deepEqual(validateTrip(current),old);
  const change={...oldInput,operationId:crypto.randomUUID(),revision:current.revision};let result=await call(`trips/${old.id}/edit-expense`,change);assert.equal(result.status,200);current=result.value.trip;
  const legacyEdit={...change,operationId:crypto.randomUUID(),revision:current.revision,payerId:old.members[0].id};delete legacyEdit.payments;assert.equal((await call(`trips/${old.id}/edit-expense`,legacyEdit)).status,409);
  const bytes=Uint8Array.from([137,80,78,71,13,10,26,10]);const newInput={...input(old),revision:current.revision,file:{mime:'image/png',data:encode(bytes)}};
  result=await call(`trips/${old.id}/expense`,newInput);assert.equal(result.status,200);current=result.value.trip;
  const retried=await call(`trips/${old.id}/expense`,{...newInput,payments:[...newInput.payments].reverse()});assert.equal(retried.status,200);assert.equal(retried.value.trip.revision,current.revision);
  const modified=[{memberId:old.members[0].id,amount:5000},{memberId:old.members[1].id,amount:5001}];assert.equal((await call(`trips/${old.id}/expense`,{...newInput,payments:modified})).status,409);
  const edits=[newInput.payments,modified].map(payments=>call(`trips/${old.id}/edit-expense`,{...newInput,revision:current.revision,payments,operationId:crypto.randomUUID(),title:'共同修改'}));assert.deepEqual((await Promise.all(edits)).map(r=>r.status).sort(),[200,409]);
  const backup=(await call(`trips/${old.id}/backup`)).value;assert.equal(backup.schemaVersion,7);assert.ok(backup.trip.expenses.every(e=>e.payments.length===2));
  storage.close();storage=openStorage(join(dir,'source'));assert.deepEqual(JSON.parse(JSON.stringify(validateTrip((await call('state')).value.trips[0]))),backup.trip);
  const imported=(await call('import',backup,destination)).value.trip;assert.deepEqual(imported.history,backup.trip.history);assert.deepEqual(imported.expenses.map(e=>e.payments),backup.trip.expenses.map(e=>e.payments));assert.deepEqual(balances(imported),balances(backup.trip));assert.deepEqual(await destination.objects.get(`${old.id}/${imported.expenses[1].receipt.id}`),bytes);
});
