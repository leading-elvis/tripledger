"use client";
import { useState } from 'react';
import type { Trip } from '@/lib/types';

export function TripSettings({trip,busy,submit}:{trip:Trip;busy:boolean;submit:(action:string,input:unknown)=>Promise<void>}) {
  const [name,setName]=useState(trip.name),[revision,setRevision]=useState(trip.revision);
  const [renameId,setRenameId]=useState(()=>crypto.randomUUID()),[archiveId,setArchiveId]=useState(()=>crypto.randomUUID());
  const stale=revision!==trip.revision;
  return <div className="form-stack">{stale&&<div className="notice" role="alert"><p>旅程已有更新。目前名稱：{trip.name}。請核對後再送出。</p><button className="secondary" onClick={()=>{setRevision(trip.revision);setRenameId(crypto.randomUUID());setArchiveId(crypto.randomUUID());}}>已核對，使用最新版本</button></div>}
    <form className="form-stack" onSubmit={e=>{e.preventDefault();void submit('rename-trip',{id:trip.id,operationId:renameId,revision,name});}}><label className="field">旅程名稱<input value={name} onChange={e=>setName(e.target.value)} required maxLength={60} disabled={trip.archived}/></label><button className="primary" disabled={busy||stale||trip.archived}>儲存旅程名稱</button></form>
    <div className="archive-section"><h3>{trip.archived?'繼續這段旅程':'整理已結束的旅程'}</h3><p className="small muted">封存會保留所有帳目、餘額與收據，仍可查看及備份。解除封存後才能再修改。</p><button className="secondary" disabled={busy||stale} onClick={()=>void submit('set-archived',{id:trip.id,operationId:archiveId,revision,archived:!trip.archived})}>{trip.archived?'解除封存':'封存旅程'}</button></div>
    {!!trip.history.filter(h=>h.action==='rename-trip'||h.action==='set-archived').length&&<details className="change-history"><summary>旅程異動歷史</summary><ol>{[...trip.history].reverse().filter(h=>h.action==='rename-trip'||h.action==='set-archived').map(h=><li key={h.id}><time dateTime={h.at}>{new Date(h.at).toLocaleString('zh-TW')}</time><p>{h.action==='rename-trip'?`${h.before} → ${h.after}`:h.after?'封存旅程':'解除封存'}</p></li>)}</ol></details>}
  </div>;
}
