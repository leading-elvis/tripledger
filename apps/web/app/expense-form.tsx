"use client";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { CURRENCIES, evenShares, formatMoney, parseMoney } from '@/lib/domain.mjs';
import { imagePayload, prepareReceipt } from '@/lib/receipt-image';
import type { Expense, Trip } from '@/lib/types';
import { categories, Choice, today } from './ledger-ui';

export function ExpenseForm({trip,expense,busy,submit}:{trip:Trip;expense?:Expense;busy:boolean;submit:(data:unknown)=>Promise<void>}) {
  const digits=CURRENCIES[trip.currency as keyof typeof CURRENCIES];
  const [id]=useState(()=>expense?.id??crypto.randomUUID());
  const [operationId,setOperationId]=useState(()=>crypto.randomUUID());
  const [revision,setRevision]=useState(trip.revision);
  const [payer,setPayer]=useState(expense?.payerId??trip.me.participantId??trip.members[0].id);
  const [category,setCategory]=useState(expense?.category??'餐飲');
  const [mode,setMode]=useState<string>(expense?(expense.splitMode??'exact'):'equal');
  const [selected,setSelected]=useState(expense?.shares.map(s=>s.memberId)??trip.members.map(m=>m.id));
  const [amount,setAmount]=useState(expense?(expense.amount/10**digits).toFixed(digits):'');
  const [exact,setExact]=useState<Record<string,string>>(()=>Object.fromEntries((expense?.shares??[]).map(s=>[s.memberId,(s.amount/10**digits).toFixed(digits)])));
  const [file,setFile]=useState<File|null>(null),[previewUrl,setPreviewUrl]=useState('');
  const [processing,setProcessing]=useState(false),[receiptError,setReceiptError]=useState(''),[error,setError]=useState('');
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
  let preview:{memberId:string;amount:number}[]=[];
  try{if(mode==='equal')preview=evenShares(parseMoney(amount,trip.currency),selected);}catch{}
  const stale=revision!==trip.revision;
  const latest=expense?trip.expenses.find(e=>e.id===id):undefined;
  const allowed=trip.me.role!=='viewer'&&(!expense||trip.me.role==='admin'||expense.createdBy===trip.me.actorId);
  const save=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setError('');const form=new FormData(e.currentTarget);
    try{
      if(stale)throw new Error('請先核對最新版本，再送出更正');
      const total=parseMoney(amount,trip.currency),shares=selected.map(memberId=>({memberId,amount:mode==='exact'?(Number(exact[memberId])===0?0:parseMoney(exact[memberId]??'',trip.currency)):0}));
      if(mode==='exact'&&shares.reduce((s,x)=>s+x.amount,0)!==total)throw new Error('指定金額加總必須等於支出金額');
      if(!selected.length)throw new Error('請至少選擇一位分攤旅伴');
      await submit({id,operationId,revision,title:form.get('title'),amount:total,payerId:payer,category,date:form.get('date'),mode,memberIds:selected,shares,...(!expense?{file:await imagePayload(file)}:{})});
    }catch(e){setError(e instanceof Error?e.message:'請確認資料');}
  };
  return <form onSubmit={e=>void save(e)}><fieldset className="form-stack" disabled={busy}>
    {!allowed&&<p className="notice" role="alert">目前沒有儲存權限，你的輸入仍保留。請向管理者確認權限。</p>}
    {stale&&<div className="notice" role="alert"><p>帳本已有較新的資料，你的輸入仍保留。確認目前帳目後，才能重新送出。</p>{latest&&<div><p>目前儲存：{latest.title} · {formatMoney(latest.amount,trip.currency)}</p><p>{latest.date} · {latest.category} · {trip.members.find(m=>m.id===latest.payerId)?.name} 先付 · {latest.voided?'已作廢':'有效支出'}</p><p>{latest.shares.map(s=>`${trip.members.find(m=>m.id===s.memberId)?.name} ${formatMoney(s.amount,trip.currency)}`).join('、')}</p></div>}<button type="button" className="secondary" disabled={trip.archived||latest?.voided} onClick={()=>{setRevision(trip.revision);setOperationId(crypto.randomUUID());}}>已核對，保留輸入並使用最新版本</button></div>}
    {(trip.archived||latest?.voided)&&<p className="notice" role="alert">{trip.archived?'旅程已封存':'支出已作廢'}，目前無法儲存。你的輸入仍保留在此表單。</p>}
    {expense&&<p className="small muted">更正前後內容會保留。原收據與已記錄的還款維持不變，餘額會依新內容重算。</p>}
    <label className="field">支出名稱<input name="title" required maxLength={80} defaultValue={expense?.title??''} placeholder="例如：旅程第一頓晚餐" autoFocus/></label>
    <div className="form-row"><label className="field">金額（{trip.currency}）<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} required placeholder={digits?'0.00':'0'}/></label><label className="field">日期<input name="date" type="date" defaultValue={expense?.date??today()} required/></label></div>
    <div className="form-row"><Choice label="誰先付款" value={payer} options={trip.members.map(m=>({value:m.id,label:m.name}))} onChange={setPayer}/><Choice label="分類" value={category} options={Object.keys(categories).map(c=>({value:c,label:c}))} onChange={setCategory}/></div>
    <Choice label="分攤方式" value={mode} options={[{value:'equal',label:'平均分攤'},{value:'exact',label:'指定金額'}]} onChange={setMode}/>
    <fieldset className="split-members"><legend>誰一起分攤</legend>{trip.members.map(m=><div className="split-row" key={m.id}><label><Checkbox checked={selected.includes(m.id)} onCheckedChange={checked=>setSelected(old=>checked?trip.members.filter(x=>x.id===m.id||old.includes(x.id)).map(x=>x.id):old.filter(id=>id!==m.id))}/>{m.name}</label>{selected.includes(m.id)&&(mode==='exact'?<input aria-label={`${m.name} 分攤金額`} inputMode="decimal" value={exact[m.id]??''} placeholder="0" onChange={e=>setExact(old=>({...old,[m.id]:e.target.value}))}/>:<span>{formatMoney(preview.find(s=>s.memberId===m.id)?.amount??0,trip.currency)}</span>)}</div>)}</fieldset>
    {!expense&&<div className="form-stack"><div className="form-row"><label className="field">收據圖片（選填）<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value="";void choose(file);}}/></label><label className="field">拍照新增收據<input type="file" accept="image/*" capture="environment" onChange={e=>{const file=e.target.files?.[0];e.target.value="";void choose(file);}}/></label></div><p className="small muted">JPG、PNG 或 WebP。超過 1 MB 會嘗試縮小，請確認預覽中的文字清晰。</p>{processing&&<p role="status">正在準備收據…</p>}{receiptError&&<p className="error" role="alert">{receiptError}</p>}{previewUrl&&<figure className="receipt-preview"><img src={previewUrl} alt="待上傳收據預覽"/><figcaption>{file?.name} · {Math.ceil((file?.size??0)/1024)} KB</figcaption></figure>}{(file||receiptError)&&<button type="button" className="secondary" onClick={()=>{selection.current++;setFile(null);setReceiptError('');setProcessing(false);}}>移除所選收據</button>}</div>}
    {error&&<p className="error" role="alert">{error}</p>}
    <button className="primary" disabled={!allowed||busy||processing||!!receiptError||stale||trip.archived||latest?.voided}>{busy?'正在儲存…':expense?'儲存更正':'儲存支出'}</button>
  </fieldset></form>;
}
