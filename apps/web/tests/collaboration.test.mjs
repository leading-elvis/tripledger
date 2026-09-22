import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleApi } from '../lib/api.mjs';
import { openStorage } from '../standalone/storage.mjs';
import { balances,validateTrip } from '../lib/domain.mjs';
import { inspectBackup,encode } from '../lib/backup.mjs';

async function fixture(t) {
  const dir=mkdtempSync(join(tmpdir(),'tripledger-team-'));const store=openStorage(join(dir,'source')),destination=openStorage(join(dir,'destination'));
  t.after(()=>{store.close();destination.close();rmSync(dir,{recursive:true,force:true});});
  const call=async(subject,path,data,target=store)=>{const result=await handleApi(new Request(`http://localhost/api/${path}`,{method:data===undefined?'GET':'POST',...(data===undefined?{}:{headers:{'content-type':'application/json','origin':'http://localhost'},body:JSON.stringify(data)})}),{...target,subject,profile:{name:subject??'',email:`${subject}@example.invalid`}});return {status:result.status,value:result.headers.get('content-type')?.includes('json')?await result.json():new Uint8Array(await result.arrayBuffer())};};
  let trip=(await call('A','trips',{id:crypto.randomUUID(),name:'多人合成驗收',currency:'TWD',members:['甲','乙','丙']})).value.trip;
  const get=async(who='A')=>(await call(who,'state')).value.trips.find(x=>x.id===trip.id);
  const act=async(who,action,data={})=>{const current=await get(who);return call(who,`trips/${trip.id}/${action}`,{id:trip.id,revision:current?.revision,...data});};
  const invite=async()=>{const r=await act('A','create-invite',{id:crypto.randomUUID()});assert.equal(r.status,200,JSON.stringify(r.value));trip=r.value.trip;return r.value.invitationToken;};
  const joinAs=async(who,role,participantId=null)=>{const token=await invite();let r=await call(who,'join',{id:crypto.randomUUID(),token});assert.equal(r.status,200,JSON.stringify(r.value));const id=r.value.request.id;r=await act('A','approve-join',{id,role,participantId});assert.equal(r.status,200,JSON.stringify(r.value));trip=r.value.trip;return {token,actorId:(await get(who)).me.actorId};};
  const expense=(who,title='共同支出',amount=9000)=>act(who,'expense',{id:crypto.randomUUID(),title,amount,payerId:trip.members[0].id,date:'2026-09-22',category:'餐飲',mode:'equal',memberIds:trip.members.map(m=>m.id)});
  return {store,destination,call,get,act,invite,joinAs,expense,trip};
}

test('shared ledger: approval, roles, own expense editing, actor attribution and private endpoints',async t=>{
  const f=await fixture(t),[a,b]=f.trip.members;
  const token=await f.invite();assert.equal((await f.call(null,'state')).status,401);
  assert.equal((await f.call(null,'join',{id:crypto.randomUUID(),token})).status,401);
  const pending=await f.call('B','join',{id:crypto.randomUUID(),token});assert.equal(pending.status,200);
  assert.equal((await f.get('B')),undefined);assert.equal((await f.call('B',`trips/${f.trip.id}/backup`)).status,404);
  assert.equal((await f.call('C','join',{id:crypto.randomUUID(),token})).status,409);
  assert.equal((await f.call('B','join',{id:crypto.randomUUID(),token})).value.request.id,pending.value.request.id);
  assert.equal((await f.act('A','approve-join',{id:pending.value.request.id,role:'admin'})).status,400);
  assert.equal((await f.act('A','approve-join',{id:pending.value.request.id,role:'editor',participantId:b.id})).status,200);
  await f.joinAs('C','viewer');let owner=await f.get(),editor=await f.get('B');
  assert.equal((await f.act('A','change-member',{id:owner.me.actorId,role:'admin',participantId:b.id})).status,409);
  assert.equal((await f.act('A','change-member',{id:owner.me.actorId,role:'admin',participantId:a.id})).status,200);
  const e=(await f.expense('A')).value.trip.expenses[0];assert.ok(e.createdBy);assert.equal((await f.get('B')).expenses.length,1);
  assert.equal((await f.act('B','void-expense',{id:e.id})).status,403);
  assert.equal((await f.act('B','rename-trip',{name:'未授權'})).status,403);
  const eb=(await f.expense('B','乙代記')).value.trip.expenses.at(-1);assert.equal(eb.createdBy,editor.me.actorId);assert.equal(eb.payerId,a.id);
  assert.equal((await f.act('B','void-expense',{id:eb.id,operationId:crypto.randomUUID()})).status,200);
  assert.equal((await f.call('B',`trips/${f.trip.id}/backup`)).status,403);
  for(const action of ['expense','repayment','void-expense','rename-trip','set-archived','confirm-repayment'])assert.equal((await f.act('C',action,{id:e.id})).status,403);
  assert.equal((await f.act('C','create-invite',{id:crypto.randomUUID()})).status,403);
  assert.equal((await f.call('D',`trips/${f.trip.id}/backup`)).status,404);
  assert.equal((await f.call('D',`trips/${f.trip.id}/receipts/${crypto.randomUUID()}`)).status,404);
  owner=await f.get();assert.equal(owner.history[0].actorId,editor.me.actorId);
  const data=JSON.stringify(await f.get('B'));for(const key of ['_access','_owner','hash','accountId','@example.invalid'])assert.ok(!data.includes(key),key);
});

