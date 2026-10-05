import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {newTrip,mutateTrip,mixedSplit,balances,validateTrip,isChangeRetry} from '../lib/domain.mjs';
import {createBackup,inspectBackup} from '../lib/backup.mjs';
import {handleApi} from '../lib/api.mjs';
import {openStorage} from '../standalone/storage.mjs';

const make=(currency='TWD')=>newTrip({id:crypto.randomUUID(),name:'共同與個人採購',currency,members:['甲','乙','丙','丁']});
const input=t=>({id:crypto.randomUUID(),title:'一起採購',amount:10001,payments:[{memberId:t.members[3].id,amount:10001}],mode:'mixed',memberIds:t.members.slice(0,3).map(m=>m.id),personalItems:[{name:'個人用品',memberId:t.members[3].id,amount:1000},{name:'飲料',memberId:t.members[3].id,amount:500},{name:'點心',memberId:t.members[0].id,amount:500}],category:'購物',date:'2026-09-23'});

test('mixed split subtracts named personal items first, divides the remainder and credits payers independently',()=>{
  let t=make();const [a,b,c,d]=t.members,e=input(t);
  e.payments=[{memberId:a.id,amount:2000},{memberId:d.id,amount:8001}];
  assert.deepEqual(mixedSplit(e.amount,e.memberIds,e.personalItems).shares,[
    {memberId:a.id,amount:3167},{memberId:b.id,amount:2667},{memberId:c.id,amount:2667},{memberId:d.id,amount:1500}
  ]);
  t=mutateTrip(t,'expense',e);assert.equal(t.expenses[0].splitMode,'mixed');
  assert.deepEqual(t.expenses[0].personalItems,e.personalItems);
  assert.deepEqual(balances(t),{[a.id]:-1167,[b.id]:-2667,[c.id]:-2667,[d.id]:6501});
  assert.equal(Object.values(balances(t)).reduce((sum,value)=>sum+value,0),0);
  let yen=make('JPY');const [w,x,y,z]=yen.members;
  yen=mutateTrip(yen,'expense',{...input(yen),amount:101,payments:[{memberId:z.id,amount:101}],personalItems:[{name:'私人票券',memberId:z.id,amount:20}]});
  assert.deepEqual(yen.expenses[0].shares,[{memberId:w.id,amount:27},{memberId:x.id,amount:27},{memberId:y.id,amount:27},{memberId:z.id,amount:20}]);
});

test('mixed split rejects invalid items and participants without changing the ledger',()=>{
  const t=make(),base=input(t),[a,b]=t.members;
  const invalid=[
    {personalItems:[]},
    {personalItems:[{name:'太貴',memberId:a.id,amount:10001}]},
    {personalItems:[{name:'超額',memberId:a.id,amount:10002}]},
    {personalItems:[{name:'零元',memberId:a.id,amount:0}]},
    {personalItems:[{name:'',memberId:a.id,amount:1}]},
    {personalItems:[{name:'x'.repeat(41),memberId:a.id,amount:1}]},
    {personalItems:[{name:'陌生人',memberId:crypto.randomUUID(),amount:1}]},
    {personalItems:Array.from({length:41},()=>({name:'項目',memberId:a.id,amount:1}))},
    {memberIds:[]},
    {memberIds:[a.id,a.id]},
    {memberIds:[a.id,crypto.randomUUID()]},
    {payments:[{memberId:b.id,amount:10000}]}
  ];
  for(const change of invalid)assert.throws(()=>mutateTrip(t,'expense',{...base,...change}));
  assert.equal(t.expenses.length,0);
  const tampered=mutateTrip(t,'expense',base);tampered.expenses[0].shares[0].amount++;
  assert.throws(()=>validateTrip(tampered));
});

test('retired companions cannot receive new personal items but remain in old mixed expense corrections',()=>{
  let t=make(),e=input(t);t=mutateTrip(t,'expense',e);
  const retired=t.members[3].id;
  t=mutateTrip(t,'remove-participant',{id:retired,operationId:crypto.randomUUID()});
  assert.throws(()=>mutateTrip(t,'expense',{...input(t),id:crypto.randomUUID()}));
  t=mutateTrip(t,'edit-expense',{...e,operationId:crypto.randomUUID(),personalItems:[{name:'保留舊帳',memberId:retired,amount:2000}]});
  assert.equal(t.expenses[0].personalItems[0].memberId,retired);
  assert.deepEqual(validateTrip(t),t);
});

