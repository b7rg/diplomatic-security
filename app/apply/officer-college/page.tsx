"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, GraduationCap, Sparkles } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ApplicationForm, { type ExtraAnswer } from "@/components/application-form";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Question={id:string;question:string;required:boolean;position:number};
const DEMO:Question[]=[
  {id:"q1",question:"ليش تبي تنضم لكلية الضباط الأمنية؟",required:true,position:1},
  {id:"q2",question:"وش المهارات القيادية اللي تشوف أنها تميزك؟ اذكر مثال.",required:true,position:2},
  {id:"q3",question:"كيف تتصرف لو استلمت مسؤولية فريق وحدث خلاف بين أفراده أثناء المهمة؟",required:true,position:3},
  {id:"q4",question:"وش يعني لك الانضباط العسكري؟ وكيف تثبته عمليًا؟",required:true,position:4},
  {id:"q5",question:"اذكر هدفك بعد التخرج من كلية الضباط الأمنية.",required:true,position:5},
];

export default function OfficerCollegeApplyPage(){
  const configured=isSupabaseConfigured();
  const [questions,setQuestions]=useState<Question[]>(configured?[]:DEMO);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  useEffect(()=>{if(!configured)return; const s=getSupabase(); if(!s)return; s.from("application_questions").select("id,question,required,position").eq("target_key","officer-college").eq("active",true).order("position").then(({data})=>setQuestions((data??[]) as Question[]));},[configured]);
  const extras:ExtraAnswer[]=useMemo(()=>questions.map(q=>({question_id:q.id,question:q.question,answer:answers[q.id]??""})),[questions,answers]);
  const complete=questions.filter(q=>q.required).every(q=>(answers[q.id]??"").trim().length>0);
  return <main className="min-h-screen overflow-hidden"><Navbar/><div className="soft-grid pointer-events-none fixed inset-x-0 top-0 h-[500px] opacity-30"/>
    <div className="relative mx-auto max-w-[1500px] px-4 pb-14 pt-28 sm:px-6 md:pt-32 lg:px-8"><Link href="/apply" className="inline-flex items-center gap-2 text-xs font-black text-zinc-600 hover:text-[#d5a674]"><ArrowRight size={15}/> مركز التقديم</Link>
      <header className="mt-4 glass-strong relative overflow-hidden rounded-[32px] p-6 sm:p-8"><div className="scan-line"/><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="inline-flex items-center gap-2 rounded-full border border-[rgba(213,166,116,.18)] bg-[rgba(213,166,116,.06)] px-3 py-2 text-[10px] font-black bronze-text"><Sparkles size={12}/> مسار قبول مستقل</div><p className="section-kicker mt-5">القبول في كلية الضباط</p><h1 className="display-title mt-2 text-4xl font-black md:text-6xl">كلية الضباط <span className="bronze-text">الأمنية</span></h1><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">طلب مستقل بأسئلة قبول رسمية. الأسئلة ليست ثابتة بالكود؛ رئاسة القبول تقدر تضيفها وتعدلها وتحذفها وترتبها من لوحة القيادة.</p></div><span className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-[rgba(213,166,116,.20)] bg-[rgba(213,166,116,.055)]"><GraduationCap size={42} className="bronze-text"/></span></div></header>
      <div className="mt-4 grid gap-4 xl:grid-cols-[.32fr_.68fr]"><aside className="space-y-3"><div className="glass rounded-[24px] p-5"><div className="flex items-center gap-3"><BookOpenCheck size={18} className="bronze-text"/><div><p className="text-sm font-black text-zinc-300">{questions.length} أسئلة قبول</p><p className="mt-1 text-xs text-zinc-600">تتحدث مباشرة عند تعديلها من الإدارة.</p></div></div></div><div className="rounded-[24px] border border-white/[.06] bg-white/[.014] p-5"><p className="text-[10px] font-black text-zinc-700">آلية الطلب</p><div className="mt-3 space-y-3">{["تعبئة البيانات العسكرية","الإجابة على أسئلة الكلية","مراجعة الطلب والإجابات","إصدار القرار النهائي"].map((v,i)=><div key={v} className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[.07] text-[9px] font-black bronze-text">0{i+1}</span><span className="text-xs font-bold text-zinc-600">{v}</span></div>)}</div></div></aside>
      <section className="glass rounded-[30px] p-5 sm:p-7"><ApplicationForm targetKey="officer-college" targetName="كلية الضباط الأمنية" extraAnswers={extras} onExtraChange={(id,value)=>setAnswers(v=>({...v,[id]:value}))} extraComplete={complete}/></section></div>
    </div><Footer/></main>;
}
