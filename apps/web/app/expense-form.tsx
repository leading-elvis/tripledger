"use client";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { CURRENCIES, evenShares, formatMoney, parseMoney } from '@/lib/domain.mjs';
import { imagePayload, prepareReceipt } from '@/lib/receipt-image';
import type { Expense, Trip } from '@/lib/types';
import { categories, Choice, today } from './ledger-ui';

type PersonalRow = {key:string;name:string;memberId:string;amount:string;originalMemberId?:string};

export function ExpenseForm({trip,expense,busy,submit}:{trip:Trip;expense?:Expense;busy:boolean;submit:(data:unknown)=>Promise<void>}) {
  const digits=CURRENCIES[trip.currency as keyof typeof CURRENCIES];
  const activeMembers=trip.members.filter(member=>member.active!==false);
  const originalPaymentIds=new Set(expense?.payments.map(payment=>payment.memberId)??[]);
  const originalShareIds=new Set(expense?.shares.map(share=>share.memberId)??[]);
  const originalEqualIds=new Set(expense?.splitMode==='mixed'?expense.equalMemberIds??[]:expense?.shares.map(share=>share.memberId)??[]);
  const paymentMembers=trip.members.filter(member=>member.active!==false||originalPaymentIds.has(member.id));
  const [id]=useState(()=>expense?.id??crypto.randomUUID());
  const [operationId,setOperationId]=useState(()=>crypto.randomUUID());
  const [revision,setRevision]=useState(trip.revision);
  const [payments,setPayments]=useState(()=>expense?expense.payments.map(p=>({key:crypto.randomUUID(),memberId:p.memberId,amount:(p.amount/10**digits).toFixed(digits)})):[{key:crypto.randomUUID(),memberId:activeMembers.find(member=>member.id===trip.me.participantId)?.id??activeMembers[0].id,amount:''}]);
  const [category,setCategory]=useState(expense?.category??'餐飲');
  const [mode,setMode]=useState<string>(expense?(expense.splitMode??'exact'):'equal');
  const splitMembers=trip.members.filter(member=>member.active!==false||(mode==='exact'?originalShareIds:originalEqualIds).has(member.id));
  const [selected,setSelected]=useState(expense?.splitMode==='mixed'?expense.equalMemberIds??[]:expense?.shares.map(s=>s.memberId)??activeMembers.map(m=>m.id));
  const mixedSelection=useRef(selected);
  const [title,setTitle]=useState(expense?.title??'');
  const [amount,setAmount]=useState(expense?(expense.amount/10**digits).toFixed(digits):'');
  const [date,setDate]=useState(expense?.date??today());
  const [exact,setExact]=useState<Record<string,string>>(()=>Object.fromEntries((expense?.shares??[]).map(s=>[s.memberId,(s.amount/10**digits).toFixed(digits)])));
  const [personalItems,setPersonalItems]=useState<PersonalRow[]>(()=>expense?.personalItems?.map(item=>({key:crypto.randomUUID(),name:item.name,memberId:item.memberId,originalMemberId:item.memberId,amount:(item.amount/10**digits).toFixed(digits)}))??[]);
  const [file,setFile]=useState<File|null>(null),[previewUrl,setPreviewUrl]=useState('');
  const [processing,setProcessing]=useState(false),[receiptError,setReceiptError]=useState(''),[error,setError]=useState(''),[attempted,setAttempted]=useState(false);
  const selection=useRef(0);
  useEffect(()=>{if(!file){setPreviewUrl('');return;}const url=URL.createObjectURL(file);setPreviewUrl(url);return()=>URL.revokeObjectURL(url);},[file]);
  useEffect(()=>()=>{selection.current++;},[]);
  const choose=async(value:File|undefined)=>{
    if(!value)return;const request=++selection.current;
    setProcessing(true);setReceiptError('');setFile(null);
    try{const prepared=await prepareReceipt(value);if(request===selection.current)setFile(prepared);}
    catch(e){if(request===selection.current)setReceiptError(e instanceof Error?e.message:'無法讀取圖片');}
    finally{if(request===selection.current)setProcessing(false);}
  };
  let totalMinor=0,paidMinor=0,paymentInputsValid=true;
  try{totalMinor=parseMoney(amount,trip.currency);}catch{}
  for(const payment of payments)try{paidMinor+=parseMoney(payment.amount,trip.currency);}catch{paymentInputsValid=false;}
  let personalMinor=0,personalInputsValid=personalItems.length>0;
  if(mode==='mixed')for(const item of personalItems)try{personalMinor+=parseMoney(item.amount,trip.currency);}catch{personalInputsValid=false;}
  const personalNamesValid=personalItems.every(item=>item.name.trim().length>=1&&item.name.trim().length<=40);
  const sharedMinor=totalMinor-personalMinor;
  const mixedReady=mode==='mixed'&&totalMinor>0&&personalInputsValid&&personalNamesValid&&sharedMinor>0&&selected.length>0;
  let preview:{memberId:string;amount:number}[]=[];
  let sharedPreview:{memberId:string;amount:number}[]=[];
  try{
    if(mode==='equal')preview=evenShares(totalMinor,selected);
    if(mixedReady){
      sharedPreview=evenShares(sharedMinor,selected);
      const shares=new Map(sharedPreview.map(share=>[share.memberId,share.amount]));
      for(const item of personalItems)shares.set(item.memberId,(shares.get(item.memberId)??0)+parseMoney(item.amount,trip.currency));
      preview=[...shares].map(([memberId,amount])=>({memberId,amount}));
    }
  }catch{}
  const paymentMatches=totalMinor>0&&paymentInputsValid&&paidMinor===totalMinor;
  const changeTotal=(value:string)=>{setAmount(value);if(payments.length===1&&(!payments[0].amount||(paymentInputsValid&&totalMinor>0&&paidMinor===totalMinor)))setPayments(old=>old.map(p=>({...p,amount:value})));};
  const addPayer=()=>{const next=paymentMembers.find(m=>!payments.some(p=>p.memberId===m.id));if(next)setPayments(old=>[...old,{key:crypto.randomUUID(),memberId:next.id,amount:paymentInputsValid&&totalMinor>paidMinor?((totalMinor-paidMinor)/10**digits).toFixed(digits):''}]);};
  const addPersonalItem=()=>setPersonalItems(old=>old.length>=40?old:[...old,{key:crypto.randomUUID(),name:'個人項目',memberId:activeMembers.find(member=>member.id===trip.me.participantId)?.id??activeMembers[0].id,amount:''}]);
  const selectedRetired=payments.some(payment=>!paymentMembers.some(member=>member.id===payment.memberId))||selected.some(id=>!splitMembers.some(member=>member.id===id))||personalItems.some(item=>!trip.members.some(member=>member.id===item.memberId&&(member.active!==false||item.originalMemberId===member.id)));
  const stale=revision!==trip.revision;
  const latest=expense?trip.expenses.find(e=>e.id===id):undefined;
  const allowed=trip.me.role!=='viewer'&&(!expense||trip.me.role==='admin'||expense.createdBy===trip.me.actorId);
  const missingFields:string[]=[];
  if(!title.trim())missingFields.push('支出名稱');
  if(!amount.trim())missingFields.push('支出總額');
  if(!date)missingFields.push('日期');
  payments.forEach((payment,index)=>{if(!payment.amount.trim())missingFields.push(`付款人 ${index+1} 金額`);});
  if(!selected.length)missingFields.push(mode==='mixed'?'共同分攤旅伴':'分攤旅伴');
  if(mode==='exact')selected.forEach(memberId=>{if(!(exact[memberId]??'').trim())missingFields.push(`${trip.members.find(member=>member.id===memberId)?.name??'旅伴'}的分攤金額`);});
  if(mode==='mixed'){
    if(!personalItems.length)missingFields.push('個人項目');
    personalItems.forEach((item,index)=>{if(!item.name.trim())missingFields.push(`個人項目 ${index+1} 名稱`);if(!item.amount.trim())missingFields.push(`個人項目 ${index+1} 金額`);});
  }
  const missingSummary=missingFields.length?`請先填寫：${missingFields.slice(0,3).join('、')}${missingFields.length>3?`等 ${missingFields.length} 項`:''}`:'';
  const save=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setAttempted(true);setError('');
    if(missingFields.length){const form=e.currentTarget;window.setTimeout(()=>{const target=form.querySelector<HTMLElement>('[aria-invalid="true"]')??form.querySelector<HTMLElement>('.error[role="alert"]');target?.scrollIntoView({block:'center'});target?.focus();},0);return;}
    try{
      if(stale)throw new Error('請先核對最新版本，再送出更正');
      const total=parseMoney(amount,trip.currency);
      const personal=mode==='mixed'?personalItems.map(item=>({name:item.name.trim(),memberId:item.memberId,amount:parseMoney(item.amount,trip.currency)})):[];
      if(mode==='mixed'){
        if(!personal.length)throw new Error('請至少新增一項個人項目');
        if(personal.some(item=>!item.name||item.name.length>40))throw new Error('個人項目名稱需為 1–40 字');
        if(personal.reduce((sum,item)=>sum+item.amount,0)>=total)throw new Error('個人項目合計必須小於支出總額，才能平均分攤剩餘金額');
        if(!selected.length)throw new Error('請選擇至少一位共同分攤旅伴');
      }
      const shares=mode==='mixed'?preview: selected.map(memberId=>({memberId,amount:mode==='exact'?(Number(exact[memberId])===0?0:parseMoney(exact[memberId]??'',trip.currency)):0}));
      const paid=payments.map(p=>({memberId:p.memberId,amount:parseMoney(p.amount,trip.currency)}));
      if(new Set(paid.map(p=>p.memberId)).size!==paid.length)throw new Error('同一付款旅伴只能填寫一次');
      if(paid.reduce((sum,p)=>sum+p.amount,0)!==total)throw new Error('付款金額加總必須等於支出總額');
      if(mode==='exact'&&shares.reduce((s,x)=>s+x.amount,0)!==total)throw new Error('指定金額加總必須等於支出金額');
      if(!selected.length)throw new Error('請至少選擇一位分攤旅伴');
      await submit({id,operationId,revision,title:title.trim(),amount:total,payments:paid,category,date,mode,memberIds:selected,shares,...(mode==='mixed'?{personalItems:personal}:{}),...(!expense?{file:await imagePayload(file)}:{})});
    }catch(e){setError(e instanceof Error?e.message:'請確認資料');}
  };
  return <form className="dialog-main-form" noValidate onSubmit={e=>void save(e)}><fieldset className="form-stack" disabled={busy}>
    {!allowed&&<p className="notice" role="alert">目前沒有儲存權限，你的輸入仍保留。請向管理者確認權限。</p>}
    {stale&&<div className="notice" role="alert"><p>帳本已有較新的資料，你的輸入仍保留。確認目前帳目後，才能重新送出。</p>{latest&&<div><p>目前儲存：{latest.title} · {formatMoney(latest.amount,trip.currency)}</p><p>{latest.date} · {latest.category} · {latest.voided?'已作廢':'有效支出'}</p><p>先付款：{latest.payments.map(p=>`${trip.members.find(m=>m.id===p.memberId)?.name} ${formatMoney(p.amount,trip.currency)}`).join('、')}</p><p>分攤：{latest.shares.map(s=>`${trip.members.find(m=>m.id===s.memberId)?.name} ${formatMoney(s.amount,trip.currency)}`).join('、')}</p></div>}<button type="button" className="secondary" disabled={trip.archived||latest?.voided} onClick={()=>{setRevision(trip.revision);setOperationId(crypto.randomUUID());}}>已核對，保留輸入並使用最新版本</button></div>}
    {(trip.archived||latest?.voided)&&<p className="notice" role="alert">{trip.archived?'旅程已封存':'支出已作廢'}，目前無法儲存。你的輸入仍保留在此表單。</p>}
    {expense&&<p className="small muted">更正前後內容會保留。原收據與已記錄的還款維持不變，餘額會依新內容重算。</p>}
    {selectedRetired&&<p className="notice" role="alert">部分旅伴已移除，不能再加入這筆支出。請改選使用中的旅伴；原本已在這筆舊支出中的旅伴仍可保留與更正。</p>}
    {attempted&&missingFields.length>0&&<p className="error" role="alert">{missingSummary}</p>}
    <label className="field">支出名稱<input name="title" required maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} aria-invalid={attempted&&!title.trim()} aria-describedby={attempted&&!title.trim()?'expense-title-error':undefined} placeholder="例如：旅程第一頓晚餐" autoFocus/>{attempted&&!title.trim()&&<small id="expense-title-error" className="field-error">請填寫支出名稱</small>}</label>
    <div className="form-row"><label className="field">支出總額（{trip.currency}）<input inputMode="decimal" value={amount} onChange={e=>changeTotal(e.target.value)} required aria-invalid={attempted&&!amount.trim()} aria-describedby={attempted&&!amount.trim()?'expense-amount-error':undefined} placeholder={digits?'0.00':'0'}/>{attempted&&!amount.trim()&&<small id="expense-amount-error" className="field-error">請填寫支出總額</small>}</label><label className="field">日期<input name="date" type="date" value={date} onChange={e=>setDate(e.target.value)} required aria-invalid={attempted&&!date} aria-describedby={attempted&&!date?'expense-date-error':undefined}/>{attempted&&!date&&<small id="expense-date-error" className="field-error">請選擇日期</small>}</label></div>
    <fieldset className="payer-group"><legend>誰先付款</legend><p className="small muted">選擇實際墊付的旅伴，填入各自支付的金額。</p>{payments.map((payment,index)=><div className="payer-row" key={payment.key}><Choice label={`付款人 ${index+1}`} value={payment.memberId} options={trip.members.filter(m=>(paymentMembers.some(eligible=>eligible.id===m.id)||m.id===payment.memberId)&&(m.id===payment.memberId||!payments.some(p=>p.memberId===m.id))).map(m=>({value:m.id,label:m.active===false?`${m.name}（已移除）`:m.name}))} onChange={memberId=>setPayments(old=>old.map(p=>p.key===payment.key?{...p,memberId}:p))}/><label className="field">付款金額（{trip.currency}）<input aria-label={`付款人 ${index+1} 金額`} inputMode="decimal" required value={payment.amount} aria-invalid={attempted&&!payment.amount.trim()} placeholder={digits?'0.00':'0'} onChange={e=>setPayments(old=>old.map(p=>p.key===payment.key?{...p,amount:e.target.value}:p))}/>{attempted&&!payment.amount.trim()&&<small className="field-error">請填寫付款金額</small>}</label><button type="button" className="icon-button" aria-label={`移除付款人 ${index+1}`} disabled={payments.length===1} onClick={()=>setPayments(old=>old.filter(p=>p.key!==payment.key))}><Trash2 size={18}/></button></div>)}<button type="button" className="secondary" disabled={payments.length>=paymentMembers.length} onClick={addPayer}><Plus size={18}/>新增付款人</button><div className={`payment-total ${paymentMatches?'payment-matched':''}`} role="status"><strong>付款合計 {formatMoney(paidMinor,trip.currency)}</strong><span>{paymentMatches?'與支出總額一致':!totalMinor?'請先填寫支出總額':!paymentInputsValid?'請填寫每位付款人的金額':paidMinor<totalMinor?`尚差 ${formatMoney(totalMinor-paidMinor,trip.currency)}`:`超出 ${formatMoney(paidMinor-totalMinor,trip.currency)}`}</span></div></fieldset>
    <Choice label="分類" value={category} options={Object.keys(categories).map(c=>({value:c,label:c}))} onChange={setCategory}/>
    <Choice label="分攤方式" value={mode} options={[{value:'equal',label:'平均分攤'},{value:'mixed',label:'平均分攤＋個人項目'},{value:'exact',label:'指定金額'}]} onChange={next=>{
      if(mode==='mixed'&&next!=='mixed')mixedSelection.current=selected;
      if(next==='exact'&&mode==='mixed'){
        const final=preview.length?preview:expense?.shares??[];
        const finalIds=new Set([...selected,...final.map(share=>share.memberId),...personalItems.map(item=>item.memberId)]);
        setSelected(trip.members.filter(member=>finalIds.has(member.id)).map(member=>member.id));
        setExact(old=>({...old,...Object.fromEntries(final.map(share=>[share.memberId,(share.amount/10**digits).toFixed(digits)]))}));
      }
      if(next==='mixed'&&mode!=='mixed'&&personalItems.length)setSelected(mixedSelection.current);
      setMode(next);
      if(next==='mixed'&&!personalItems.length)addPersonalItem();
    }}/>
    <fieldset className="split-members"><legend>{mode==='mixed'?'共同費用由誰平均分攤':'誰一起分攤'}</legend>{mode==='mixed'&&<p className="small muted split-help">個人物品會先從總額扣除，剩餘費用由勾選的旅伴平均分攤。</p>}{trip.members.filter(m=>splitMembers.some(eligible=>eligible.id===m.id)||selected.includes(m.id)).map(m=><div className="split-row" key={m.id}><label><Checkbox checked={selected.includes(m.id)} onCheckedChange={checked=>setSelected(old=>checked?trip.members.filter(x=>x.id===m.id||old.includes(x.id)).map(x=>x.id):old.filter(id=>id!==m.id))}/>{m.name}{m.active===false?'（已移除）':''}</label>{selected.includes(m.id)&&(mode==='exact'?<span className="split-amount-field"><input aria-label={`${m.name} 分攤金額`} inputMode="decimal" value={exact[m.id]??''} aria-invalid={attempted&&!(exact[m.id]??'').trim()} placeholder="0" onChange={e=>setExact(old=>({...old,[m.id]:e.target.value}))}/>{attempted&&!(exact[m.id]??'').trim()&&<small className="field-error">請填寫分攤金額</small>}</span>:<span>{formatMoney((mode==='mixed'?sharedPreview:preview).find(s=>s.memberId===m.id)?.amount??0,trip.currency)}</span>)}</div>)}{attempted&&!selected.length&&<p className="field-error" role="alert">請至少選擇一位分攤旅伴</p>}</fieldset>
    {mode==='mixed'&&<section className="personal-split" aria-label="個人項目">
      <div className="personal-split-heading"><div><h3>個人項目</h3><p className="small muted">可新增多筆，指定給實際使用的旅伴；由誰先付款仍以上方記錄為準。</p></div></div>
      {personalItems.map((item,index)=><div className="personal-item" key={item.key}>
        <div className="personal-item-title"><strong>項目 {index+1}</strong><button type="button" className="icon-button" aria-label={`移除個人項目 ${index+1}`} onClick={()=>setPersonalItems(old=>old.filter(row=>row.key!==item.key))}><Trash2 size={18}/></button></div>
        <label className="field">項目名稱<input aria-label={`個人項目 ${index+1} 名稱`} value={item.name} maxLength={40} required aria-invalid={attempted&&!item.name.trim()} placeholder="例如：個人飲料" onChange={e=>setPersonalItems(old=>old.map(row=>row.key===item.key?{...row,name:e.target.value}:row))}/>{attempted&&!item.name.trim()&&<small className="field-error">請填寫項目名稱</small>}</label>
        <div className="personal-item-fields"><Choice label={`項目 ${index+1} 歸屬旅伴`} value={item.memberId} options={trip.members.filter(member=>member.active!==false||item.originalMemberId===member.id).map(member=>({value:member.id,label:member.active===false?`${member.name}（已移除）`:member.name}))} onChange={memberId=>setPersonalItems(old=>old.map(row=>row.key===item.key?{...row,memberId}:row))}/><label className="field">金額（{trip.currency}）<input aria-label={`個人項目 ${index+1} 金額`} inputMode="decimal" value={item.amount} required aria-invalid={attempted&&!item.amount.trim()} placeholder={digits?'0.00':'0'} onChange={e=>setPersonalItems(old=>old.map(row=>row.key===item.key?{...row,amount:e.target.value}:row))}/>{attempted&&!item.amount.trim()&&<small className="field-error">請填寫項目金額</small>}</label></div>
      </div>)}
      <button type="button" className="secondary personal-add" disabled={personalItems.length>=40} onClick={addPersonalItem}><Plus size={18}/>新增個人項目</button>
      <div className={`personal-total ${mixedReady?'personal-total-ready':''}`} role="status"><div><span>個人項目合計</span><strong>{formatMoney(personalMinor,trip.currency)}</strong></div><div><span>剩餘共同分攤</span><strong>{totalMinor>0&&sharedMinor>=0?formatMoney(sharedMinor,trip.currency):'—'}</strong></div><p>{!totalMinor?'請先填寫支出總額':!personalItems.length?'請新增至少一項個人項目':!personalNamesValid?'請填寫每個個人項目的名稱':!personalInputsValid?'請填寫每個個人項目的金額':personalMinor>=totalMinor?'個人項目合計必須小於支出總額':!selected.length?'請選擇共同分攤的旅伴':'已從總額扣除個人項目，並平均分配剩餘金額'}</p></div>
      {mixedReady&&<div className="final-shares"><h3>每人最終應分攤</h3>{preview.map(share=><div key={share.memberId}><span>{trip.members.find(member=>member.id===share.memberId)?.name??'未知旅伴'}</span><strong>{formatMoney(share.amount,trip.currency)}</strong></div>)}</div>}
    </section>}
    {!expense&&<div className="form-stack"><div className="form-row"><label className="field">收據圖片（選填）<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value="";void choose(file);}}/></label><label className="field">拍照新增收據（選填）<input type="file" accept="image/*" capture="environment" onChange={e=>{const file=e.target.files?.[0];e.target.value="";void choose(file);}}/></label></div>{!file&&!processing&&!receiptError&&<p className="small muted">未附收據（選填），仍可儲存支出。</p>}<p className="small muted">JPG、PNG 或 WebP。超過 1 MB 會嘗試縮小，請確認預覽中的文字清晰。</p>{processing&&<p role="status">正在準備收據…</p>}{receiptError&&<p className="error" role="alert">{receiptError}；仍可不附收據儲存支出。</p>}{previewUrl&&<figure className="receipt-preview"><img src={previewUrl} alt="待上傳收據預覽"/><figcaption>{file?.name} · {Math.ceil((file?.size??0)/1024)} KB</figcaption></figure>}{(file||receiptError)&&<button type="button" className="secondary" onClick={()=>{selection.current++;setFile(null);setReceiptError('');setProcessing(false);}}>{receiptError?"略過無效收據":"移除所選收據"}</button>}</div>}
    {error&&<p className="error" role="alert">{error}</p>}
    <button className="primary" disabled={!allowed||busy||processing||stale||trip.archived||latest?.voided}>{busy?'正在儲存…':expense?'儲存更正':'儲存支出'}</button>
  </fieldset></form>;
}
