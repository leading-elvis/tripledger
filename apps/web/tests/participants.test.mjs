import test from 'node:test';
import assert from 'node:assert/strict';
import { newTrip, mutateTrip, validateTrip, balances } from '../lib/domain.mjs';
import { createBackup, inspectBackup } from '../lib/backup.mjs';

const id=()=>crypto.randomUUID();
const expense=(trip,payerId,memberIds,title='共同支出')=>({id:id(),title,amount:9000,payments:[{memberId:payerId,amount:9000}],mode:'equal',memberIds,category:'餐飲',date:'2026-09-23'});

test('adding a companion after trip creation preserves old shares and is idempotent',()=>{
  let trip=newTrip({id:id(),name:'新增旅伴',currency:'TWD',members:['甲','乙']});
  const [a,b]=trip.members;
  trip=mutateTrip(trip,'expense',expense(trip,a.id,[a.id,b.id]));
  const before=structuredClone(trip.expenses);
  const c=id(),input={id:c,name:'丙',operationId:id()};
  trip=mutateTrip(trip,'add-participant',input);
  assert.deepEqual(trip.members.map(m=>m.id),[a.id,b.id,c]);
  assert.equal(trip.members[2].active,true);
  assert.deepEqual(trip.expenses,before);
  assert.equal(balances(trip)[c],0);
  assert.deepEqual([trip.history.at(-1).action,trip.history.at(-1).targetId,trip.history.at(-1).before,trip.history.at(-1).after.name],['add-participant',c,null,'丙']);
  assert.strictEqual(mutateTrip(trip,'add-participant',input),trip);
  assert.throws(()=>mutateTrip(trip,'add-participant',{...input,name:'另一位'}));
  for(const name of ['',a.name,'  ','x'.repeat(41)])assert.throws(()=>mutateTrip(trip,'add-participant',{id:id(),name,operationId:id()}));
  assert.deepEqual(validateTrip(trip).members,trip.members);
});

test('removing a used companion preserves history and settlement but excludes new spending; restore keeps the same ID',()=>{
  let trip=newTrip({id:id(),name:'歷史餘額',currency:'TWD',members:['甲','乙','丙']});
  const [a,b,c]=trip.members;
  const old=expense(trip,b.id,[a.id,b.id,c.id],'舊晚餐');
  trip=mutateTrip(trip,'expense',old);
  const originalExpense=structuredClone(trip.expenses[0]),originalBalances=balances(trip);
  const remove={id:b.id,operationId:id()};
  trip=mutateTrip(trip,'remove-participant',remove);
  assert.equal(trip.members.find(member=>member.id===b.id).active,false);
  assert.deepEqual(trip.expenses[0],originalExpense);
  assert.deepEqual(balances(trip),originalBalances);
  assert.strictEqual(mutateTrip(trip,'remove-participant',remove),trip);
  assert.throws(()=>mutateTrip(trip,'expense',expense(trip,b.id,[a.id,c.id])));
  assert.throws(()=>mutateTrip(trip,'expense',expense(trip,a.id,[a.id,b.id,c.id])));
  trip=mutateTrip(trip,'expense',expense(trip,a.id,[a.id,c.id],'新晚餐'));
  const oldCorrection={...old,operationId:id(),title:'舊晚餐更正'};
  trip=mutateTrip(trip,'edit-expense',oldCorrection);
  assert.deepEqual(trip.expenses[0].shares.map(share=>share.memberId),[a.id,b.id,c.id]);
  assert.throws(()=>mutateTrip(trip,'edit-expense',{...oldCorrection,id:trip.expenses[1].id,operationId:id(),memberIds:[a.id,b.id,c.id]}));
  const debt=balances(trip);
  const from=Object.keys(debt).find(memberId=>debt[memberId]<0),to=Object.keys(debt).find(memberId=>debt[memberId]>0);
  assert.ok(from&&to);
  trip=mutateTrip(trip,'repayment',{id:id(),fromId:from,toId:to,amount:100,date:'2026-09-23'});
  assert.equal(trip.repayments.length,1);
  const restore={id:b.id,operationId:id()};
  trip=mutateTrip(trip,'restore-participant',restore);
  assert.equal(trip.members.find(member=>member.id===b.id).active,true);
  assert.strictEqual(mutateTrip(trip,'restore-participant',restore),trip);
  trip=mutateTrip(trip,'expense',expense(trip,b.id,[a.id,b.id,c.id],'恢復後支出'));
  assert.equal(trip.expenses.at(-1).payments[0].memberId,b.id);
  const tampered=structuredClone(trip);tampered.members.find(member=>member.id===b.id).active=false;
  assert.throws(()=>validateTrip(tampered));
});

test('at least one active companion remains and archived trips cannot change the roster',()=>{
  let trip=newTrip({id:id(),name:'邊界',currency:'JPY',members:['甲','乙']});
  const [a,b]=trip.members;
  trip=mutateTrip(trip,'remove-participant',{id:b.id,operationId:id()});
  assert.throws(()=>mutateTrip(trip,'remove-participant',{id:a.id,operationId:id()}));
  const archived=mutateTrip(trip,'set-archived',{id:trip.id,archived:true,operationId:id()});
  for(const action of ['add-participant','remove-participant','restore-participant'])assert.throws(()=>mutateTrip(archived,action,{id:action==='add-participant'?id():b.id,name:'丙',operationId:id()}));
});

test('schema 7 backup preserves active state and roster history; schema 5 upgrades to active companions',async()=>{
  let trip=newTrip({id:id(),name:'備份',currency:'TWD',members:['甲','乙']});
  const retired=trip.members[1].id;
  trip=mutateTrip(trip,'remove-participant',{id:retired,operationId:id()});
  trip=mutateTrip(trip,'add-participant',{id:id(),name:'丙',operationId:id()});
  const backup=await createBackup({...trip,revision:3},{get:()=>null});
  assert.equal(backup.schemaVersion,7);
  assert.deepEqual((await inspectBackup(backup)).trip,trip);
  await assert.rejects(inspectBackup({...backup,schemaVersion:5}),error=>error.status===400);
  const old=newTrip({id:id(),name:'舊備份',currency:'TWD',members:['甲','乙']});
  const oldBackup=await createBackup(old,{get:()=>null});
  oldBackup.schemaVersion=5;
  for(const member of oldBackup.trip.members)delete member.active;
  const imported=(await inspectBackup(oldBackup)).trip;
  assert.deepEqual(imported.members.map(member=>member.active),[true,true]);
});
