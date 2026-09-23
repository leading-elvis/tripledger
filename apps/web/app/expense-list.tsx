"use client";
import { useState } from 'react';
import { Paperclip, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';
import { filterExpenses } from '@/lib/filters.mjs';
import { formatMoney } from '@/lib/domain.mjs';
import type { Expense, ExpenseSnapshot, Trip } from '@/lib/types';
import { categories, Choice } from './ledger-ui';

function Snapshot({value,trip}:{value:ExpenseSnapshot;trip:Trip}) {
  const name=(id:string)=>trip.members.find(m=>m.id===id)?.name??'未知旅伴';
  return <div className="history-snapshot"><b>{value.title} · {formatMoney(value.amount,trip.currency)}</b><p>{value.date} · {value.category} · {value.payments.map(p=>`${name(p.memberId)} ${formatMoney(p.amount,trip.currency)}`).join("、")} 先付{value.voided?' · 已作廢':''}</p><p>{value.shares.map(s=>`${name(s.memberId)} ${formatMoney(s.amount,trip.currency)}`).join('、')}</p></div>;
}
export function ExpenseList({trip,busy,onEdit,onVoid}:{trip:Trip;busy:boolean;onEdit:(expense:Expense)=>void;onVoid:(expense:Expense)=>void}) {
  const [query,setQuery]=useState(''),[category,setCategory]=useState('all'),[status,setStatus]=useState('all'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[filtersOpen,setFiltersOpen]=useState(false);
  const expenses=filterExpenses(trip,{query,category,status,from,to}) as Expense[];
  const reset=()=>{setQuery('');setCategory('all');setStatus('all');setFrom('');setTo('');};
  const filterCount=Number(category!=='all')+Number(status!=='all')+Number(!!from)+Number(!!to);
  return <><div className="section-head"><h2>旅途中的每一筆</h2><span className="small muted">符合 {expenses.length} 筆</span></div>
    <div className="expense-toolbar"><label className="field">搜尋支出<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="名稱或付款旅伴"/></label><button className="secondary" type="button" aria-expanded={filtersOpen} aria-controls={filtersOpen?'expense-filters':undefined} onClick={()=>setFiltersOpen(open=>!open)}><SlidersHorizontal size={17}/>篩選{filterCount?` · ${filterCount}`:''}</button></div>
    {filtersOpen&&<div className="expense-filters" id="expense-filters"><Choice label="篩選分類" value={category} options={[{value:'all',label:'全部分類'},...Object.keys(categories).map(c=>({value:c,label:c}))]} onChange={setCategory}/><Choice label="紀錄狀態" value={status} options={[{value:'all',label:'全部紀錄'},{value:'active',label:'有效支出'},{value:'voided',label:'已作廢'},{value:'edited',label:'有更正紀錄'}]} onChange={setStatus}/><label className="field">起始日期<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="field">結束日期<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="secondary" type="button" onClick={reset}>清除篩選</button></div>}
    {from&&to&&from>to&&<p className="error" role="alert">起始日期不能晚於結束日期。</p>}
    {(query||filterCount>0)&&<p className="small muted filter-explainer">篩選只影響下方列表；總支出與餘額仍依完整帳本計算。</p>}
    {!expenses.length?<p className="filter-empty">沒有符合條件的支出。</p>:<div className="expense-list">{expenses.map(e=>{
      const Icon=categories[e.category as keyof typeof categories];const history=trip.history.filter(h=>h.targetId===e.id&&(h.action==='edit-expense'||h.action==='void-expense'));
      return <article className={`expense-row ${e.voided?'voided':''}`} key={e.id}><span className={`category-icon category-${Object.keys(categories).indexOf(e.category)}`}><Icon size={22}/></span><div className="expense-info"><h3>{e.title} {e.voided&&<span className="pill">已作廢</span>}</h3><p>{e.date.replaceAll('-','/')} · {e.payments.map(p=>trip.members.find(m=>m.id===p.memberId)?.name).join("、")} 先付 · {e.shares.length} 人分攤 · {trip.team.actors.find(a=>a.id===e.createdBy)?.name??"舊版"} 記錄</p><details><summary>查看付款與分攤</summary><p className="payment-detail-title">實際付款</p><div className="share-detail">{e.payments.map(p=><span key={p.memberId}>{trip.members.find(m=>m.id===p.memberId)?.name} <b>{formatMoney(p.amount,trip.currency)}</b></span>)}</div><p className="payment-detail-title">應分攤金額</p><div className="share-detail">{e.shares.map(s=><span key={s.memberId}>{trip.members.find(m=>m.id===s.memberId)?.name} <b>{formatMoney(s.amount,trip.currency)}</b></span>)}</div></details>{e.receipt&&<a className="receipt-link" href={`/api/trips/${trip.id}/receipts/${e.receipt.id}`} target="_blank" rel="noreferrer"><Paperclip size={14}/>查看收據</a>}
      {!!history.length&&<details className="change-history"><summary>更正與作廢歷史（{history.length}）</summary><ol>{[...history].reverse().map(h=><li key={h.id}><b>{h.action==='void-expense'?'作廢支出':'更正支出'}</b><p className="small muted">{trip.team.actors.find(a=>a.id===h.actorId)?.name??"舊版未記錄操作者"}</p><time dateTime={h.at}>{new Date(h.at).toLocaleString('zh-TW')}</time>{(h.action==='edit-expense'||h.action==='void-expense')&&<><span>修改前</span><Snapshot value={h.before} trip={trip}/><span>修改後</span><Snapshot value={h.after} trip={trip}/></>}</li>)}</ol></details>}</div><div className="expense-amount"><strong>{formatMoney(e.amount,trip.currency)}</strong><span>{e.category}</span>{!e.voided&&!trip.archived&&(trip.me.role==="admin"||(trip.me.role==="editor"&&e.createdBy===trip.me.actorId))&&<div className="expense-actions"><button className="icon-button" disabled={busy} aria-label={`更正支出：${e.title}`} onClick={()=>onEdit(e)}><Pencil size={17}/></button><button className="icon-button" disabled={busy} aria-label={`作廢支出：${e.title}`} onClick={()=>onVoid(e)}><Trash2 size={17}/></button></div>}</div></article>;
    })}</div>}</>;
}
