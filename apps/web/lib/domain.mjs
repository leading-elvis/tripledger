// Pure money/domain code shared by Workers, the browser and independent Node hosting.
export const CURRENCIES = { TWD: 2, USD: 2, JPY: 0, EUR: 2, HKD: 2 };
// Preserve room to upgrade legacy payer fields in expenses and historical snapshots.
export const LIMITS = { members: 20, memberRecords: 100, expenses: 300, repayments: 200, history: 300, documentBytes: 1114112, receiptBytes: 1048576, receiptTotal: 8388608, bodyBytes: 14680064 };
export class AppError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export function ensure(condition, message, status = 400) { if (!condition) throw new AppError(message, status); }
export function uuid(value) { ensure(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), '資料識別碼無效'); return value; }
export function label(value, max = 80) { ensure(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, `請輸入 1–${max} 字的名稱`); return value.trim(); }
export function minor(value, zero = false) { ensure(Number.isSafeInteger(value) && value >= (zero ? 0 : 1) && value <= 100000000000, '金額必須是有效的整數最小貨幣單位'); return value; }
export function parseMoney(value, currency) {
  ensure(Object.hasOwn(CURRENCIES, currency), '不支援此幣別');
  const digits = CURRENCIES[currency];
  ensure(typeof value === 'string' && (digits ? /^\d{1,12}(\.\d{1,2})?$/ : /^\d{1,12}$/).test(value), digits ? '請輸入有效金額（最多 2 位小數）' : '此幣別請輸入整數金額');
  const [whole, fraction = ''] = value.split('.');
  return minor(Number(whole) * (10 ** digits) + Number(fraction.padEnd(digits, '0')));
}
export function formatMoney(amount, currency) { return new Intl.NumberFormat('zh-TW', { style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: CURRENCIES[currency], maximumFractionDigits: CURRENCIES[currency] }).format(amount / 10 ** CURRENCIES[currency]); }
export function evenShares(amount, memberIds) {
  minor(amount); ensure(Array.isArray(memberIds) && memberIds.length > 0 && memberIds.length <= LIMITS.members && new Set(memberIds).size === memberIds.length, '請選擇不重複的分攤旅伴');
  return memberIds.map((memberId, i) => ({ memberId, amount: Math.floor(amount / memberIds.length) + (i < amount % memberIds.length ? 1 : 0) }));
}
export function mixedSplit(amount, equalMemberIds, personalItems, ids) {
  const total=minor(amount);
  ensure(Array.isArray(personalItems)&&personalItems.length>=1&&personalItems.length<=40,'請新增 1–40 筆個人項目');
  const items=personalItems.map(item=>{
    ensure(item&&typeof item==='object'&&typeof item.memberId==='string','個人項目的旅伴無效');
    if(ids)ensure(ids.has(item.memberId),'個人項目的旅伴無效');
    return {name:label(item.name,40),memberId:item.memberId,amount:minor(item.amount)};
  });
  const personalTotal=items.reduce((sum,item)=>sum+item.amount,0);
  ensure(personalTotal>0&&personalTotal<total,'個人項目合計須小於支出總額，保留可平均分攤的金額');
  const equal=evenShares(total-personalTotal,equalMemberIds);
  if(ids)ensure(equal.every(share=>ids.has(share.memberId)),'平均分攤旅伴無效');
  const amounts=new Map(equal.map(share=>[share.memberId,share.amount]));
  for(const item of items)amounts.set(item.memberId,(amounts.get(item.memberId)??0)+item.amount);
  return {equalMemberIds:[...equalMemberIds],personalItems:items,shares:[...amounts].map(([memberId,amount])=>({memberId,amount}))};
}
// Positive balance is receivable: paid - share + confirmed sent - confirmed received.
export function balanceBreakdown(trip) {
  const detail=Object.fromEntries(trip.members.map(m=>[m.id,{paid:0,share:0,sent:0,received:0,balance:0}]));
  for(const e of trip.expenses.filter(e=>!e.voided)) {
    for(const p of e.payments??[{memberId:e.payerId,amount:e.amount}])detail[p.memberId].paid+=p.amount;
    for(const s of e.shares)detail[s.memberId].share+=s.amount;
  }
  for(const r of trip.repayments.filter(r=>!r.voided&&(!r.status||r.status==='confirmed'))) {
    detail[r.fromId].sent+=r.amount;
    detail[r.toId].received+=r.amount;
  }
  for(const value of Object.values(detail))value.balance=value.paid-value.share+value.sent-value.received;
  return detail;
}
export function balances(trip) {
  return Object.fromEntries(Object.entries(balanceBreakdown(trip)).map(([id,value])=>[id,value.balance]));
}
// Match debtors and creditors in saved member order; this is deterministic, not a global minimum-transfer search.
export function settlementSteps(trip) {
  const b = balances(trip), debt = Object.entries(b).filter(([,v]) => v < 0).map(([id,v])=>({id,amount:-v})), credit = Object.entries(b).filter(([,v])=>v > 0).map(([id,v])=>({id,amount:v}));
  const result = []; let i=0,j=0;
  while (i<debt.length && j<credit.length) {
    const fromBefore=debt[i].amount,toBefore=credit[j].amount,amount=Math.min(fromBefore,toBefore);
    const fromAfter=fromBefore-amount,toAfter=toBefore-amount;
    result.push({fromId:debt[i].id,toId:credit[j].id,amount,fromBefore,toBefore,fromAfter,toAfter});
    debt[i].amount=fromAfter;credit[j].amount=toAfter;
    if(!fromAfter)i++;if(!toAfter)j++;
  }
  return result;
}
export function suggestions(trip) {
  return settlementSteps(trip).map(({fromId,toId,amount})=>({fromId,toId,amount}));
}
function day(value) { ensure(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value, '日期無效'); return value; }
function timestamp(value) { ensure(typeof value==='string' && !isNaN(Date.parse(value)), '時間無效'); return value; }
function actorRef(value,actors) {if(value==null)return null;ensure(actors.has(uuid(value)),'操作人無效');return value;}
function validateTeam(source,memberIds) {
  const t=source??{enabled:false,actors:[],events:[]};ensure(typeof t.enabled==='boolean'&&Array.isArray(t.actors)&&t.actors.length<=100&&Array.isArray(t.events)&&t.events.length<=300,'成員歷史資料無效或已達上限');
  const actors=t.actors.map(a=>{ensure(['admin','editor','viewer'].includes(a.role)&&typeof a.active==='boolean','成員角色無效');ensure(a.participantId==null||memberIds.has(a.participantId),'成員綁定無效');return {id:uuid(a.id),name:label(a.name,80),role:a.role,participantId:a.participantId??null,active:a.active};});
  const ids=new Set(actors.map(a=>a.id));ensure(ids.size===actors.length,'操作人不可重複');
  const events=t.events.map(e=>{ensure(['enable','join','change','remove','leave','restore-owner'].includes(e.action)&&ids.has(e.targetId),'成員歷史無效');return {id:uuid(e.id),action:e.action,actorId:actorRef(e.actorId,ids),targetId:e.targetId,at:timestamp(e.at),detail:label(e.detail,180)};});
  ensure(new Set(events.map(e=>e.id)).size===events.length,'成員歷史識別碼重複');return {enabled:t.enabled,actors,events};
}
export function receiptMeta(value) {
  if (!value) return undefined;
  ensure(['image/jpeg','image/png','image/webp'].includes(value.mime), '收據僅接受 JPG、PNG 或 WebP');
  ensure(Number.isInteger(value.size) && value.size>0 && value.size<=LIMITS.receiptBytes && /^[a-f0-9]{64}$/.test(value.sha256), '收據資料無效');
  return {id:uuid(value.id),mime:value.mime,size:value.size,sha256:value.sha256};
}
export function normalizePayments(e, ids) {
  const payments=e.payments===undefined?[{memberId:e.payerId,amount:e.amount}]:e.payments;
  ensure(Array.isArray(payments)&&payments.length>0&&payments.length<=ids.size,'請新增 1 位以上且不重複的付款旅伴');
  const clean=payments.map(p=>{ensure(p&&ids.has(p.memberId),'付款旅伴無效');return {memberId:p.memberId,amount:minor(p.amount)};});
  ensure(new Set(clean.map(p=>p.memberId)).size===clean.length,'同一付款旅伴只能填寫一次');
  ensure(clean.reduce((sum,p)=>sum+p.amount,0)===minor(e.amount),'付款金額加總必須等於支出總額');
  if(e.payments!==undefined&&e.payerId!==undefined)ensure(clean.length===1&&clean[0].memberId===e.payerId,'新舊付款資料不一致');
  return clean.sort((a,b)=>a.memberId<b.memberId?-1:a.memberId>b.memberId?1:0);
}
function expenseFields(e, ids) {
  ensure(e && typeof e.voided==='boolean','支出紀錄狀態無效');
  const payments=normalizePayments(e,ids);
  ensure(Array.isArray(e.shares) && e.shares.length>0 && e.shares.length<=ids.size,'請選擇分攤旅伴');
  const shares=e.shares.map(s=>{ensure(ids.has(s.memberId),'分攤旅伴無效');return {memberId:s.memberId,amount:minor(s.amount,true)};});
  ensure(new Set(shares.map(s=>s.memberId)).size===shares.length && shares.reduce((s,x)=>s+x.amount,0)===minor(e.amount),'分攤加總必須等於支出金額');
  ensure(['餐飲','交通','住宿','購物','其他'].includes(e.category),'支出分類無效');
  // v1 saved shares but not the user's split mode. Never silently redistribute them.
  const splitMode=e.splitMode??'exact';ensure(['equal','exact','mixed'].includes(splitMode),'分攤方式無效');
  if(splitMode==='equal')ensure(JSON.stringify(shares)===JSON.stringify(evenShares(e.amount,shares.map(s=>s.memberId))),'平均分攤資料不符');
  const mixed=splitMode==='mixed'?mixedSplit(e.amount,e.equalMemberIds,e.personalItems,ids):null;
  if(mixed)ensure(JSON.stringify(shares)===JSON.stringify(mixed.shares),'個人項目與實際分攤金額不符');
  return {title:label(e.title),amount:e.amount,payments,shares,date:day(e.date),category:e.category,voided:e.voided,splitMode,...(mixed?{equalMemberIds:mixed.equalMemberIds,personalItems:mixed.personalItems}:{})};
}
function changeValue(action,value,ids) {
  if(action==='edit-expense'||action==='void-expense')return expenseFields(value,ids);
  if(action==='rename-trip')return label(value,60);
  if(action==='rename-member')return label(value,40);
  if(['add-participant','remove-participant','restore-participant'].includes(action))return value===null?null:memberSnapshot(value);
  if(action==='set-archived'){ensure(typeof value==='boolean','封存狀態無效');return value;}
  ensure(false,'歷史操作無效');
}
function memberSnapshot(value) {
  ensure(value&&typeof value==='object'&&typeof value.active==='boolean','旅伴狀態無效');
  return {id:uuid(value.id),name:label(value.name,40),active:value.active};
}
export function assertDocumentSize(trip) {
  // An archived trip must always have room for its unarchive event.
  ensure(new TextEncoder().encode(JSON.stringify(trip)).length<=(LIMITS.documentBytes-(trip.archived?512:0)),'旅程資料與歷史已達容量上限，請先備份並建立新旅程',413);
  return trip;
}
export function validateTrip(source) {
  ensure(source && typeof source==='object', '旅程資料無效');
  ensure(Object.hasOwn(CURRENCIES,source.currency), '不支援此幣別');
  ensure(Array.isArray(source.members) && source.members.length>=2 && source.members.length<=LIMITS.memberRecords,'每個旅程最多保留 100 位旅伴紀錄');
  const members=source.members.map(m=>{ensure(m&&typeof m==='object','旅伴資料無效');return memberSnapshot({...m,active:m.active??true});}), ids=new Set(members.map(m=>m.id));
  const activeCount=members.filter(m=>m.active).length;ensure(activeCount>=1&&activeCount<=LIMITS.members,'旅程須有 1–20 位可記帳旅伴');
  const team=validateTeam(source.team,ids),actorIds=new Set(team.actors.map(a=>a.id));
  ensure(ids.size===members.length && new Set(members.map(m=>m.name)).size===members.length,'旅伴不可重複');
  ensure(Array.isArray(source.expenses) && source.expenses.length<=LIMITS.expenses && Array.isArray(source.repayments) && source.repayments.length<=LIMITS.repayments, '已超過此內測版的旅程紀錄上限');
  const expenses=source.expenses.map(e=>({id:uuid(e.id),...expenseFields(e,ids),receipt:receiptMeta(e.receipt),createdBy:actorRef(e.createdBy,actorIds)}));
  const repayments=source.repayments.map(r=>{
    ensure(ids.has(r.fromId)&&ids.has(r.toId)&&r.fromId!==r.toId&&typeof r.voided==='boolean','還款對象或紀錄狀態無效');
    const status=r.status??'confirmed';ensure(['pending','confirmed','cancelled','rejected'].includes(status),'還款狀態無效');
    const events=(r.events??[]).map(e=>{ensure(['confirm','cancel','reject','void'].includes(e.action)&&typeof e.proxy==='boolean','還款歷史無效');return {id:uuid(e.id),action:e.action,actorId:actorRef(e.actorId,actorIds),at:timestamp(e.at),proxy:e.proxy};});
    ensure(events.length<=3&&new Set(events.map(e=>e.id)).size===events.length,'還款歷史無效');
    let state=r.initialStatus??(r.createdBy?'pending':'confirmed'),voided=false;ensure(['pending','confirmed'].includes(state),'還款初始狀態無效');
    for(const e of events){ensure(!voided,'作廢後不可再變更還款');if(e.action==='void'){ensure(state==='confirmed','只有已確認還款可作廢');voided=true;}else{ensure(state==='pending','還款狀態不可重複變更');state=e.action==='confirm'?'confirmed':e.action==='cancel'?'cancelled':'rejected';}}
    ensure(state===status&&(events.length?voided===r.voided:true),'還款歷史與狀態不符');ensure(status==='confirmed'||!r.voided,'待確認或取消還款不可標為作廢');
    return {id:uuid(r.id),fromId:r.fromId,toId:r.toId,amount:minor(r.amount),date:day(r.date),voided:r.voided,status,initialStatus:r.initialStatus??(r.createdBy?'pending':'confirmed'),createdBy:actorRef(r.createdBy,actorIds),events};
  });
  const allIds=[...members,...expenses,...repayments,...expenses.filter(e=>e.receipt).map(e=>e.receipt)].map(x=>x.id);
  ensure(new Set(allIds).size===allIds.length,'備份包含重複的資料識別碼');
  ensure(expenses.reduce((s,e)=>s+(e.receipt?.size??0),0)<=LIMITS.receiptTotal,'每個旅程的收據總量上限為 8 MB');
  const archived=source.archived??false;ensure(typeof archived==='boolean','封存狀態無效');
  const rawHistory=source.history??[];ensure(Array.isArray(rawHistory)&&rawHistory.length<=LIMITS.history,'更正與旅程歷史已達 300 筆上限，請先備份並建立新旅程');
  ensure(!archived||rawHistory.length<LIMITS.history,'封存前須保留解除封存的歷史容量');
  const history=rawHistory.map(h=>{
    ensure(h&&['edit-expense','void-expense','rename-trip','rename-member','add-participant','remove-participant','restore-participant','set-archived'].includes(h.action),'歷史操作無效');
    const targetId=uuid(h.targetId),expenseAction=h.action.endsWith('expense');
    const participantAction=['rename-member','add-participant','remove-participant','restore-participant'].includes(h.action);
    ensure(expenseAction?expenses.some(e=>e.id===targetId):participantAction?ids.has(targetId):targetId===source.id,'歷史對象無效');
    const before=changeValue(h.action,h.before,ids),after=changeValue(h.action,h.after,ids);
    if(expenseAction)ensure(!before.voided && after.voided===(h.action==='void-expense'),'歷史狀態無效');
    if(h.action==='void-expense')ensure(JSON.stringify({...before,voided:true})===JSON.stringify(after),'作廢歷史不應修改帳務');
    if(h.action==='add-participant')ensure(before===null&&after?.id===targetId&&after.active,'新增旅伴歷史無效');
    if(h.action==='remove-participant'||h.action==='restore-participant'){
      const removing=h.action==='remove-participant';
      ensure(before?.id===targetId&&after?.id===targetId&&before.name===after.name&&before.active===removing&&after.active!==removing,'旅伴停用或恢復歷史無效');
    }
    return {id:uuid(h.id),action:h.action,targetId,at:timestamp(h.at),before,after,actorId:actorRef(h.actorId,actorIds)};
  });
  ensure(new Set(history.map(h=>h.id)).size===history.length,'更正歷史識別碼不可重複');
  const latest=new Map(),memberStates=new Map();let historicalArchive=false;
  for(const h of history){
    ensure(!historicalArchive||h.action==='set-archived','封存期間不應有帳務更正');
    if(h.action==='set-archived'){ensure(h.before===historicalArchive,'封存歷史不連續');historicalArchive=h.after;}
    if(['rename-member','add-participant','remove-participant','restore-participant'].includes(h.action)){
      const previous=memberStates.get(h.targetId);
      if(h.action==='add-participant'){
        ensure(!previous,'同一旅伴識別碼不可再次新增');
        memberStates.set(h.targetId,h.after);
      }else if(h.action==='rename-member'){
        ensure(!previous||previous.name===h.before,'旅伴更名歷史不連續');
        memberStates.set(h.targetId,{id:h.targetId,name:h.after,active:previous?.active??true});
      }else{
        ensure(previous?JSON.stringify(previous)===JSON.stringify(h.before):h.action==='remove-participant','旅伴狀態歷史不連續');
        memberStates.set(h.targetId,h.after);
      }
      continue;
    }
    const key=h.action.endsWith('expense')?`expense:${h.targetId}`:h.action;
    const previous=latest.get(key);
    if(previous)ensure(JSON.stringify(previous.after)===JSON.stringify(h.before),'更正歷史不連續');
    latest.set(key,h);
  }
  ensure(historicalArchive===archived,'封存狀態與歷史不符');
  for(const h of latest.values()){
    const value=h.action.endsWith('expense')?expenseFields(expenses.find(e=>e.id===h.targetId),ids):h.action==='rename-trip'?label(source.name,60):archived;
    ensure(JSON.stringify(h.after)===JSON.stringify(value),'歷史與目前帳目不符');
  }
  for(const member of members){const state=memberStates.get(member.id);ensure(state?JSON.stringify(state)===JSON.stringify(member):member.active,'旅伴歷史與目前狀態不符');}
  return assertDocumentSize({id:uuid(source.id),name:label(source.name,60),currency:source.currency,createdAt:timestamp(source.createdAt),updatedAt:timestamp(source.updatedAt),archived,members,expenses,repayments,history,team});
}
export function newTrip(input) {
  const now=new Date().toISOString();
  ensure(Array.isArray(input.members),'請輸入旅伴');
  ensure(input.members.length>=2&&input.members.length<=LIMITS.members,'新旅程需要 2–20 位旅伴');
  return validateTrip({id:uuid(input.id),name:input.name,currency:input.currency,createdAt:now,updatedAt:now,members:input.members.map(name=>({id:crypto.randomUUID(),name,active:true})),expenses:[],repayments:[]});
}
function ensureExpenseParticipantsActive(trip,expense,original=null) {
  const usable=new Set(trip.members.filter(m=>m.active).map(m=>m.id));
  if(original)for(const id of [...original.payments.map(p=>p.memberId),...original.shares.map(s=>s.memberId)])usable.add(id);
  ensure([...expense.payments.map(p=>p.memberId),...expense.shares.map(s=>s.memberId)].every(id=>usable.has(id)),'已移除的旅伴不能加入新的支出；如需重新使用，請先恢復旅伴',409);
}
export function mutateTrip(trip, action, input, receipt, actorId=null) {
  if(isChangeRetry(trip,action,input))return trip;
  const next=validateTrip(trip); const id=uuid(input.id);
  ensure(!next.archived||action==='set-archived','旅程已封存，請先解除封存再修改',409);
  if(action==='expense') {
    if(next.expenses.some(e=>e.id===id)) return trip;
    ensure(['equal','exact','mixed'].includes(input.mode),'不支援的分攤方式');
    const ids=new Set(next.members.map(m=>m.id));
    const mixed=input.mode==='mixed'?mixedSplit(input.amount,input.memberIds,input.personalItems,ids):null;
    const record={id,title:input.title,amount:minor(input.amount),payments:normalizePayments(input,ids),shares:input.mode==='equal'?evenShares(input.amount,input.memberIds):mixed?mixed.shares:input.shares,date:input.date,category:input.category,voided:false,splitMode:input.mode,...(mixed?{equalMemberIds:mixed.equalMemberIds,personalItems:mixed.personalItems}:{}),receipt,createdBy:actorId};
    ensureExpenseParticipantsActive(next,expenseFields(record,new Set(next.members.map(m=>m.id))));
    next.expenses.push(record);
  } else if(action==='repayment') {
    if(next.repayments.some(r=>r.id===id)) return trip;
    const b=balances(trip); minor(input.amount);
    ensure(input.fromId!==input.toId && b[input.fromId]<0 && b[input.toId]>0 && input.amount<=Math.min(-b[input.fromId],b[input.toId]),'還款金額不可超過目前待結清金額');
    const status=next.team.enabled?'pending':'confirmed';
    const pending=next.repayments.filter(r=>r.status==='pending');
    ensure(input.amount<=Math.min(-b[input.fromId]-pending.filter(r=>r.fromId===input.fromId).reduce((n,r)=>n+r.amount,0),b[input.toId]-pending.filter(r=>r.toId===input.toId).reduce((n,r)=>n+r.amount,0)),'已有待確認還款，請先完成或取消');
    next.repayments.push({id,fromId:input.fromId,toId:input.toId,amount:input.amount,date:input.date,voided:false,status,initialStatus:status,createdBy:actorId,events:[]});
  } else if(['edit-expense','void-expense','rename-trip','rename-member','add-participant','remove-participant','restore-participant','set-archived'].includes(action)) {
    const ids=new Set(next.members.map(m=>m.id));let before;
    const after=desiredChange(next,action,input);
    if(action.endsWith('expense')){
      const record=next.expenses.find(e=>e.id===id);ensure(record,'找不到這筆紀錄',404);
      if(action==='void-expense'&&record.voided)return trip;
      ensure(!record.voided,'已作廢支出無法更正');before=expenseFields(record,ids);
      if(action==='edit-expense')ensureExpenseParticipantsActive(next,after,before);
      delete record.equalMemberIds;delete record.personalItems;
      Object.assign(record,after);
    }else if(action==='rename-member'){
      const member=next.members.find(m=>m.id===id);ensure(member,'找不到這位旅伴',404);
      ensure(!next.members.some(m=>m.id!==id&&m.name===after),'旅伴名稱不可重複');
      before=member.name;member.name=after;
    }else if(action==='add-participant'){
      ensure(next.members.filter(m=>m.active).length<LIMITS.members,'可記帳旅伴已達 20 人上限',409);
      ensure(next.members.length<LIMITS.memberRecords,'歷史旅伴紀錄已達 100 人上限',409);
      ensure(!next.members.some(m=>m.name===after.name),'旅伴名稱不可重複',409);
      const reserved=[next.id,input.operationId,...next.members.map(m=>m.id),...next.expenses.flatMap(e=>[e.id,e.receipt?.id]),...next.repayments.map(r=>r.id),...next.history.flatMap(h=>[h.id,h.targetId]),...next.team.actors.map(a=>a.id),...next.team.events.map(e=>e.id)];
      ensure(reserved.filter(value=>value===id).length===0,'資料識別碼已使用',409);
      before=null;next.members.push(after);
    }else if(action==='remove-participant'||action==='restore-participant'){
      const member=next.members.find(m=>m.id===id);ensure(member,'找不到這位旅伴',404);
      const removing=action==='remove-participant';
      ensure(member.active===removing,removing?'旅伴已移除，請重新整理':'旅伴已恢復，請重新整理',409);
      if(removing)ensure(next.members.filter(m=>m.active).length>1,'旅程至少要保留 1 位可記帳旅伴',409);
      else ensure(next.members.filter(m=>m.active).length<LIMITS.members,'可記帳旅伴已達 20 人上限',409);
      before={...member};member.active=!removing;
    }else{ensure(id===next.id,'旅程識別碼不符');before=action==='rename-trip'?next.name:next.archived;if(action==='rename-trip')next.name=after;else next.archived=after;}
    if(JSON.stringify(before)===JSON.stringify(after))return trip;
    next.history.push({id:uuid(input.operationId??(action==='void-expense'?crypto.randomUUID():undefined)),action,targetId:id,at:new Date().toISOString(),before,after,actorId});
  } else if(['confirm-repayment','cancel-repayment','reject-repayment','void-repayment'].includes(action)) {
    const record=next.repayments.find(e=>e.id===id);ensure(record,'找不到這筆紀錄',404);
    const change=action.split('-')[0];if(change==='void'&&record.voided)return trip;
    if(change==='void'){ensure(record.status==='confirmed','只有已確認還款可作廢');record.voided=true;}
    // Confirmation records actual money received. Later expense corrections may legitimately reverse debt.
    else{ensure(record.status==='pending','這筆還款已處理，請重新整理',409);record.status=change==='confirm'?'confirmed':change==='cancel'?'cancelled':'rejected';}
    record.events.push({id:uuid(input.operationId??crypto.randomUUID()),action:change,actorId,at:new Date().toISOString(),proxy:!!input.proxy});
  } else throw new AppError('不支援的操作',404);
  next.updatedAt=new Date().toISOString();return validateTrip(next);
}
function desiredChange(trip,action,input) {
  const ids=new Set(trip.members.map(m=>m.id));
  if(action==='edit-expense'){
    ensure(['equal','exact','mixed'].includes(input.mode),'不支援的分攤方式');
    const mixed=input.mode==='mixed'?mixedSplit(input.amount,input.memberIds,input.personalItems,ids):null;
    return expenseFields({...input,splitMode:input.mode,voided:false,shares:input.mode==='equal'?evenShares(input.amount,input.memberIds):mixed?mixed.shares:input.shares,...(mixed?{equalMemberIds:mixed.equalMemberIds,personalItems:mixed.personalItems}:{})},ids);
  }
  if(action==='void-expense'){const e=trip.expenses.find(e=>e.id===input.id);ensure(e,'找不到這筆紀錄',404);return expenseFields({...e,voided:true},ids);}
  if(action==='add-participant')return memberSnapshot({id:input.id,name:input.name,active:true});
  if(action==='remove-participant'||action==='restore-participant'){
    const member=trip.members.find(m=>m.id===input.id);ensure(member,'找不到這位旅伴',404);
    return {...member,active:action==='restore-participant'};
  }
  return changeValue(action,['rename-trip','rename-member'].includes(action)?input.name:input.archived,ids);
}
export function isChangeRetry(trip,action,input) {
  if(!input.operationId)return false;
  uuid(input.operationId);const previous=(trip.history??[]).find(h=>h.id===input.operationId);if(!previous)return false;
  ensure(previous.action===action&&previous.targetId===input.id,'操作識別碼已使用',409);
  if(action==='remove-participant'||action==='restore-participant')return true;
  ensure(JSON.stringify(previous.after)===JSON.stringify(desiredChange(trip,action,input)),'同一操作識別碼不可送出不同內容',409);return true;
}
