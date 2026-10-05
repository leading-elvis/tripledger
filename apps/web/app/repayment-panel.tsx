"use client";
import { useState } from 'react';
import { Check, ArrowRight, Trash2 } from 'lucide-react';
import { balances, balanceBreakdown, suggestions, settlementSteps, formatMoney } from '@/lib/domain.mjs';
import type { Trip,Repayment,Expense } from '@/lib/types';
export function RepaymentPanel({trip,busy,onCreate,onVoid,onAction}:{trip:Trip;busy:boolean;onCreate:(r:Partial<Repayment>&{id:string})=>void;onVoid:(r:Repayment)=>void;onAction:(action:string,data:unknown)=>void}) {
  const b=balances(trip),money=(n:number)=>formatMoney(n,trip.currency),name=(id:string)=>trip.members.find(m=>m.id===id)?.name??'未知旅伴';
  const actor=(id:string|null)=>trip.team.actors.find(a=>a.id===id)?.name??'舊版未記錄';
  const admin=trip.me.role==='admin',write=trip.me.role!=='viewer'&&!trip.archived;
  const status={pending:'等待收款方確認',confirmed:'已確認',cancelled:'已取消',rejected:'已拒絕'};
  return <div className="balance-layout"><section className="panel"><div className="section-head"><h2>旅伴餘額</h2><span className="small muted">只扣除已確認還款；已移除旅伴仍保留舊帳</span></div>{trip.members.map((m,i)=><div className="member-row" key={m.id}><span className={`avatar avatar-${i%4}`}>{m.name.slice(0,1)}</span><div className="member-name"><b>{m.name}{m.active===false?'（已移除）':''}</b><small>{b[m.id]>0?'應收回':b[m.id]<0?'應付出':'已結清'}</small></div><strong className={b[m.id]>0?'positive':b[m.id]<0?'negative':'muted'}>{money(Math.abs(b[m.id]))}</strong></div>)}</section>
  <section className="panel"><div className="section-head"><h2>建議還款</h2><span className="pill">{suggestions(trip).length} 筆</span></div>{suggestions(trip).map((r:{fromId:string;toId:string;amount:number})=>{const pending=trip.repayments.filter(p=>p.status==='pending'&&(p.fromId===r.fromId||p.toId===r.toId));return <div className="suggestion" key={`${r.fromId}-${r.toId}`}><div className="row"><span>{name(r.fromId)} <ArrowRight size={14} className="inline"/> {name(r.toId)}</span><b>{money(r.amount)}</b></div>{!!pending.length&&<p className="small muted">相關旅伴有 {pending.length} 筆還款待確認，餘額尚未扣除。</p>}{write&&(admin||trip.me.participantId===r.fromId)&&<button className="secondary" disabled={busy} onClick={()=>onCreate({...r,id:crypto.randomUUID()})}><Check size={16}/>{trip.team.enabled?'申報已付款':'記錄已還款'}</button>}</div>;})}{!suggestions(trip).length&&<div className="settled"><Check size={30}/><p>目前沒有待還款項</p></div>}<p className="small muted">{trip.team.enabled?'申報不會立即扣抵。收款方確認收到後，餘額才會更新。':'實際收到款項後再記錄。這裡只保存還款紀錄。'}</p></section>
  <BalanceExplanation trip={trip}/>
  <section className="panel repayment-panel"><h2>還款紀錄</h2>{[...trip.repayments].reverse().map(r=>{
    const receiver=trip.me.participantId===r.toId,bound=trip.teamMembers.some(a=>a.connected&&a.active&&a.participantId===r.toId),proxy=admin&&!bound,canConfirm=write&&(receiver||proxy);
    const send=(action:string)=>onAction(action,{id:r.id,operationId:crypto.randomUUID(),revision:trip.revision});
    return <article className={`repayment-entry ${r.voided?'voided':''}`} key={r.id}><div className="repayment-row"><div><b>{name(r.fromId)} → {name(r.toId)}</b><small>{r.date} · {r.voided?'已作廢':status[r.status]} · {actor(r.createdBy)} 記錄</small></div><strong>{money(r.amount)}</strong>{r.status==='confirmed'&&!r.voided&&write&&admin&&<button className="icon-button" disabled={busy} aria-label={`作廢 ${name(r.fromId)} 的還款`} onClick={()=>onVoid(r)}><Trash2 size={16}/></button>}</div>{r.status==='pending'&&<div className="repayment-actions">{canConfirm&&<><button className="primary" disabled={busy} onClick={()=>send('confirm-repayment')}>{receiver?'確認已收到款項':'代收款方確認已收到'}</button><button className="secondary" disabled={busy} onClick={()=>send('reject-repayment')}>未收到，拒絕申報</button></>}{write&&(admin||receiver||r.createdBy===trip.me.actorId)&&<button className="secondary" disabled={busy} onClick={()=>send('cancel-repayment')}>取消申報</button>}{proxy&&canConfirm&&<p className="small muted">此收款旅伴未綁定登入帳號，管理者可代確認，操作會留下紀錄。</p>}</div>}{!!r.events.length&&<details className="change-history"><summary>還款處理歷史</summary><ol>{r.events.map(e=><li key={e.id}><b>{({confirm:'確認收到',cancel:'取消申報',reject:'拒絕申報',void:'作廢還款'})[e.action]}</b><p>{actor(e.actorId)}{e.proxy?' · 管理者代辦':''} · {new Date(e.at).toLocaleString('zh-TW')}</p></li>)}</ol></details>}</article>;
  })}{!trip.repayments.length&&<p className="muted small mt-4">還沒有還款紀錄。</p>}</section></div>;
}

