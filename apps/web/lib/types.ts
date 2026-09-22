export type Member = { id: string; name: string };
export type Receipt = { id: string; mime: string; size: number; sha256: string };
export type Expense = { id: string; title: string; amount: number; payerId: string; shares: {memberId:string;amount:number}[]; date: string; category: string; voided: boolean; splitMode?: 'equal'|'exact'; receipt?: Receipt };
export type ExpenseSnapshot = Omit<Expense,'id'|'receipt'>;
export type HistoryEntry = {id:string;at:string;targetId:string} & ({action:'edit-expense'|'void-expense';before:ExpenseSnapshot;after:ExpenseSnapshot}|{action:'rename-trip';before:string;after:string}|{action:'set-archived';before:boolean;after:boolean});
export type Repayment = { id: string; fromId: string; toId: string; amount: number; date: string; voided: boolean };
export type Trip = { id: string; name: string; currency: string; revision: number; archived:boolean;history:HistoryEntry[]; members: Member[]; expenses: Expense[]; repayments: Repayment[]; createdAt: string; updatedAt: string };