test('invitation expiry/revocation and CAS prevent reusing grants after removal',async t=>{
  const f=await fixture(t);let token=await f.invite();let a=await f.get();let id=a.invitations.at(-1).id;
  assert.equal((await f.act('A','revoke-invite',{id})).status,200);
  assert.equal((await f.call('B','join',{id:crypto.randomUUID(),token})).status,404);
  token=await f.invite();const owner=await f.store.repo.account('A');let raw=await f.store.repo.get(f.trip.id,owner);raw._access.invites.at(-1).expiresAt='2000-01-01T00:00:00.000Z';await f.store.repo.update(validateTrip(raw),owner,raw.revision,raw._access);
  assert.equal((await f.call('B','join',{id:crypto.randomUUID(),token})).status,404);
  const joined=await f.joinAs('B','editor',f.trip.members[1].id);const stale=await f.get('B');
  assert.equal((await f.act('A','remove-member',{id:joined.actorId})).status,200);
  assert.equal(await f.get('B'),undefined);
  assert.equal((await f.call('B',`trips/${f.trip.id}/expense`,{id:crypto.randomUUID(),revision:stale.revision})).status,404);
  assert.equal((await f.call('B','join',{id:crypto.randomUUID(),token:joined.token})).value.request.status,'approved');assert.equal(await f.get('B'),undefined);
  // A write that already read authorization still loses its CAS after removal.
  assert.equal(await f.store.repo.update(validateTrip(stale),owner,stale.revision),0);
});

test('repayment confirmation belongs to receiver; pending does not count and later corrections may reverse debt',async t=>{
  const f=await fixture(t),[a,b]=f.trip.members;
  await f.joinAs('B','editor',b.id);let owner=await f.get();await f.act('A','change-member',{id:owner.me.actorId,role:'admin',participantId:a.id});
  const original=(await f.expense('A')).value.trip.expenses[0];let before=balances(await f.get());
  const input={id:crypto.randomUUID(),fromId:b.id,toId:a.id,amount:3000,date:'2026-09-22'};
  let r=await f.act('B','repayment',input);assert.equal(r.status,200);assert.equal(r.value.trip.repayments[0].status,'pending');assert.deepEqual(balances(r.value.trip),before);
  assert.equal((await f.act('B','confirm-repayment',{id:input.id,operationId:crypto.randomUUID()})).status,403);
  assert.equal((await f.act('B','repayment',{...input,amount:2900})).status,409);
  const change={id:original.id,operationId:crypto.randomUUID(),title:'金額更正',amount:3000,payerId:a.id,mode:'equal',memberIds:f.trip.members.map(m=>m.id),category:'餐飲',date:'2026-09-22'};
  assert.equal((await f.act('A','edit-expense',change)).status,200);
  const confirmation={id:input.id,operationId:crypto.randomUUID()};r=await f.act('A','confirm-repayment',confirmation);assert.equal(r.status,200);assert.equal(balances(r.value.trip)[b.id],2000);assert.equal(r.value.trip.repayments[0].events[0].proxy,false);
  const revision=r.value.trip.revision;assert.equal((await f.act('A','confirm-repayment',confirmation)).value.trip.revision,revision);
  assert.equal((await f.act('A','cancel-repayment',{id:input.id,operationId:crypto.randomUUID()})).status,409);
  assert.equal((await f.act('B','void-repayment',{id:input.id})).status,403);
  r=await f.act('A','void-repayment',{id:input.id,operationId:crypto.randomUUID()});assert.equal(r.status,200);assert.equal(balances(r.value.trip)[b.id],-1000);
});