type MemberBalance = { paid:number; share:number; sent:number; received:number; balance:number };
type SettlementStep = { fromId:string; toId:string; amount:number; fromBefore:number; toBefore:number; fromAfter:number; toAfter:number };

function BalanceExplanation({trip}:{trip:Trip}) {
  const [expanded,setExpanded]=useState(false);
  return <section className="panel repayment-panel calculation-panel" aria-label="還款計算過程">
    <details onToggle={event=>setExpanded(event.currentTarget.open)}>
      <summary>查看還款計算過程</summary>
      {expanded&&<CalculationContent trip={trip}/>}
    </details>
  </section>;
}

function CalculationContent({trip}:{trip:Trip}) {
  const totals=balanceBreakdown(trip) as Record<string,MemberBalance>;
  const steps=settlementSteps(trip) as SettlementStep[];
  const activeExpenses=trip.expenses.filter(expense=>!expense.voided);
  const confirmedRepayments=trip.repayments.filter(repayment=>!repayment.voided&&(!repayment.status||repayment.status==='confirmed'));
  const money=(amount:number)=>formatMoney(amount,trip.currency);
  const name=(id:string)=>trip.members.find(member=>member.id===id)?.name??'未知旅伴';
  const equalRule=(amount:number,ids:string[])=>{
    const remainder=amount%ids.length;
    return `${money(amount)} ÷ ${ids.length} 人${remainder?`；剩餘 ${remainder} 個最小貨幣單位，依選取順序各加 1 給 ${ids.slice(0,remainder).map(name).join('、')}`:'，可整除，沒有尾差'}`;
  };

  return <div className="calculation-content">
      <p className="small muted">先把整本帳的有效支出及已確認還款合併，算出每位旅伴的淨額；再依旅伴順序，將待付與應收金額逐步配對。建議轉帳不代表兩人直接共同購買了同一筆物品，也不會自動記為已還款。</p>

      <section aria-label="有效支出如何分配"><h3>1. 有效支出如何分配</h3>
        {activeExpenses.map(expense=>{
          const payments=expense.payments??[{memberId:(expense as Expense&{payerId:string}).payerId,amount:expense.amount}];
          const personalTotal=expense.personalItems?.reduce((sum,item)=>sum+item.amount,0)??0;
          return <article className="calculation-expense" key={expense.id}>
            <div className="row"><strong>{expense.title}</strong><b>{money(expense.amount)}</b></div>
            <p className="small muted">{expense.date} · {expense.splitMode==='mixed'?'共同平均＋個人項目':expense.splitMode==='equal'?'平均分攤':'指定金額'}</p>
            <p><b>先付款：</b>{payments.map(payment=>`${name(payment.memberId)} ${money(payment.amount)}`).join('、')}</p>
            <p><b>應分攤：</b>{expense.shares.map(share=>`${name(share.memberId)} ${money(share.amount)}`).join('、')}</p>
            {expense.splitMode==='equal'&&<p className="small muted">平均分攤：{equalRule(expense.amount,expense.shares.map(share=>share.memberId))}。</p>}
            {expense.splitMode==='mixed'&&<div className="calculation-mixed"><p>共同費用 {money(expense.amount)} − 個人項目 {money(personalTotal)} ＝ {money(expense.amount-personalTotal)}，由 {expense.equalMemberIds?.map(name).join('、')} 平均分攤：{equalRule(expense.amount-personalTotal,expense.equalMemberIds??[])}。</p>{expense.personalItems?.map((item,index)=><p key={index}>個人項目「{item.name}」：{name(item.memberId)} 分攤 {money(item.amount)}</p>)}</div>}
          </article>;
        })}
        {!activeExpenses.length&&<p className="small muted">目前沒有有效支出。</p>}
        <p className="small muted">作廢支出不列入；更正支出以目前版本為準。</p>
      </section>

      <section aria-label="已確認還款如何扣抵"><h3>2. 已確認還款如何扣抵</h3>
        {confirmedRepayments.map(repayment=><p className="calculation-repayment" key={repayment.id}>{repayment.date} · {name(repayment.fromId)} 已還給 {name(repayment.toId)} {money(repayment.amount)}</p>)}
        {!confirmedRepayments.length&&<p className="small muted">目前沒有已確認的還款。</p>}
        <p className="small muted">已還出款項會減少付款人的待付額；收款人已收到的款項會減少其應收額。待確認、已取消、已拒絕及已作廢的還款不計入。</p>
      </section>

      <section aria-label="每人淨額"><h3>3. 每人淨額</h3>
        {trip.members.map(member=>{
          const row=totals[member.id];
          return <div className="calculation-member" key={member.id}>
            <div className="row"><strong>{member.name}{member.active===false?'（已移除）':''}</strong><b className={row.balance>0?'positive':row.balance<0?'negative':'muted'}>{row.balance>0?`應收 ${money(row.balance)}`:row.balance<0?`應付 ${money(-row.balance)}`:'已結清'}</b></div>
            <p>先付 {money(row.paid)} − 分攤 {money(row.share)} ＋ 已還出 {money(row.sent)} − 已收到 {money(row.received)} ＝ {row.balance<0?'−':'＋'}{money(Math.abs(row.balance))}</p>
          </div>;
        })}
      </section>

      <section aria-label="建議還款如何配對"><h3>4. 建議還款如何配對</h3>
        <p className="small muted">依上方淨額，按旅伴順序配對待付者與應收者；每一步取雙方剩餘金額較小者。這是可結清帳本的建議路徑，不保證轉帳筆數在所有組合中最少。</p>
        <ol className="calculation-steps">{steps.map((step,index)=><li key={`${step.fromId}-${step.toId}`}>
          <strong>第 {index+1} 步：{name(step.fromId)} → {name(step.toId)}　{money(step.amount)}</strong>
          <p>配對前：{name(step.fromId)} 待付 {money(step.fromBefore)}；{name(step.toId)} 應收 {money(step.toBefore)}。取較小金額 {money(step.amount)}。</p>
          <p>配對後：{name(step.fromId)} 尚待付 {money(step.fromAfter)}；{name(step.toId)} 尚應收 {money(step.toAfter)}。</p>
        </li>)}</ol>
        {!steps.length&&<p className="small muted">每位旅伴的淨額都是零，因此沒有需要配對的還款。</p>}
      </section>
  </div>;
}
