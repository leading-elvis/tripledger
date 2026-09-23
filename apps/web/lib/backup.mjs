import { ensure, validateTrip, LIMITS, receiptMeta } from './domain.mjs';
export async function sha256(bytes) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export function encode(bytes) {let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
export function decode(value) {ensure(typeof value==='string' && value.length<=Math.ceil(LIMITS.receiptBytes/3)*4 && /^[A-Za-z0-9+/]*={0,2}$/.test(value),'收據編碼無效');try{return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}catch{throw new Error('收據編碼無效');}}
export async function checkFile(meta,bytes) {ensure(bytes.length===meta.size && await sha256(bytes)===meta.sha256,'收據大小或 SHA-256 校驗不符');const signature=meta.mime==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:meta.mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70&&bytes[8]===87&&bytes[9]===69&&bytes[10]===66&&bytes[11]===80;ensure(signature,'收據內容與圖片類型不符');}
export async function createBackup(trip,objects) {
  const clean=validateTrip(trip), files=[];
  for(const e of clean.expenses) if(e.receipt) {const bytes=await objects.get(`${trip.id}/${e.receipt.id}`);ensure(bytes,'找不到收據，備份未完成',500);await checkFile(e.receipt,bytes);files.push({...e.receipt,data:encode(bytes)});}
  return {format:'tripledger-backup',schemaVersion:4,exportedAt:new Date().toISOString(),sourceRevision:trip.revision,trip:clean,files};
}
export async function inspectBackup(input) {
  ensure(input?.format==='tripledger-backup' && [1,2,3,4].includes(input.schemaVersion),'不支援此備份格式或版本');
  if(input.schemaVersion>=2)ensure(typeof input.trip?.archived==='boolean'&&Array.isArray(input.trip?.history),'新版備份缺少封存或歷史資料');
  if(input.schemaVersion>=3){ensure(input.trip?.team&&Array.isArray(input.trip.team.actors)&&Array.isArray(input.trip.team.events),'多人備份缺少成員歷史');ensure(Array.isArray(input.trip.expenses)&&Array.isArray(input.trip.repayments)&&input.trip.expenses.every(e=>Object.hasOwn(e,'createdBy'))&&input.trip.history.every(h=>Object.hasOwn(h,'actorId'))&&input.trip.repayments.every(r=>['pending','confirmed','cancelled','rejected'].includes(r.status)&&Array.isArray(r.events)&&Object.hasOwn(r,'createdBy')&&['pending','confirmed'].includes(r.initialStatus)),'多人備份缺少操作者或還款狀態');}
  if(input.schemaVersion===4){const fields=[...input.trip.expenses,...input.trip.history.filter(h=>['edit-expense','void-expense'].includes(h.action)).flatMap(h=>[h.before,h.after])];ensure(fields.every(e=>e&&Array.isArray(e.payments)&&!Object.hasOwn(e,'payerId')),'新版備份缺少付款明細或包含舊付款欄位');}
  const trip=validateTrip(input.trip);ensure(Array.isArray(input.files) && input.files.length<=LIMITS.expenses,'收據清單無效');
  const expected=trip.expenses.filter(e=>e.receipt).map(e=>e.receipt), files=[];
  ensure(expected.length===input.files.length && new Set(input.files.map(f=>f.id)).size===input.files.length,'收據清單不完整或重複');
  for(const f of input.files) {const meta=receiptMeta(f),ref=expected.find(x=>x.id===meta.id);ensure(ref && JSON.stringify(ref)===JSON.stringify(meta),'收據清單與記帳資料不一致');const bytes=decode(f.data);await checkFile(meta,bytes);files.push({meta,bytes});}
  return {trip,files};
}
