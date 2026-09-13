"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, CheckCircle2, Clock3, Copy, FileText, GraduationCap, Search, ShieldCheck, XCircle } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { DEMO_ROSTER, getCodeTheme, getFormalDisplayName, getResolvedRank, type PublicRosterEntry } from "@/lib/roster";
import { daysBetween, getEffectivePromotionRequirement, getPromotionRequirement } from "@/lib/promotions";

type CardPayload = PublicRosterEntry & {
  operations_reports?: number;
  area_officer_reports?: number;
  officer_reports?: number;
  duty_officer_reports?: number;
  attendance_hours?: number;
  courses?: string[];
  half_requirements?: boolean;
  operations_discount?: number;
  area_officer_discount?: number;
  officer_discount?: number;
  duty_officer_discount?: number;
};

const DEMO_SUMMARY = { operations_reports: 31, area_officer_reports: 12, officer_reports: 0, duty_officer_reports: 0, attendance_hours: 96, courses: ["دورة العمليات", "دورة المساندة والمهام", "دورة الدعم الجوي"], half_requirements: true, operations_discount: 2, area_officer_discount: 0, officer_discount: 0, duty_officer_discount: 0 };

export default function PersonnelCardLookupPage(){
  const configured=isSupabaseConfigured();
  const [query,setQuery]=useState("");
  const [card,setCard]=useState<CardPayload|null>(null);
  const [loading,setLoading]=useState(false);
  const [searched,setSearched]=useState(false);
  const [copied,setCopied]=useState(false);

  async function searchCard(){
    const value=query.trim(); if(!value)return;
    setLoading(true); setSearched(true); setCard(null);
    const s=getSupabase();
    if(!s){
      const row=DEMO_ROSTER.find(r=>r.copy_id===value||r.discord_id===value)??DEMO_ROSTER.find(r=>r.member_type==="sector_member")!;
      setTimeout(()=>{setCard({...row,...DEMO_SUMMARY});setLoading(false)},250);return;
    }
    const {data,error}=await s.rpc("search_personnel_card",{p_search:value});
    if(!error&&Array.isArray(data)&&data[0]) setCard(data[0] as CardPayload);
    setLoading(false);
  }

  const rank=card?getResolvedRank(card):null;
  const baseRequirement=getPromotionRequirement(rank);
  const requirement=getEffectivePromotionRequirement(baseRequirement,{
    halfRequirements:card?.half_requirements,
    operationsDiscount:card?.operations_discount,
    areaOfficerDiscount:card?.area_officer_discount,
    officerDiscount:card?.officer_discount,
    dutyOfficerDiscount:card?.duty_officer_discount,
  });
  const theme=card?getCodeTheme(card.member_type,card.job_code):null;
  const days=card?daysBetween(card.hired_at||card.created_at):0;
  const checks=useMemo<[string,number,number,string][]>(()=>{
    if(!card||!requirement)return [];
    const values:Array<[string,number,number,string]|null>=[
      ["مدة الرتبة",days,requirement.minimumDays,"يوم"],
      ["ساعات التواجد",Number(card.attendance_hours||0),requirement.minimumHours,"ساعة"],
      requirement.operationsReports?["تقارير عمليات",Number(card.operations_reports||0),requirement.operationsReports,"تقرير"]:null,
      requirement.areaOfficerReports?["تقارير ضابط منطقة",Number(card.area_officer_reports||0),requirement.areaOfficerReports,"تقرير"]:null,
      requirement.officerReports?["تقارير ضباط",Number(card.officer_reports||0),requirement.officerReports,"تقرير"]:null,
      requirement.dutyOfficerReports?["تقارير ضابط خفر",Number(card.duty_officer_reports||0),requirement.dutyOfficerReports,"تقرير"]:null,
    ];
    return values.filter((x):x is [string,number,number,string]=>Boolean(x));
  },[card,requirement,days]);
  const coursesReady=Boolean(card&&requirement&&requirement.requiredCourses.every(req=>req==="جميع الدورات"||req==="اجتياز جميع الدورات"||(card.courses||[]).includes(req)));
  const ready=Boolean(requirement&&checks.every(([,v,t])=>v>=t)&&coursesReady);

  return <main className="min-h-screen"><Navbar/><div className="mx-auto max-w-[1180px] px-4 pb-16 pt-32 sm:px-6 lg:px-8">
    <header className="text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(213,166,116,.22)] bg-[rgba(213,166,116,.06)]"><BadgeCheck className="bronze-text" size={27}/></span><h1 className="mt-5 text-4xl font-black sm:text-5xl">بطاقتي في القطاع</h1><p className="mt-3 text-sm text-zinc-600">ألصق معرّف الديسكورد أو كوبي آي دي لعرض بطاقتك فقط. سجل الأفراد الكامل داخلي وغير متاح للعامة.</p></header>
    <section className="mx-auto mt-8 grid max-w-[900px] gap-3 rounded-[26px] border border-white/[.08] bg-white/[.02] p-4 sm:grid-cols-[1fr_auto]"><div className="relative"><Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700"/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchCard()} dir="ltr" className="ds-input py-4 pr-11 text-left" placeholder="معرّف الديسكورد أو كوبي آي دي"/></div><button onClick={searchCard} disabled={loading||!query.trim()} className="rounded-[18px] bg-[#d5a674] px-7 py-4 font-black text-[#17110d] disabled:opacity-40">{loading?"جارٍ البحث...":"عرض بطاقتي"}</button></section>
    {!configured&&<p className="mt-3 text-center text-[10px] font-bold text-zinc-700">وضع المعاينة: جرّب 741060063740821594 أو 101.</p>}

    {searched&&!loading&&!card&&<div className="mx-auto mt-8 max-w-[900px] rounded-[24px] border border-white/[.07] p-10 text-center text-zinc-600"><XCircle className="mx-auto" size={26}/><p className="mt-3 font-black">ما لقينا بطاقة مطابقة</p></div>}
    {card&&<article className="mt-8 overflow-hidden rounded-[34px] border bg-[linear-gradient(145deg,rgba(42,25,18,.52),rgba(11,11,11,.96)_45%)] p-5 shadow-2xl sm:p-8" style={{borderColor:theme?.border}}>
      <div className="flex flex-col gap-5 border-b border-white/[.07] pb-6 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-[21px] border text-2xl font-black" style={{borderColor:theme?.border,background:theme?.soft,color:theme?.color}}>{rank?.includes("فريق")?"★":"أد"}</span><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-[10px] font-black text-emerald-400">على رأس العمل</span>{requirement&&<span className="rounded-full border border-[rgba(213,166,116,.2)] bg-[rgba(213,166,116,.07)] px-3 py-1 text-[10px] font-black bronze-text">الترقية القادمة: {requirement.targetRank}</span>}</div><h2 className="mt-3 text-3xl font-black sm:text-4xl">{getFormalDisplayName(card)}</h2><p className="mt-2 text-sm font-black" style={{color:theme?.color}}>{card.title||"قوات الأمن الدبلوماسي"}</p></div></div><button onClick={()=>{navigator.clipboard.writeText(card.job_code||"");setCopied(true);setTimeout(()=>setCopied(false),1200)}} className="inline-flex items-center gap-2 rounded-[16px] border px-4 py-3 font-mono text-sm font-black" style={{borderColor:theme?.border,background:theme?.soft,color:theme?.color}} dir="ltr">{card.job_code||"—"}<Copy size={15}/>{copied&&<span className="font-sans text-[9px]">تم</span>}</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={FileText} label="تقارير عمليات" value={card.operations_reports||0}/><Stat icon={ShieldCheck} label="تقارير ضابط منطقة" value={card.area_officer_reports||0}/><Stat icon={Clock3} label="ساعات التواجد" value={`${Number(card.attendance_hours||0)} س`}/><Stat icon={CalendarDays} label="تاريخ التعيين" value={(card.hired_at||card.created_at||"—").slice(0,10)}/></div>
      {requirement?<section className="mt-5 rounded-[24px] border border-white/[.07] bg-black/25 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black bronze-text">استحقاق الترقية حسب رتبتك</p><h3 className="mt-1 text-xl font-black">{rank} ← {requirement.targetRank}</h3></div><span className={`rounded-full px-3 py-2 text-[10px] font-black ${ready?"bg-emerald-500/10 text-emerald-400":"bg-[#7d2e27]/15 text-[#d18a7f]"}`}>{ready?"مستوفٍ مبدئيًا":"غير مكتمل"}</span></div>
        {requirement.adjustmentLabels.length>0&&<div className="mt-4 rounded-[18px] border border-[rgba(213,166,116,.18)] bg-[rgba(213,166,116,.055)] p-4"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black bronze-text">تسهيلات معتمدة:</span>{requirement.adjustmentLabels.map(label=><span key={label} className="rounded-full border border-[rgba(213,166,116,.18)] bg-black/20 px-3 py-1 text-[10px] font-black text-[#e6bc8a]">{label}</span>)}</div><p className="mt-2 text-[10px] text-zinc-600">تطبق على الشروط الرقمية فقط، بينما الدورات والاعتمادات الخاصة تبقى مطلوبة.</p></div>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{checks.map(([label,value,target,unit])=>{const original=label==="مدة الرتبة"?requirement.original.minimumDays:label==="ساعات التواجد"?requirement.original.minimumHours:label==="تقارير عمليات"?(requirement.original.operationsReports||target):label==="تقارير ضابط منطقة"?(requirement.original.areaOfficerReports||target):label==="تقارير ضباط"?(requirement.original.officerReports||target):(requirement.original.dutyOfficerReports||target);return <Requirement key={label} label={label} value={value} target={target} originalTarget={original} unit={unit}/>})}</div>
        <div className="mt-3 rounded-[18px] border border-white/[.06] bg-white/[.018] p-4"><div className="flex items-center gap-2"><GraduationCap size={16} className="bronze-text"/><p className="text-xs font-black text-zinc-300">الدورات المطلوبة</p></div><div className="mt-3 flex flex-wrap gap-2">{requirement.requiredCourses.map(c=>{const done=c==="جميع الدورات"||c==="اجتياز جميع الدورات"?false:(card.courses||[]).includes(c);return <span key={c} className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${done?"border-emerald-500/20 bg-emerald-500/8 text-emerald-400":"border-white/[.07] text-zinc-600"}`}>{done&&<CheckCircle2 size={11} className="ml-1 inline"/>}{c}</span>})}</div>{requirement.specialCondition&&<p className="mt-3 text-[10px] text-zinc-600">{requirement.specialCondition}</p>}</div>
      </section>:<div className="mt-5 rounded-[20px] border border-white/[.06] p-5 text-sm text-zinc-600">لا توجد ترقية أعلى مبرمجة لهذه الرتبة حاليًا.</div>}
      <div className="mt-5 rounded-[18px] border border-white/[.06] bg-black/20 px-5 py-4 text-center text-[10px] text-zinc-700">بطاقة عرض فقط — لا توجد صلاحية تعديل من هذه الصفحة.</div>
    </article>}
  </div><Footer/></main>
}
function Stat({icon:Icon,label,value}:{icon:any;label:string;value:any}){return <div className="rounded-[19px] border border-white/[.065] bg-black/20 p-4"><Icon size={16} className="text-zinc-600"/><p className="mt-3 text-[9px] font-black text-zinc-700">{label}</p><p className="mt-1 text-lg font-black text-zinc-200">{value}</p></div>}
function Requirement({label,value,target,originalTarget,unit}:{label:string;value:number;target:number;originalTarget?:number;unit:string}){const pct=Math.min(100,Math.round(value/Math.max(1,target)*100));const done=value>=target;const reduced=originalTarget!=null&&originalTarget!==target;return <div className="rounded-[18px] border border-white/[.055] bg-white/[.015] p-4"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-black text-zinc-400">{label}</p>{reduced&&<p className="mt-1 text-[9px] text-zinc-700">الأصل {originalTarget} → المعتمد {target}</p>}</div><span className={`text-[10px] font-black ${done?"text-emerald-400":"bronze-text"}`}>{value} / {target} {unit}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40"><div className={`h-full rounded-full ${done?"bg-emerald-500":"bg-[linear-gradient(90deg,#754a2d,#d5a674)]"}`} style={{width:`${pct}%`}}/></div></div>}
