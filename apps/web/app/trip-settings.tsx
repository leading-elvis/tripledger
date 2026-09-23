"use client";
import { useEffect, useState } from 'react';
import type { Trip } from '@/lib/types';

export function TripSettings({trip,busy,submit,onDirtyChange}:{trip:Trip;busy:boolean;submit:(action:string,input:unknown)=>Promise<void>;onDirtyChange:(dirty:boolean)=>void}) {
  const [name,setName]=useState(trip.name),[nameTouched,setNameTouched]=useState(false),[revision,setRevision]=useState(trip.revision);
  const [renameId,setRenameId]=useState(()=>crypto.randomUUID()),[archiveId,setArchiveId]=useState(()=>crypto.randomUUID());
  const [memberNames,setMemberNames]=useState<Record<string,string>>(()=>Object.fromEntries(trip.members.map(m=>[m.id,m.name])));
  const [memberTouched,setMemberTouched]=useState<Record<string,boolean>>({});
  const [memberRenameIds,setMemberRenameIds]=useState<Record<string,string>>(()=>Object.fromEntries(trip.members.map(m=>[m.id,crypto.randomUUID()])));
  const stale=revision!==trip.revision;
  const dirty=(nameTouched&&name.trim()!==trip.name)||trip.members.some(member=>memberTouched[member.id]&&memberNames[member.id]?.trim()!==member.name);
  useEffect(()=>onDirtyChange(dirty),[dirty,onDirtyChange]);
  useEffect(()=>()=>onDirtyChange(false),[onDirtyChange]);
  const acknowledge=()=>{
    if(!nameTouched)setName(trip.name);
    setMemberNames(old=>Object.fromEntries(trip.members.map(member=>[member.id,memberTouched[member.id]?old[member.id]??member.name:member.name])));
    setRevision(trip.revision);setRenameId(crypto.randomUUID());setArchiveId(crypto.randomUUID());
    setMemberRenameIds(Object.fromEntries(trip.members.map(member=>[member.id,crypto.randomUUID()])));
  };
  return <div className="form-stack">{stale&&<div className="notice" role="alert"><p>旅程已有更新。目前名稱：{trip.name}；旅伴：{trip.members.map(m=>m.name).join('、')}。你修改過的輸入仍保留，請核對後再送出。</p><button className="secondary" onClick={acknowledge}>已核對，使用最新版本</button></div>}
    <form className="form-stack" onSubmit={e=>{e.preventDefault();void submit('rename-trip',{id:trip.id,operationId:renameId,revision,name});}}><label className="field">旅程名稱<input value={name} onChange={e=>{setName(e.target.value);setNameTouched(true);}} required maxLength={60} disabled={trip.archived}/></label><button className="primary" disabled={busy||stale||trip.archived||trip.me.role!=="admin"||name.trim()===trip.name}>儲存旅程名稱</button></form>
    <section className="member-settings"><h3>旅伴名稱</h3><p className="small muted">改名後，舊支出、分攤與還款會顯示新名稱；金額及登入帳號的旅伴綁定不變。</p>{trip.members.map(member=><form className="member-settings-row" key={member.id} onSubmit={e=>{e.preventDefault();void submit('rename-member',{id:member.id,operationId:memberRenameIds[member.id],revision,name:memberNames[member.id]});}}><label className="field">{member.name}<input aria-label={`修改 ${member.name} 的名稱`} value={memberNames[member.id]??''} onChange={e=>{setMemberNames(old=>({...old,[member.id]:e.target.value}));setMemberTouched(old=>({...old,[member.id]:true}));}} required maxLength={40} disabled={trip.archived}/></label><button className="secondary" aria-label={`儲存 ${member.name} 的新名稱`} disabled={busy||stale||trip.archived||trip.me.role!=="admin"||memberNames[member.id]?.trim()===member.name}>儲存名稱</button></form>)}</section>
    <div className="archive-section"><h3>{trip.archived?'繼續這段旅程':'整理已結束的旅程'}</h3><p className="small muted">封存會保留所有帳目、餘額與收據，仍可查看及備份。解除封存後才能再修改。</p><button className="secondary" disabled={busy||stale||trip.me.role!=="admin"} onClick={()=>void submit('set-archived',{id:trip.id,operationId:archiveId,revision,archived:!trip.archived})}>{trip.archived?'解除封存':'封存旅程'}</button></div>
    {!!trip.history.filter(h=>['rename-trip','rename-member','set-archived'].includes(h.action)).length&&<details className="change-history"><summary>旅程與旅伴異動歷史</summary><ol>{[...trip.history].reverse().filter(h=>['rename-trip','rename-member','set-archived'].includes(h.action)).map(h=><li key={h.id}><time dateTime={h.at}>{new Date(h.at).toLocaleString('zh-TW')}</time><p>{h.action==='rename-member'?`旅伴：${h.before} → ${h.after}`:h.action==='rename-trip'?`旅程：${h.before} → ${h.after}`:h.after?'封存旅程':'解除封存'}</p></li>)}</ol></details>}
  </div>;
}
