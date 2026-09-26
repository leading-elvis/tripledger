"use client";
import type { ReactNode } from "react";
import { MapPin, Utensils, TrainFront, BedDouble, ShoppingBag, Ellipsis } from "lucide-react";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export const today = () => { const date = new Date(); return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10); };
export const categories = { "餐飲":Utensils,"交通":TrainFront,"住宿":BedDouble,"購物":ShoppingBag,"其他":Ellipsis };
export function Choice({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void}) {
  return <div className="field"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="select-control"><SelectValue placeholder="請選擇"/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>;
}
export function Blank({icon=<MapPin size={30}/>,title,description,children}:{icon?:ReactNode;title:string;description:string;children?:ReactNode}) {
  return <Empty className="empty-state"><EmptyHeader><span className="empty-icon">{icon}</span><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>{children}</Empty>;
}
