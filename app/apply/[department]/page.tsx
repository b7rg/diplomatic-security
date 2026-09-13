"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, ClipboardCheck, ShieldCheck } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ApplicationForm from "@/components/application-form";
import { DepartmentIcon, DEPARTMENT_TONES } from "@/components/department-visual";
import { useOrganization } from "@/lib/use-organization";

export default function DepartmentApplyPage(){
  const params=useParams<{department:string}>();
  const key=Array.isArray(params.department)?params.department[0]:params.department;
  const {units,titles,loading}=useOrganization();
  const target=units.find(t=>t.key===key&&t.key!=="military-police"&&t.application_enabled&&t.active);
  if(loading)return <main className="min-h-screen"><Navbar/><div className="mx-auto max-w-4xl px-5 pt-40"><div className="glass rounded-[30px] p-10 text-center text-zinc-600">جارٍ تحميل بيانات الجهة...</div></div></main>;
  if(!target)return <main className="min-h-screen"><Navbar/><div className="mx-auto max-w-4xl px-5 pt-40"><div className="glass rounded-[30px] p-10 text-center"><h1 className="text-3xl font-black">الجهة غير متاحة للتقديم</h1><p className="mt-2 text-sm text-zinc-600">قد يكون التقديم عليها مغلقًا أو تم تغيير تقسيم القطاع.</p><Link href="/apply" className="mt-5 inline-flex rounded-full bg-[#d5a674] px-5 py-3 font-black text-black">العودة لمركز التقديم</Link></div></div></main>;
  const availableTitles=titles.filter(t=>t.unit_key===target.key&&t.active&&t.application_assignable).sort((a,b)=>a.sort_order-b.sort_order);
  const tone=DEPARTMENT_TONES[target.accent];
  return <main className="min-h-screen overflow-hidden"><Navbar/><div className="soft-grid pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-30"/>
    <div className="relative mx-auto max-w-[1480px] px-4 pb-14 pt-28 sm:px-6 md:pt-32 lg:px-8"><Link href="/apply" className="inline-flex items-center gap-2 text-xs font-black text-zinc-600 hover:text-[#d5a674]"><ArrowRight size={15}/> مركز التقديم</Link>
      <div className="mt-4 grid gap-4 xl:grid-cols-[.72fr_1.28fr]"><aside className="space-y-3"><section className={`overflow-hidden rounded-[30px] border ${tone.border} bg-[linear-gradient(145deg,rgba(22,22,21,.9),rgba(11,11,11,.86))] p-6`}><span className={`flex h-12 w-12 items-center justify-center rounded-[16px] border ${tone.border} ${tone.bg} ${tone.text}`}><DepartmentIcon iconKey={target.icon_key} size={22}/></span><p className={`mt-5 text-[10px] font-black ${tone.text}`}>التقديم على القسم</p><h1 className="mt-2 text-4xl font-black leading-tight">التقديم على<br/><span className={tone.text}>{target.name}</span></h1><p className="mt-4 text-sm leading-7 text-zinc-500">{target.description}</p></section>
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{availableTitles.map(role=><div key={role.id} className="flex items-center gap-3 rounded-[18px] border border-white/[.06] bg-white/[.014] p-3.5"><ShieldCheck size={15} className={tone.text}/><span className="text-xs font-black text-zinc-500">{role.name}</span></div>)}</section>
      <div className="rounded-[20px] border border-[rgba(127,155,140,.15)] bg-[rgba(127,155,140,.04)] p-4"><div className="flex gap-3"><ClipboardCheck size={17} className="mt-0.5 text-[#8da697]"/><p className="text-xs leading-6 text-zinc-600">القبول لا يمنح حسابًا أو صلاحية تلقائيًا. التسكين النهائي يتم من الحسابات باختيار القسم والمسمى المعتمد.</p></div></div></aside>
      <section className="glass rounded-[30px] p-5 sm:p-7"><div className="mb-5"><p className="section-kicker">نموذج التقديم</p><h2 className="mt-1 text-2xl font-black">بيانات المتقدم</h2></div><ApplicationForm targetKey={target.key} targetName={target.name}/></section></div>
    </div><Footer/></main>;
}
