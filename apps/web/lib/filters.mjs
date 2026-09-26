// Filtering affects the list only; balances always use the full trip.
export function filterExpenses(trip,{query='',category='all',status='all',from='',to=''}={}) {
  const needle=query.trim().toLocaleLowerCase('zh-TW');
  return [...trip.expenses].reverse().filter(e=>{
    const payer=(e.payments??[{memberId:e.payerId}]).map(p=>trip.members.find(m=>m.id===p.memberId)?.name??'').join(' ');
    return (!needle||`${e.title} ${payer}`.toLocaleLowerCase('zh-TW').includes(needle)) &&
      (category==='all'||e.category===category) && (!from||e.date>=from) && (!to||e.date<=to) &&
      (status==='all'||status==='active'&&!e.voided||status==='voided'&&e.voided||status==='edited'&&(trip.history??[]).some(h=>h.targetId===e.id&&h.action==='edit-expense'));
  });
}
