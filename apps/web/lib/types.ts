export type Member = { id: string; name: string };
export type Receipt = { id: string; mime: string; size: number; sha256: string };
export type Expense = { id: string; title: string; amount: number; payerId: string; shares: {memberId:string;amount:number}[]; date: string; category: string; voided: boolean; receipt?: Receipt };
export type Repayment = { id: string; fromId: string; toId: string; amount: number; date: string; voided: boolean };
export type Trip = { id: string; name: string; currency: string; revision: number; members: Member[]; expenses: Expense[]; repayments: Repayment[]; createdAt: string; updatedAt: string };
