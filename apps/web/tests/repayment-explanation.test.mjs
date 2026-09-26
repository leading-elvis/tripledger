import test from 'node:test';
import assert from 'node:assert/strict';
import {balanceBreakdown,balances,newTrip,mutateTrip,settlementSteps,suggestions} from '../lib/domain.mjs';

const make=(names,currency='TWD')=>newTrip({id:crypto.randomUUID(),name:'還款計算說明',currency,members:names});
const date='2026-09-26';
const id=()=>crypto.randomUUID();

test('multi-payer mixed expense explains rounded shares and every suggested transfer',()=>{
  let trip=make(['甲','乙','丙']);
  const [a,b,c]=trip.members.map(member=>member.id);
  trip=mutateTrip(trip,'expense',{
    id:id(),title:'採買',amount:10001,payments:[{memberId:a,amount:6000},{memberId:b,amount:4001}],
    mode:'mixed',memberIds:[a,b,c],personalItems:[{name:'乙的個人物品',memberId:b,amount:1000}],
    category:'購物',date,
  });
  assert.deepEqual(balanceBreakdown(trip),{
    [a]:{paid:6000,share:3001,sent:0,received:0,balance:2999},
    [b]:{paid:4001,share:4000,sent:0,received:0,balance:1},
    [c]:{paid:0,share:3000,sent:0,received:0,balance:-3000},
  });
  assert.deepEqual(balances(trip),{[a]:2999,[b]:1,[c]:-3000});
  assert.deepEqual(settlementSteps(trip),[
    {fromId:c,toId:a,amount:2999,fromBefore:3000,toBefore:2999,fromAfter:1,toAfter:0},
    {fromId:c,toId:b,amount:1,fromBefore:1,toBefore:1,fromAfter:0,toAfter:0},
  ]);
  assert.deepEqual(suggestions(trip),settlementSteps(trip).map(({fromId,toId,amount})=>({fromId,toId,amount})));
});

test('only confirmed, non-void repayments affect the explanation; void expense removes its contribution',()=>{
  let trip=make(['甲','乙','丙']);
  const [a,b,c]=trip.members.map(member=>member.id);
  const expenseId=id();
  trip=mutateTrip(trip,'expense',{
    id:expenseId,title:'交通',amount:900,payments:[{memberId:a,amount:900}],
    mode:'equal',memberIds:[a,b,c],category:'交通',date,
  });
  const initial=balanceBreakdown(trip);
  trip={...trip,team:{...trip.team,enabled:true}};
  const repaymentId=id();
  trip=mutateTrip(trip,'repayment',{id:repaymentId,fromId:c,toId:a,amount:200,date});
  assert.equal(trip.repayments[0].status,'pending');
  assert.deepEqual(balanceBreakdown(trip),initial);
  trip=mutateTrip(trip,'confirm-repayment',{id:repaymentId,operationId:id()});
  assert.deepEqual(balanceBreakdown(trip)[a],{paid:900,share:300,sent:0,received:200,balance:400});
  assert.deepEqual(balanceBreakdown(trip)[c],{paid:0,share:300,sent:200,received:0,balance:-100});
  assert.deepEqual(settlementSteps(trip).map(({amount})=>amount),[300,100]);
  trip=mutateTrip(trip,'void-repayment',{id:repaymentId,operationId:id()});
  assert.deepEqual(balanceBreakdown(trip),initial);
  trip=mutateTrip(trip,'void-expense',{id:expenseId,operationId:id()});
  assert.deepEqual(balances(trip),{[a]:0,[b]:0,[c]:0});
  assert.deepEqual(settlementSteps(trip),[]);
});

test('JPY remainder and legacy payer field use the same integer-unit breakdown',()=>{
  let trip=make(['甲','乙','丙'],'JPY');
  const [a,b,c]=trip.members.map(member=>member.id);
  trip=mutateTrip(trip,'expense',{
    id:id(),title:'晚餐',amount:101,payments:[{memberId:a,amount:101}],
    mode:'equal',memberIds:[a,b,c],category:'餐飲',date,
  });
  assert.deepEqual(balances(trip),{[a]:67,[b]:-34,[c]:-33});
  const legacy=structuredClone(trip);
  legacy.expenses[0].payerId=a;
  delete legacy.expenses[0].payments;
  assert.deepEqual(balanceBreakdown(legacy),balanceBreakdown(trip));
  assert.deepEqual(settlementSteps(legacy),settlementSteps(trip));
});

test('pairing steps retain member order and show each remaining amount',()=>{
  let trip=make(['欠六','欠十','欠四','收十甲','收十乙']);
  const [d1,d2,d3,c1,c2]=trip.members.map(member=>member.id);
  trip=mutateTrip(trip,'expense',{
    id:id(),title:'共同支出',amount:20,payments:[{memberId:c1,amount:10},{memberId:c2,amount:10}],
    mode:'exact',shares:[{memberId:d1,amount:6},{memberId:d2,amount:10},{memberId:d3,amount:4}],
    category:'其他',date,
  });
  assert.deepEqual(settlementSteps(trip),[
    {fromId:d1,toId:c1,amount:6,fromBefore:6,toBefore:10,fromAfter:0,toAfter:4},
    {fromId:d2,toId:c1,amount:4,fromBefore:10,toBefore:4,fromAfter:6,toAfter:0},
    {fromId:d2,toId:c2,amount:6,fromBefore:6,toBefore:10,fromAfter:0,toAfter:4},
    {fromId:d3,toId:c2,amount:4,fromBefore:4,toBefore:4,fromAfter:0,toAfter:0},
  ]);
});
