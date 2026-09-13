"use client";

import { useEffect, useState } from "react";
import { FileClock, ShieldCheck } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Audit = { id?: string; action: string; entity_type: string; entity_label?: string | null; actor_name?: string | null; created_at?: string; details?: string | null };
const DEMO: Audit[] = [
  { action: "اعتماد حساب", entity_type: "الحسابات", entity_label: "مثال — طلب جديد", actor_name: "رئيس النظام", created_at: new Date().toISOString(), details: "تم تغيير الحالة إلى معتمد وتحديد الصلاحيات." },
  { action: "تحديث محتوى", entity_type: "القوانين", entity_label: "الالتزام بالتوجيهات", actor_name: "رئيس النظام", created_at: new Date(Date.now()-3600000).toISOString(), details: "تم حفظ نسخة جديدة من البند." },
];

export default function AuditPage(){
  const [rows,setRows]=useState<Audit[]>(DEMO); const [loading,setLoading]=useState(isSupabaseConfigured());
  useEffect(()=>{const s=getSupabase();if(!s)return;s.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(100).then(({data})=>{if(data)setRows(data as Audit[]);setLoading(false);});},[]);
  return <div className="mx-auto max-w-[1250px] space-y-5"><header className="glass rounded-[32px] p-7 sm:p-9"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[rgba(213,166,116,.16)] bg-[rgba(213,166,116,.05)]"><FileClock size={20} className="bronze-text"/></span><div><p className="text-[10px] font-black text-zinc-700">سجل التغييرات</p><h1 className="mt-1 text-3xl font-black">سجل التغييرات</h1></div></div><p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-600">سجل رقابي للإجراءات المهمة داخل البوابة. الهدف أن تعرف القيادة من قام بالتغيير ومتى وعلى أي جزء.</p></header>
    <section className="glass overflow-hidden rounded-[30px]"><div className="flex items-center justify-between border-b border-white/[.06] p-5"><p className="font-black">آخر الإجراءات</p><span className="inline-flex items-center gap-2 text-[10px] font-black text-[#7f9b8c]"><ShieldCheck size={13}/> محمي بالصلاحيات</span></div><div className="divide-y divide-white/[.055]">{loading ? <div className="p-10 text-center text-zinc-700">جارٍ تحميل السجل...</div> : rows.map((row,index)=><div key={row.id??index} className="grid gap-3 p-5 sm:grid-cols-[140px_1fr_auto] sm:items-start"><div><span className="rounded-full border border-white/[.07] px-2.5 py-1 text-[10px] font-black text-zinc-600">{row.entity_type}</span></div><div><p className="text-sm font-black text-zinc-300">{row.action} {row.entity_label ? `• ${row.entity_label}`:""}</p>{row.details&&<p className="mt-2 text-xs leading-6 text-zinc-700">{row.details}</p>}<p className="mt-2 text-[10px] font-bold bronze-text">بواسطة {row.actor_name ?? "مستخدم النظام"}</p></div><span className="text-[9px] font-bold text-zinc-800">{row.created_at ? new Date(row.created_at).toLocaleString("ar-SA") : "—"}</span></div>)}</div></section></div>;
}
