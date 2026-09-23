import { ensure, uuid, label, validateTrip, LIMITS } from './domain.mjs';
import { sha256 } from './backup.mjs';

const now=()=>new Date().toISOString();
export const accessOf=trip=>({bindings:[],invites:[],requests:[],...structuredClone(trip._access??{})});
export function memberOf(trip,account) {
  const access=accessOf(trip),binding=access.bindings.find(b=>b.accountId===account);
  const actor=trip.team?.actors.find(a=>a.id===binding?.actorId&&a.active);
  if(trip._owner===account)return {role:'admin',actorId:actor?.id??null,participantId:actor?.participantId??null,isOwner:true};
  ensure(actor,'你已無法存取此旅程',404);
  return {role:actor.role,actorId:actor.id,participantId:actor.participantId,isOwner:false};
}
export function publicTrip(trip,account) {
  const clean=validateTrip(trip),me=memberOf({...trip,team:clean.team},account),access=accessOf(trip);
  const activeIds=new Set(access.bindings.map(b=>b.actorId));
  return {...clean,revision:trip.revision,me,teamMembers:clean.team.actors.map(a=>({...a,connected:activeIds.has(a.id),isOwner:access.bindings.some(b=>b.actorId===a.id&&b.accountId===trip._owner)})),
    ...(me.role==='admin'?{invitations:access.invites.map(({id,expiresAt,revoked,usedBy})=>({id,expiresAt,revoked,used:!!usedBy})),joinRequests:access.requests.filter(r=>r.status==='pending').map(({id,name,email,createdAt})=>({id,name,email,createdAt}))}:{})};
}
export function prepareActor(raw,account,profile={}) {
  const trip=validateTrip(raw),access=accessOf(raw),me=memberOf({...raw,team:trip.team},account);
  if(me.actorId)return {trip,access,me};
  ensure(me.isOwner,'登入綁定無效',403);
  const actor={id:crypto.randomUUID(),name:label(String(profile.name||'管理者').slice(0,80)),role:'admin',participantId:null,active:true};
  trip.team.actors.push(actor);access.bindings.push({accountId:account,actorId:actor.id});me.actorId=actor.id;
  return {trip,access,me};
}
function event(trip,me,action,targetId,detail,critical=false) {
  ensure(trip.team.events.length<(critical?300:280),'成員異動已達容量上限，請先備份',413);
  trip.team.events.push({id:crypto.randomUUID(),actorId:me.actorId,action,targetId,detail,at:now()});
}
function bind(trip,access,actor,participantId) {
  const memberId=participantId||null;
  ensure(memberId===null||trip.members.some(m=>m.id===memberId),'請選擇現有旅伴');
  ensure(actor.role!=='viewer'||memberId===null,'僅檢視成員不綁定還款身分');
  ensure(!memberId||!access.bindings.some(b=>b.actorId!==actor.id&&trip.team.actors.some(a=>a.id===b.actorId&&a.active&&a.participantId===memberId)),'這位旅伴已綁定其他帳號',409);
  actor.participantId=memberId;
}
export async function changeAccess(raw,account,profile,action,input) {
  const {trip,access,me}=prepareActor(raw,account,profile);
  ensure(action==='leave'||me.role==='admin','只有管理者可以管理成員',403);
  const critical=action==='remove-member'||action==='leave';
  ensure(critical||['change-member','revoke-invite','reject-join'].includes(action)||!trip.archived,'封存旅程不能新增邀請或成員',409);
  let token;
  if(action==='create-invite') {
    access.invites=access.invites.filter(i=>!i.revoked&&!i.usedBy&&Date.parse(i.expiresAt)>Date.now());
    ensure(access.invites.length<20&&access.requests.filter(r=>r.status==='pending').length<20,'請先處理現有邀請與申請');
    ensure(trip.team.actors.length<80&&trip.team.events.length<270,'成員歷史已接近容量上限，請先備份',413);
    const id=uuid(input.id);ensure(!access.invites.some(i=>i.id===id),"邀請已建立，若遺失連結請撤銷後重建",409);token=`${trip.id}.${crypto.randomUUID()}.${crypto.randomUUID()}`;
    access.invites.push({id,hash:await sha256(new TextEncoder().encode(token)),expiresAt:new Date(Date.now()+7*86400000).toISOString(),revoked:false,usedBy:null});
    if(!trip.team.enabled){trip.team.enabled=true;event(trip,me,'enable',me.actorId,'啟用共同記帳；新的還款須確認');}
  }else if(action==='revoke-invite') {
    const invitation=access.invites.find(i=>i.id===input.id);ensure(invitation,'找不到邀請',404);invitation.revoked=true;
    for(const r of access.requests)if(r.inviteId===invitation.id&&r.status==='pending')r.status='rejected';
  }else if(action==='approve-join'||action==='reject-join') {
    const request=access.requests.find(r=>r.id===input.id);ensure(request&&request.status==='pending','申請已處理，請重新整理',409);
    if(action==='reject-join')request.status='rejected';
    else {
      ensure(['editor','viewer'].includes(input.role),'新成員只能核准為記帳或僅檢視');
      ensure(!access.bindings.some(b=>b.accountId===request.accountId)&&request.accountId!==raw._owner,'此帳號已加入',409);
      ensure(access.bindings.length<20&&trip.team.actors.length<80,'已達成員上限');
      const actor={id:crypto.randomUUID(),name:request.name,role:input.role,participantId:null,active:true};
      bind(trip,access,actor,input.participantId);trip.team.actors.push(actor);access.bindings.push({accountId:request.accountId,actorId:actor.id});request.status='approved';
      event(trip,me,'join',actor.id,`核准加入：${actor.role}；旅伴：${trip.members.find(m=>m.id===actor.participantId)?.name??'未綁定'}`);
    }
  }else if(action==='change-member'||critical) {
    const actor=trip.team.actors.find(a=>a.id===(action==='leave'?me.actorId:input.id)),binding=access.bindings.find(b=>b.actorId===actor?.id);
    ensure(actor&&binding,'找不到有效成員',404);
    const targetOwner=binding.accountId===raw._owner;
    if(critical){ensure(!targetOwner,'帳本建立者不能退出或被移除');ensure(action==='leave'||me.isOwner||actor.role!=='admin','只有建立者可以移除管理者',403);actor.active=false;access.bindings=access.bindings.filter(b=>b.actorId!==actor.id);event(trip,me,action==='leave'?'leave':'remove',actor.id,'停止帳本存取；歷史帳務保留',true);}
    else {
      ensure(['admin','editor','viewer'].includes(input.role),'角色無效');
      ensure(!targetOwner||input.role==='admin','建立者必須維持管理者');
      ensure(me.isOwner||(actor.role!=='admin'&&input.role!=='admin')||(actor.id===me.actorId&&input.role===actor.role),'只有建立者可以調整管理者權限',403);
      actor.role=input.role;bind(trip,access,actor,input.participantId);
      event(trip,me,'change',actor.id,`角色：${actor.role}；旅伴：${trip.members.find(m=>m.id===actor.participantId)?.name??'未綁定'}`);
    }
  }else ensure(false,'不支援的成員操作',404);
  trip.updatedAt=now();if(!critical)ensure(new TextEncoder().encode(JSON.stringify(trip)).length<LIMITS.documentBytes-32768,'帳本接近容量上限，請先備份；仍可移除成員',413);return {trip:validateTrip(trip),access,token};
}
export async function requestJoin(repo,account,profile,input) {
  ensure(typeof input.token==='string'&&/^[a-f0-9-]{36}\.[a-f0-9-]{36}\.[a-f0-9-]{36}$/i.test(input.token),'邀請碼無效');
  const trip=await repo.forInvitation(uuid(input.token.split('.')[0]));ensure(trip,'邀請無效或已過期',404);
  const access=accessOf(trip),hash=await sha256(new TextEncoder().encode(input.token));
  const invite=access.invites.find(i=>i.hash===hash&&!i.revoked&&Date.parse(i.expiresAt)>Date.now());ensure(invite,'邀請無效或已過期',404);
  if(invite.usedBy===account){const r=access.requests.find(r=>r.inviteId===invite.id&&r.accountId===account);ensure(r,'邀請已使用，請向管理者取得新的邀請',409);return {request:{id:r.id,tripName:trip.name,status:r.status}};}
  ensure(!invite.usedBy,'邀請已使用',409);ensure(!trip.archived,'此旅程已封存',409);
  ensure(trip._owner!==account&&!access.bindings.some(b=>b.accountId===account),'你已是帳本成員',409);
  ensure(!access.requests.some(r=>r.accountId===account&&r.status==='pending'),'你已有待核准申請',409);
  access.requests=access.requests.filter(r=>r.status==='pending');ensure(access.requests.length<20,'此帳本的待核准申請已滿');
  const request={id:uuid(input.id),inviteId:invite.id,accountId:account,name:label(String(profile.name||input.name||'申請者').slice(0,80)),email:typeof profile.email==='string'?profile.email.slice(0,254):'',status:'pending',createdAt:now()};
  access.requests.push(request);invite.usedBy=account;
  ensure(await repo.update(validateTrip(trip),trip._owner,trip.revision,access),'邀請已更新，請重試',409);
  return {request:{id:request.id,tripName:trip.name,status:'pending'}};
}
export function authorize(trip,account,action,input) {
  const me=memberOf(trip,account),admin=me.role==='admin';ensure(me.role!=='viewer','你只有檢視權限',403);
  if(['rename-trip','rename-member','add-participant','remove-participant','restore-participant','set-archived'].includes(action))ensure(admin,'只有管理者可以整理旅程',403);
  if(['edit-expense','void-expense'].includes(action)){const e=trip.expenses.find(e=>e.id===input.id);ensure(e,'找不到支出',404);ensure(admin||(e.createdBy&&e.createdBy===me.actorId),'只能更正或作廢自己建立的支出',403);}
  if(action==='repayment')ensure(admin||(me.participantId&&input.fromId===me.participantId),'只能申報自己對應旅伴的還款',403);
  if(action.endsWith('-repayment')){
    const r=trip.repayments.find(r=>r.id===input.id);ensure(r,'找不到還款',404);
    const access=accessOf(trip),bound=trip.team.actors.some(a=>a.active&&a.participantId===r.toId&&access.bindings.some(b=>b.actorId===a.id));
    const receiver=me.participantId===r.toId,proxy=admin&&!bound;
    if(action==='confirm-repayment'||action==='reject-repayment')ensure(receiver||proxy,'只有收款方可確認；未綁定帳號的收款方可由管理者代辦',403);
    if(action==='cancel-repayment')ensure(admin||receiver||r.createdBy===me.actorId,'無法取消他人的還款申報',403);
    if(action==='void-repayment')ensure(admin,'只有管理者可以作廢已確認還款',403);
    return {...me,proxy:!receiver&&proxy};
  }
  return {...me,proxy:false};
}
