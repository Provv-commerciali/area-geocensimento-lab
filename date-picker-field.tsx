"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type Props={name:string;label:string;defaultValue?:string;required?:boolean;help?:string};
const weekdays=["Lu","Ma","Me","Gi","Ve","Sa","Do"];
const iso=(year:number,month:number,day:number)=>`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
const parse=(value?:string)=>{const match=value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]))):new Date()};
const format=(value:string)=>new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"long",year:"numeric",timeZone:"UTC"}).format(parse(value));

export function DatePickerField({name,label,defaultValue,required=false,help}:Props){
  const[selected,setSelected]=useState(defaultValue??"");const[open,setOpen]=useState(false);const initial=parse(defaultValue);const[year,setYear]=useState(initial.getUTCFullYear());const[month,setMonth]=useState(initial.getUTCMonth());
  const days=useMemo(()=>{const leading=(new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7;const count=new Date(Date.UTC(year,month+1,0)).getUTCDate();return [...Array.from({length:leading},()=>null),...Array.from({length:count},(_,index)=>index+1)]},[month,year]);
  const monthLabel=new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(year,month,1)));
  const move=(offset:number)=>{const next=new Date(Date.UTC(year,month+offset,1));setYear(next.getUTCFullYear());setMonth(next.getUTCMonth())};
  const choose=(day:number)=>{setSelected(iso(year,month,day));setOpen(false)};
  const today=()=>{const now=new Date();setYear(now.getFullYear());setMonth(now.getMonth());setSelected(iso(now.getFullYear(),now.getMonth(),now.getDate()));setOpen(false)};
  return <div className={`date-picker-field ${required?"required":""}`}><span className="field-label">{label}</span><input type="hidden" name={name} value={selected}/><div className={`date-picker-trigger ${selected?"selected":""}`}><input type="text" aria-label={label} placeholder="gg/mm/aaaa" value={selected?format(selected):""} required={required} readOnly onClick={()=>setOpen(value=>!value)}/><button type="button" aria-label={`Apri calendario ${label}`} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><CalendarDays size={18}/></button></div>{help&&<small>{help}</small>}{open&&<div className="date-picker-popover" role="dialog" aria-label={`Calendario ${label}`}><header><button type="button" aria-label="Mese precedente" onClick={()=>move(-1)}><strong><ChevronLeft/></strong></button><strong>{monthLabel}</strong><button type="button" aria-label="Mese successivo" onClick={()=>move(1)}><strong><ChevronRight/></strong></button></header><div className="date-picker-weekdays">{weekdays.map(day=><span key={day}>{day}</span>)}</div><div className="date-picker-days">{days.map((day,index)=>day?<button type="button" key={`${year}-${month}-${day}`} className={selected===iso(year,month,day)?"active":""} aria-label={format(iso(year,month,day))} onClick={()=>choose(day)}>{day}</button>:<span key={`blank-${index}`}/>)}</div><footer>{!required?<button type="button" onClick={()=>{setSelected("");setOpen(false)}}>Cancella</button>:<span/>}<button type="button" onClick={today}>Oggi</button></footer></div>}</div>;
}
