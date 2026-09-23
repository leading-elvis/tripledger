import test from 'node:test';
import assert from 'node:assert/strict';
import {newTrip,mutateTrip,validateTrip,balances,suggestions} from '../lib/domain.mjs';
import {createBackup,inspectBackup} from '../lib/backup.mjs';

test('renaming an existing companion keeps every financial reference and restores the audit trail',async()=>{
  let trip=newTrip({id:crypto.randomUUID(),name:'旅伴名稱測試',currency:'TWD',members:['甲','乙','丙']});
  const [a,b,c]=trip.members;
  trip=mutateTrip(trip,'expense',{id:crypto.randomUUID(),title:'兩人先付',amount:120000,payments:[{memberId:a.id,amount:80000},{memberId:b.id,amount:40000}],mode:'equal',memberIds:[a.id,b.id,c.id],category:'餐飲',date:'2026-09-23'});
  trip=mutateTrip(trip,'repayment',{id:crypto.randomUUID(),fromId:c.id,toId:a.id,amount:10000,date:'2026-09-23'});
  const before={members:structuredClone(trip.members),expenses:structuredClone(trip.expenses),repayments:structuredClone(trip.repayments),balances:balances(trip),suggestions:suggestions(trip)};
  const first={id:b.id,name:'乙的新名稱',operationId:crypto.randomUUID()};
  trip=mutateTrip(trip,'rename-member',first);assert.strictEqual(mutateTrip(trip,'rename-member',first),trip);
  assert.equal(trip.members[1].id,b.id);assert.equal(trip.members[1].name,'乙的新名稱');
  assert.deepEqual(trip.members.map(m=>m.id),before.members.map(m=>m.id));
  assert.deepEqual(trip.expenses,before.expenses);assert.deepEqual(trip.repayments,before.repayments);
  assert.deepEqual(balances(trip),before.balances);assert.deepEqual(suggestions(trip),before.suggestions);
  assert.deepEqual([trip.history[0].action,trip.history[0].targetId,trip.history[0].before,trip.history[0].after],['rename-member',b.id,'乙','乙的新名稱']);
  assert.throws(()=>mutateTrip(trip,'rename-member',{...first,name:'另一個名稱'}));
  trip=mutateTrip(trip,'rename-member',{id:c.id,name:'丙的新名稱',operationId:crypto.randomUUID()});
  trip=mutateTrip(trip,'rename-member',{id:b.id,name:'乙的第二個名稱',operationId:crypto.randomUUID()});
  assert.deepEqual(trip.history.map(h=>h.targetId),[b.id,c.id,b.id]);
  for(const bad of ['', '  ', a.name, 'x'.repeat(41)])assert.throws(()=>mutateTrip(trip,'rename-member',{id:b.id,name:bad,operationId:crypto.randomUUID()}));
  assert.throws(()=>mutateTrip(trip,'rename-member',{id:crypto.randomUUID(),name:'不存在',operationId:crypto.randomUUID()}));
  const invalid=structuredClone(trip);invalid.history[0].after='被篡改';assert.throws(()=>validateTrip(invalid));
  const backup=await createBackup({...trip,revision:4},{get:()=>null});assert.equal(backup.schemaVersion,5);
  assert.deepEqual((await inspectBackup(backup)).trip,trip);
  await assert.rejects(inspectBackup({...backup,schemaVersion:4}));
  const archived=mutateTrip(trip,'set-archived',{id:trip.id,archived:true,operationId:crypto.randomUUID()});
  assert.throws(()=>mutateTrip(archived,'rename-member',{id:b.id,name:'封存後不可改名',operationId:crypto.randomUUID()}));
});

test('schema 4 backups without companion rename history remain importable',async()=>{
  const trip=newTrip({id:crypto.randomUUID(),name:'舊版備份',currency:'JPY',members:['甲','乙']});
  const backup=await createBackup({...trip,revision:1},{get:()=>null});backup.schemaVersion=4;
  assert.deepEqual((await inspectBackup(backup)).trip,trip);
});

test('malformed legacy member history returns a validation error',async()=>{
  const trip=newTrip({id:crypto.randomUUID(),name:'舊版備份',currency:'TWD',members:['甲','乙']});
  const backup=await createBackup(trip,{get:()=>null});backup.schemaVersion=2;backup.trip.history=[null];
  await assert.rejects(inspectBackup(backup),error=>error.status===400);
});
