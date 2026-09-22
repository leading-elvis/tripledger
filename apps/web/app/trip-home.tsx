"use client";
import { ArrowRight, Upload } from 'lucide-react';
import type { Trip } from '@/lib/types';
import { balances, formatMoney } from '@/lib/domain.mjs';
import { tripHref } from '@/lib/navigation.mjs';
import { Blank, Choice } from './ledger-ui';
import { roles } from './team-panel';

export function TripHome({trips,scope,setScope,mode,busy,create,restore,requests}:{trips:Trip[];scope:string;setScope:(scope:string)=>void;mode:string;busy:boolean;create:()=>void;restore:()=>void;requests:{id:string;tripName:string;status:string}[]}) {
  const visible=trips.filter(t=>scope==='all'||(scope==='archived'?t.archived:!t.archived));
  return <>
    <div className="home-tools"><Choice label="旅程範圍" value={scope} onChange={setScope} options={[{value:'active',label:'進行中'},{value:'archived',label:'已封存'},{value:'all',label:'全部旅程'}]}/><div className="home-actions">{mode!=='standalone'&&<a className="secondary" href="/join">使用邀請加入帳本</a>}<button className="secondary" disabled={busy} onClick={restore}><Upload size={18}/>匯入備份</button></div></div>
    {requests.filter(r=>r.status!=='approved').map(r=><p className="notice" key={r.id}>{r.tripName}：{r.status==='pending'?'已送出申請，等待管理者核准':'申請未通過或邀請已撤銷'}</p>)}
    {visible.length?<div className="trip-grid">{visible.map(trip=>{
      const active=trip.expenses.filter(e=>!e.voided),total=active.reduce((s,e)=>s+e.amount,0),owed=Object.values(balances(trip)).reduce((s:number,n)=>s+Math.max(0,n as number),0);
      return <a className="trip-card" href={tripHref(trip.id)} key={trip.id}><div className="row"><span className="pill">{trip.archived?'已封存':trip.team.enabled?'共同記帳':'進行中'}</span><span className="small muted">{roles[trip.me.role]}</span></div><h2>{trip.name}</h2><p className="muted">{trip.members.map(m=>m.name).join('、')}</p><div className="trip-card-total"><span>總支出 · {active.length} 筆</span><strong>{formatMoney(total,trip.currency)}</strong></div><div className="trip-card-foot"><span>{owed?`待結清 ${formatMoney(owed,trip.currency)}`:'目前無待結清款項'}</span><span className="open-trip">開啟帳本<ArrowRight size={18}/></span></div></a>;
    })}</div>:<section className="panel"><Blank title={scope==='archived'?'尚無封存旅程':'開始記錄一段旅程'} description="建立旅程、匯入既有備份，或使用朋友提供的邀請加入帳本。"><button className="primary" onClick={create}>建立旅程</button></Blank></section>}
    <p className="small muted sync-note">帳本每 15 秒更新，也可按右上角重新整理。</p>
  </>;
}
