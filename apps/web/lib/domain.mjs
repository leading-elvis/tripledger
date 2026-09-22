// Pure money/domain code shared by Workers, the browser and independent Node hosting.
export const CURRENCIES = { TWD: 2, USD: 2, JPY: 0, EUR: 2, HKD: 2 };
export const LIMITS = { members: 20, expenses: 300, repayments: 200, history: 300, documentBytes: 1048576, receiptBytes: 1048576, receiptTotal: 8388608, bodyBytes: 14680064 };
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
export function balances(trip) {
  const values = Object.fromEntries(trip.members.map(m => [m.id, 0]));
  for (const e of trip.expenses.filter(e => !e.voided)) { values[e.payerId] += e.amount; for (const s of e.shares) values[s.memberId] -= s.amount; }
  for (const r of trip.repayments.filter(r => !r.voided)) { values[r.fromId] += r.amount; values[r.toId] -= r.amount; }
  return values;
}
export function suggestions(trip) {
  const b = balances(trip), debt = Object.entries(b).filter(([,v]) => v < 0).map(([id,v])=>({id,amount:-v})), credit = Object.entries(b).filter(([,v])=>v > 0).map(([id,v])=>({id,amount:v}));
  const result = []; let i=0,j=0;
  while (i<debt.length && j<credit.length) { const amount=Math.min(debt[i].amount,credit[j].amount); result.push({fromId:debt[i].id,toId:credit[j].id,amount}); debt[i].amount-=amount;credit[j].amount-=amount;if(!debt[i].amount)i++;if(!credit[j].amount)j++; }
  return result;
}
function day(value) { ensure(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value, '日期無效'); return value; }
function timestamp(value) { ensure(typeof value==='string' && !isNaN(Date.parse(value)), '時間無效'); return value; }
export function receiptMeta(value) {
  if (!value) return undefined;
  ensure(['image/jpeg','image/png','image/webp'].includes(value.mime), '收據僅接受 JPG、PNG 或 WebP');
  ensure(Number.isInteger(value.size) && value.size>0 && value.size<=LIMITS.receiptBytes && /^[a-f0-9]{64}$/.test(value.sha256), '收據資料無效');
  return {id:uuid(value.id),mime:value.mime,size:value.size,sha256:value.sha256};
}
function expenseFields(e, ids) {
  ensure(e && ids.has(e.payerId) && typeof e.voided==='boolean','付款旅伴或紀錄狀態無效');
  ensure(Array.isArray(e.shares) && e.shares.length>0 && e.shares.length<=ids.size,'請選擇分攤旅伴');
  const shares=e.shares.map(s=>{ensure(ids.has(s.memberId),'分攤旅伴無效');return {memberId:s.memberId,amount:minor(s.amount,true)};});
  ensure(new Set(shares.map(s=>s.memberId)).size===shares.length && shares.reduce((s,x)=>s+x.amount,0)===minor(e.amount),'分攤加總必須等於支出金額');
  ensure(['餐飲','交通','住宿','購物','其他'].includes(e.category),'支出分類無效');
  // v1 saved shares but not the user's split mode. Never silently redistribute them.
  const splitMode=e.splitMode??'exact';ensure(['equal','exact'].includes(splitMode),'分攤方式無效');
  if(splitMode==='equal')ensure(JSON.stringify(shares)===JSON.stringify(evenShares(e.amount,shares.map(s=>s.memberId))),'平均分攤資料不符');
  return {title:label(e.title),amount:e.amount,payerId:e.payerId,shares,date:day(e.date),category:e.category,voided:e.voided,splitMode};
}
function changeValue(action,value,ids) {
  if(action==='edit-expense'||action==='void-expense')return expenseFields(value,ids);
  if(action==='rename-trip')return label(value,60);
  if(action==='set-archived'){ensure(typeof value==='boolean','封存狀態無效');return value;}
  ensure(false,'歷史操作無效');
}
export function assertDocumentSize(trip) {
  // An archived trip must always have room for its unarchive event.
  ensure(new TextEncoder().encode(JSON.stringify(trip)).length<=(LIMITS.documentBytes-(trip.archived?512:0)),'旅程資料與歷史已達容量上限，請先備份並建立新旅程',413);
  return trip;
}
export function validateTrip(source) {
  ensure(source && typeof source==='object', '旅程資料無效');
  ensure(Object.hasOwn(CURRENCIES,source.currency), '不支援此幣別');
  ensure(Array.isArray(source.members) && source.members.length>=2 && source.members.length<=LIMITS.members,'每個旅程需要 2–20 位旅伴');
  const members=source.members.map(m=>({id:uuid(m.id),name:label(m.name,40)})), ids=new Set(members.map(m=>m.id));
  ensure(ids.size===members.length && new Set(members.map(m=>m.name)).size===members.length,'旅伴不可重複');
  ensure(Array.isArray(source.expenses) && source.expenses.length<=LIMITS.expenses && Array.isArray(source.repayments) && source.repayments.length<=LIMITS.repayments, '已超過此內測版的旅程紀錄上限');
  const expenses=source.expenses.map(e=>({id:uuid(e.id),...expenseFields(e,ids),receipt:receiptMeta(e.receipt)}));
  const repayments=source.repayments.map(r=>{ensure(ids.has(r.fromId)&&ids.has(r.toId)&&r.fromId!==r.toId&&typeof r.voided==='boolean','還款對象或紀錄狀態無效');return {id:uuid(r.id),fromId:r.fromId,toId:r.toId,amount:minor(r.amount),date:day(r.date),voided:r.voided};});
  const allIds=[...members,...expenses,...repayments,...expenses.filter(e=>e.receipt).map(e=>e.receipt)].map(x=>x.id);
  ensure(new Set(allIds).size===allIds.length,'備份包含重複的資料識別碼');
  ensure(expenses.reduce((s,e)=>s+(e.receipt?.size??0),0)<=LIMITS.receiptTotal,'每個旅程的收據總量上限為 8 MB');
  const archived=source.archived??false;ensure(typeof archived==='boolean','封存狀態無效');
  const rawHistory=source.history??[];ensure(Array.isArray(rawHistory)&&rawHistory.length<=LIMITS.history,'更正與旅程歷史已達 300 筆上限，請先備份並建立新旅程');
  ensure(!archived||rawHistory.length<LIMITS.history,'封存前須保留解除封存的歷史容量');
  const history=rawHistory.map(h=>{
    ensure(h&&['edit-expense','void-expense','rename-trip','set-archived'].includes(h.action),'歷史操作無效');
    const targetId=uuid(h.targetId),expenseAction=h.action.endsWith('expense');
    ensure(expenseAction?expenses.some(e=>e.id===targetId):targetId===source.id,'歷史對象無效');
    const before=changeValue(h.action,h.before,ids),after=changeValue(h.action,h.after,ids);
    if(expenseAction)ensure(!before.voided && after.voided===(h.action==='void-expense'),'歷史狀態無效');
    if(h.action==='void-expense')ensure(JSON.stringify({...before,voided:true})===JSON.stringify(after),'作廢歷史不應修改帳務');
    return {id:uuid(h.id),action:h.action,targetId,at:timestamp(h.at),before,after};
  });
  ensure(new Set(history.map(h=>h.id)).size===history.length,'更正歷史識別碼不可重複');
  const latest=new Map();let historicalArchive=false;
  for(const h of history){
    ensure(!historicalArchive||h.action==='set-archived','封存期間不應有帳務更正');
    if(h.action==='set-archived'){ensure(h.before===historicalArchive,'封存歷史不連續');historicalArchive=h.after;}
    const key=h.action.endsWith('expense')?h.targetId:h.action;const previous=latest.get(key);if(previous)ensure(JSON.stringify(previous.after)===JSON.stringify(h.before),'更正歷史不連續');latest.set(key,h);
  }
  ensure(historicalArchive===archived,'封存狀態與歷史不符');
  for(const h of latest.values()){const value=h.action.endsWith('expense')?expenseFields(expenses.find(e=>e.id===h.targetId),ids):h.action==='rename-trip'?label(source.name,60):archived;ensure(JSON.stringify(h.after)===JSON.stringify(value),'歷史與目前帳目不符');}
  return assertDocumentSize({id:uuid(source.id),name:label(source.name,60),currency:source.currency,createdAt:timestamp(source.createdAt),updatedAt:timestamp(source.updatedAt),archived,members,expenses,repayments,history});
}
export function newTrip(input) {
  const now=new Date().toISOString();
  ensure(Array.isArray(input.members),'請輸入旅伴');
  return validateTrip({id:uuid(input.id),name:input.name,currency:input.currency,createdAt:now,updatedAt:now,members:input.members.map(name=>({id:crypto.randomUUID(),name})),expenses:[],repayments:[]});
}
export function mutateTrip(trip, action, input, receipt) {
  if(isChangeRetry(trip,action,input))return trip;
  const next=validateTrip(trip); const id=uuid(input.id);
  ensure(!next.archived||action==='set-archived','旅程已封存，請先解除封存再修改',409);
  if(action==='expense') {
    if(next.expenses.some(e=>e.id===id)) return trip;
    ensure(['equal','exact'].includes(input.mode),'不支援的分攤方式');
    next.expenses.push({id,title:input.title,amount:minor(input.amount),payerId:input.payerId,shares:input.mode==='equal'?evenShares(input.amount,input.memberIds):input.shares,date:input.date,category:input.category,voided:false,splitMode:input.mode,receipt});
  } else if(action==='repayment') {
    if(next.repayments.some(r=>r.id===id)) return trip;
    const b=balances(trip); minor(input.amount);
    ensure(input.fromId!==input.toId && b[input.fromId]<0 && b[input.toId]>0 && input.amount<=Math.min(-b[input.fromId],b[input.toId]),'還款金額不可超過目前待結清金額');
    next.repayments.push({id,fromId:input.fromId,toId:input.toId,amount:input.amount,date:input.date,voided:false});
  } else if(['edit-expense','void-expense','rename-trip','set-archived'].includes(action)) {
    const ids=new Set(next.members.map(m=>m.id));let before;
    const after=desiredChange(next,action,input);
    if(action.endsWith('expense')){
      const record=next.expenses.find(e=>e.id===id);ensure(record,'找不到這筆紀錄',404);
      if(action==='void-expense'&&record.voided)return trip;
      ensure(!record.voided,'已作廢支出無法更正');before=expenseFields(record,ids);Object.assign(record,after);
    }else{ensure(id===next.id,'旅程識別碼不符');before=action==='rename-trip'?next.name:next.archived;if(action==='rename-trip')next.name=after;else next.archived=after;}
    if(JSON.stringify(before)===JSON.stringify(after))return trip;
    next.history.push({id:uuid(input.operationId??(action==='void-expense'?crypto.randomUUID():undefined)),action,targetId:id,at:new Date().toISOString(),before,after});
  } else if(action==='void-repayment') {
    const record=next.repayments.find(e=>e.id===id);ensure(record,'找不到這筆紀錄',404);record.voided=true;
  } else throw new AppError('不支援的操作',404);
  next.updatedAt=new Date().toISOString();return validateTrip(next);
}
function desiredChange(trip,action,input) {
  const ids=new Set(trip.members.map(m=>m.id));
  if(action==='edit-expense'){
    ensure(['equal','exact'].includes(input.mode),'不支援的分攤方式');
    return expenseFields({...input,splitMode:input.mode,voided:false,shares:input.mode==='equal'?evenShares(input.amount,input.memberIds):input.shares},ids);
  }
  if(action==='void-expense'){const e=trip.expenses.find(e=>e.id===input.id);ensure(e,'找不到這筆紀錄',404);return expenseFields({...e,voided:true},ids);}
  return changeValue(action,action==='rename-trip'?input.name:input.archived,ids);
}
export function isChangeRetry(trip,action,input) {
  if(!input.operationId)return false;
  uuid(input.operationId);const previous=(trip.history??[]).find(h=>h.id===input.operationId);if(!previous)return false;
  ensure(previous.action===action&&previous.targetId===input.id,'操作識別碼已使用',409);
  ensure(JSON.stringify(previous.after)===JSON.stringify(desiredChange(trip,action,input)),'同一操作識別碼不可送出不同內容',409);return true;
}