test('mixed corrections keep components in history; retries detect changed item details and mode switches remove metadata',()=>{
  let t=make(),e=input(t);t=mutateTrip(t,'expense',e);
  const change={...e,operationId:crypto.randomUUID(),personalItems:[{name:'私人票券',memberId:t.members[2].id,amount:2000}]};
  t=mutateTrip(t,'edit-expense',change);
  assert.equal(t.history[0].before.personalItems.length,3);
  assert.deepEqual(t.history[0].after.personalItems,change.personalItems);
  assert.deepEqual(t.expenses[0].shares,[{memberId:t.members[0].id,amount:2667},{memberId:t.members[1].id,amount:2667},{memberId:t.members[2].id,amount:4667}]);
  assert.equal(isChangeRetry(t,'edit-expense',change),true);
  assert.strictEqual(mutateTrip(t,'edit-expense',change),t);
  assert.throws(()=>isChangeRetry(t,'edit-expense',{...change,personalItems:[{...change.personalItems[0],name:'別的品項'}]}));
  t=mutateTrip(t,'edit-expense',{...change,operationId:crypto.randomUUID(),mode:'equal',memberIds:t.members.slice(0,3).map(m=>m.id)});
  assert.equal(t.expenses[0].splitMode,'equal');assert.equal(Object.hasOwn(t.expenses[0],'personalItems'),false);
  assert.equal(Object.hasOwn(t.expenses[0],'equalMemberIds'),false);
  assert.equal(t.history[1].before.splitMode,'mixed');assert.equal(t.history[1].after.splitMode,'equal');
  t=mutateTrip(t,'void-expense',{id:e.id,operationId:crypto.randomUUID()});
  assert.equal(t.history.at(-1).after.voided,true);
  assert.equal(Object.values(balances(t)).reduce((sum,value)=>sum+value,0),0);
  assert.deepEqual(validateTrip(t),t);
});

test('schema 7 round-trips mixed items and audit snapshots; schema 6 remains readable but cannot claim mixed data',async()=>{
  let t=make(),e=input(t);t=mutateTrip(t,'expense',e);
  t=mutateTrip(t,'edit-expense',{...e,operationId:crypto.randomUUID(),personalItems:[{name:'改買個人票券',memberId:t.members[3].id,amount:3000}]});
  const backup=await createBackup({...t,revision:3},{get:()=>null});assert.equal(backup.schemaVersion,7);
  assert.deepEqual((await inspectBackup(backup)).trip,t);
  assert.deepEqual(backup.trip.history[0].before.personalItems,e.personalItems);
  await assert.rejects(inspectBackup({...backup,schemaVersion:6}));
  const corrupt=structuredClone(backup);corrupt.trip.history[0].after.personalItems[0].amount++;
  await assert.rejects(inspectBackup(corrupt));
  let old=make();old=mutateTrip(old,'expense',{...input(old),mode:'equal'});
  const oldBackup=await createBackup({...old,revision:1},{get:()=>null});oldBackup.schemaVersion=6;
  assert.deepEqual((await inspectBackup(oldBackup)).trip,old);
});

test('persistent API derives mixed shares and rejects altered item details on expense retry',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'tripledger-mixed-')),store=openStorage(dir);
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  const call=async(path,data)=>{const response=await handleApi(new Request(`http://localhost/api/${path}`,{method:data===undefined?'GET':'POST',...(data===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(data)})}),{...store,subject:'owner',mode:'standalone'});return {status:response.status,value:await response.json()};};
  const created=await call('trips',{id:crypto.randomUUID(),name:'API 混合分攤',currency:'TWD',members:['甲','乙','丙','丁']});assert.equal(created.status,201);
  const trip=created.value.trip,e={...input(created.value.trip),revision:trip.revision,shares:[{memberId:trip.members[0].id,amount:10001}]};
  const saved=await call(`trips/${trip.id}/expense`,e);assert.equal(saved.status,200);
  assert.equal(saved.value.trip.expenses[0].shares.length,4);
  assert.equal((await call(`trips/${trip.id}/expense`,e)).status,200);
  const altered={...e,personalItems:e.personalItems.map((item,index)=>index===0?{...item,amount:1200}:index===1?{...item,amount:300}:item)};
  assert.equal((await call(`trips/${trip.id}/expense`,altered)).status,409);
  assert.equal((await call(`trips/${trip.id}/backup`)).value.schemaVersion,7);
});