test('proxy confirmation only for unbound recipients, cancellation/rejection and pending reservations',async t=>{
  const f=await fixture(t),[a,b,c]=f.trip.members;
  await f.joinAs('B','editor',b.id);await f.expense('A');
  let r=await f.act('B','repayment',{id:crypto.randomUUID(),fromId:b.id,toId:a.id,amount:2000,date:'2026-09-22'});let payment=r.value.trip.repayments[0];
  assert.equal((await f.act('B','repayment',{id:crypto.randomUUID(),fromId:b.id,toId:a.id,amount:2000,date:'2026-09-22'})).status,400);
  assert.equal((await f.act('B','repayment',{id:crypto.randomUUID(),fromId:c.id,toId:a.id,amount:100,date:'2026-09-22'})).status,403);
  r=await f.act('A','confirm-repayment',{id:payment.id,operationId:crypto.randomUUID()});assert.equal(r.status,200);assert.equal(r.value.trip.repayments[0].events[0].proxy,true);
  r=await f.act('B','repayment',{id:crypto.randomUUID(),fromId:b.id,toId:a.id,amount:500,date:'2026-09-22'});payment=r.value.trip.repayments.at(-1);
  assert.equal((await f.act('B','cancel-repayment',{id:payment.id,operationId:crypto.randomUUID()})).status,200);
  assert.equal((await f.act('A','confirm-repayment',{id:payment.id,operationId:crypto.randomUUID()})).status,409);
  r=await f.act('B','repayment',{id:crypto.randomUUID(),fromId:b.id,toId:a.id,amount:500,date:'2026-09-22'});payment=r.value.trip.repayments.at(-1);
  assert.equal((await f.act('A','reject-repayment',{id:payment.id,operationId:crypto.randomUUID()})).status,200);
  assert.equal((await f.get()).repayments.at(-1).status,'rejected');
});

test('schema 3 restores financial/actor/member history and files but no invitations or live authority',async t=>{
  const f=await fixture(t);const member=await f.joinAs('B','editor',f.trip.members[1].id);await f.joinAs('C','viewer');
  const bytes=new Uint8Array([137,80,78,71,1,2,3]),id=crypto.randomUUID();let r=await f.act('B','expense',{id,title:'含收據',amount:9000,payerId:f.trip.members[0].id,mode:'equal',memberIds:f.trip.members.map(m=>m.id),category:'交通',date:'2026-09-22',file:{mime:'image/png',data:encode(bytes)}});assert.equal(r.status,200);
  await f.act('B','repayment',{id:crypto.randomUUID(),fromId:f.trip.members[1].id,toId:f.trip.members[0].id,amount:1000,date:'2026-09-22'});
  await f.act('A','remove-member',{id:member.actorId});
  const backup=(await f.call('A',`trips/${f.trip.id}/backup`)).value;assert.equal(backup.schemaVersion,3);assert.ok(backup.trip.team.actors.length>=3);assert.ok(backup.trip.team.events.length>=4);assert.equal(backup.trip.repayments[0].status,'pending');
  const serialized=JSON.stringify(backup);for(const key of ['_access','bindings','invites','requests','accountId','subject','@example.invalid'])assert.ok(!serialized.includes(key),key);
  const broken=structuredClone(backup);delete broken.trip.expenses[0].createdBy;await assert.rejects(inspectBackup(broken));
  r=await f.call('RESTORER','import',{...backup,_access:{bindings:[{accountId:'B',actorId:member.actorId}]}},f.destination);assert.equal(r.status,201);assert.equal(r.value.trip.me.role,'admin');assert.equal(r.value.trip.me.actorId,null);assert.ok(r.value.trip.teamMembers.every(a=>!a.connected));
  const restored=(await f.call('RESTORER',`trips/${f.trip.id}/backup`,undefined,f.destination)).value;
  const originalDoc=structuredClone(backup.trip),restoredDoc=structuredClone(restored.trip);delete originalDoc.expenses[0].receipt.id;delete restoredDoc.expenses[0].receipt.id;assert.deepEqual(restoredDoc,originalDoc);assert.equal(restored.files[0].data,backup.files[0].data);
  for(const who of ['A','B','C']){assert.deepEqual((await f.call(who,'state',undefined,f.destination)).value.trips,[]);assert.equal((await f.call(who,`trips/${f.trip.id}/backup`,undefined,f.destination)).status,404);}
  assert.equal((await f.call('B','join',{id:crypto.randomUUID(),token:member.token},f.destination)).status,404);
  assert.equal((await f.call('RESTORER','import',backup,f.destination)).status,409);
});
