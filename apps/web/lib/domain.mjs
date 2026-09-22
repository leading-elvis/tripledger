// Pure money/domain code shared by Workers, the browser and independent Node hosting.
export const CURRENCIES = { TWD: 2, USD: 2, JPY: 0, EUR: 2, HKD: 2 };
export const LIMITS = { members: 20, expenses: 300, repayments: 200, receiptBytes: 1048576, receiptTotal: 8388608, bodyBytes: 14680064 };
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
export function validateTrip(source) {
  ensure(source && typeof source==='object', '旅程資料無效');
  ensure(Object.hasOwn(CURRENCIES,source.currency), '不支援此幣別');
  ensure(Array.isArray(source.members) && source.members.length>=2 && source.members.length<=LIMITS.members,'每個旅程需要 2–20 位旅伴');
  const members=source.members.map(m=>({id:uuid(m.id),name:label(m.name,40)})), ids=new Set(members.map(m=>m.id));
  ensure(ids.size===members.length && new Set(members.map(m=>m.name)).size===members.length,'旅伴不可重複');
  ensure(Array.isArray(source.expenses) && source.expenses.length<=LIMITS.expenses && Array.isArray(source.repayments) && source.repayments.length<=LIMITS.repayments, '已超過此內測版的旅程紀錄上限');
  const expenses=source.expenses.map(e=>{
    ensure(ids.has(e.payerId) && typeof e.voided==='boolean','付款旅伴或紀錄狀態無效');
    ensure(Array.isArray(e.shares) && e.shares.length>0 && e.shares.length<=members.length,'請選擇分攤旅伴');
    const shares=e.shares.map(s=>{ensure(ids.has(s.memberId),'分攤旅伴無效');return {memberId:s.memberId,amount:minor(s.amount,true)};});
    ensure(new Set(shares.map(s=>s.memberId)).size===shares.length && shares.reduce((s,x)=>s+x.amount,0)===minor(e.amount),'分攤加總必須等於支出金額');
    ensure(['餐飲','交通','住宿','購物','其他'].includes(e.category),'支出分類無效');
    return {id:uuid(e.id),title:label(e.title),amount:e.amount,payerId:e.payerId,shares,date:day(e.date),category:e.category,voided:e.voided,receipt:receiptMeta(e.receipt)};
  });
  const repayments=source.repayments.map(r=>{ensure(ids.has(r.fromId)&&ids.has(r.toId)&&r.fromId!==r.toId&&typeof r.voided==='boolean','還款對象或紀錄狀態無效');return {id:uuid(r.id),fromId:r.fromId,toId:r.toId,amount:minor(r.amount),date:day(r.date),voided:r.voided};});
  const allIds=[...members,...expenses,...repayments,...expenses.filter(e=>e.receipt).map(e=>e.receipt)].map(x=>x.id);
  ensure(new Set(allIds).size===allIds.length,'備份包含重複的資料識別碼');
  ensure(expenses.reduce((s,e)=>s+(e.receipt?.size??0),0)<=LIMITS.receiptTotal,'每個旅程的收據總量上限為 8 MB');
  return {id:uuid(source.id),name:label(source.name,60),currency:source.currency,createdAt:timestamp(source.createdAt),updatedAt:timestamp(source.updatedAt),members,expenses,repayments};
}
export function newTrip(input) {
  const now=new Date().toISOString();
  ensure(Array.isArray(input.members),'請輸入旅伴');
  return validateTrip({id:uuid(input.id),name:input.name,currency:input.currency,createdAt:now,updatedAt:now,members:input.members.map(name=>({id:crypto.randomUUID(),name})),expenses:[],repayments:[]});
}
export function mutateTrip(trip, action, input, receipt) {
  const next=structuredClone(trip); const id=uuid(input.id);
  if(action==='expense') {
    if(next.expenses.some(e=>e.id===id)) return trip;
    ensure(['equal','exact'].includes(input.mode),'不支援的分攤方式');
    next.expenses.push({id,title:input.title,amount:minor(input.amount),payerId:input.payerId,shares:input.mode==='equal'?evenShares(input.amount,input.memberIds):input.shares,date:input.date,category:input.category,voided:false,receipt});
  } else if(action==='repayment') {
    if(next.repayments.some(r=>r.id===id)) return trip;
    const b=balances(trip); minor(input.amount);
    ensure(input.fromId!==input.toId && b[input.fromId]<0 && b[input.toId]>0 && input.amount<=Math.min(-b[input.fromId],b[input.toId]),'還款金額不可超過目前待結清金額');
    next.repayments.push({id,fromId:input.fromId,toId:input.toId,amount:input.amount,date:input.date,voided:false});
  } else if(action==='void-expense' || action==='void-repayment') {
    const collection=action==='void-expense'?next.expenses:next.repayments;
    const record=collection.find(e=>e.id===id);ensure(record,'找不到這筆紀錄',404);record.voided=true;
  } else throw new AppError('不支援的操作',404);
  next.updatedAt=new Date().toISOString();return validateTrip(next);
}
