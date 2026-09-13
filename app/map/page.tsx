"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, MapPinned, MousePointer2, Sparkles } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Pt = { x: number; y: number };
type Region = { id: string; name: string; description: string; color: string; points: Pt[]; active: boolean; show_label: boolean; sort_order?: number };

const DEMO: Region[] = [
  { id: "m1", name: "نطاق لوس سانتوس", description: "منطقة معاينة — يمكن رسم المناطق الحقيقية من مركز القيادة.", color: "#b7793e", points: [{x:32,y:67},{x:48,y:59},{x:60,y:66},{x:59,y:82},{x:39,y:86}], active: true, show_label: true },
  { id: "m2", name: "نطاق ساندي", description: "منطقة تجريبية ثانية.", color: "#d2a15f", points: [{x:49,y:26},{x:63,y:23},{x:70,y:37},{x:57,y:43},{x:46,y:38}], active: true, show_label: true },
];

export default function MapPage() {
  const configured = isSupabaseConfigured();
  const [regions, setRegions] = useState<Region[]>(configured ? [] : DEMO);
  const [active, setActive] = useState<Region | null>(null);
  const [loading, setLoading] = useState(configured);
  const [imageOk, setImageOk] = useState(true);

  useEffect(() => {
    const s = getSupabase();
    if (!s) return;
    s.from("map_regions").select("*").eq("active", true).order("sort_order").then(({ data }) => {
      setRegions((data || []) as Region[]);
      setLoading(false);
    });
  }, []);

  const sorted = useMemo(() => [...regions].sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)), [regions]);

  return <main className="min-h-screen"><Navbar/><div className="mx-auto max-w-[1540px] px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:px-8">
    <Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-zinc-600 hover:text-[#d5a674]"><ArrowRight size={15}/> الرئيسية</Link>

    <header className="ds-page-hero mt-4 overflow-hidden p-6 sm:p-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><p className="section-kicker">الخريطة الميدانية</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">الخريطة الميدانية</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">الخريطة متاحة للعامة. مرّر على المنطقة أو اضغط عليها لعرض مسماها ووصفها. الرسم والتعديل فقط من مركز القيادة.</p></div>
        <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[.055] px-3 py-2 text-[10px] font-black text-emerald-400"><Eye size={13}/> عرض عام</span><span className="inline-flex items-center gap-2 rounded-full border border-[rgba(213,166,116,.15)] bg-[rgba(213,166,116,.045)] px-3 py-2 text-[10px] font-black bronze-text"><MapPinned size={13}/> {loading ? "جارٍ تحميل المناطق" : `${regions.length} منطقة معتمدة`}</span></div>
      </div>
    </header>

    <section className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="ds-panel p-5">
        {active ? <>
          <span className="inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black" style={{ borderColor: `${active.color}66`, background: `${active.color}18`, color: active.color }}>منطقة نشطة</span>
          <h2 className="mt-4 text-2xl font-black">{active.name}</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">{active.description || "لا يوجد وصف."}</p>
        </> : <div className="flex min-h-[260px] flex-col items-center justify-center text-center"><MousePointer2 size={38} className="bronze-text"/><h2 className="mt-4 text-xl font-black">اختر منطقة من الخريطة</h2><p className="mt-2 max-w-sm text-sm leading-7 text-zinc-700">إذا ما كانت هناك مناطق مرسومة بعد، تظل الخريطة الأساسية ظاهرة للعامة بدل إخفائها.</p></div>}

        <div className="mt-5 border-t border-white/[.06] pt-4"><div className="flex items-center justify-between"><h3 className="text-xs font-black text-zinc-400">مفتاح المناطق</h3><Sparkles size={14} className="bronze-text"/></div><div className="mt-3 space-y-2">{sorted.length ? sorted.map((r) => <button key={r.id} onMouseEnter={() => setActive(r)} onClick={() => setActive(r)} className="flex w-full items-center gap-3 rounded-[14px] border border-white/[.055] bg-black/15 px-3 py-2.5 text-right transition hover:bg-white/[.025]"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{background:r.color,boxShadow:`0 0 12px ${r.color}66`}}/><span className="text-xs font-black text-zinc-500">{r.name}</span></button>) : <p className="rounded-[14px] border border-dashed border-white/[.07] p-4 text-center text-[10px] leading-5 text-zinc-700">لم تعتمد القيادة مناطق مرسومة بعد.</p>}</div></div>
      </aside>

      <div className="relative aspect-[705/950] overflow-hidden rounded-[32px] border border-[rgba(213,166,116,.18)] bg-[#050505] shadow-[0_30px_100px_rgba(0,0,0,.45)]">
        {imageOk ? <img src="/maps/gta-map.png" alt="خريطة لوس سانتوس" onError={() => setImageOk(false)} className="absolute inset-0 h-full w-full select-none object-cover"/> : <div className="absolute inset-0 flex items-center justify-center"><div className="rounded-[20px] border border-red-500/15 bg-red-500/[.04] px-6 py-5 text-center"><MapPinned className="mx-auto text-red-400"/><p className="mt-3 text-sm font-black text-red-300">تعذر تحميل صورة الخريطة</p><p className="mt-1 text-[10px] text-zinc-600">تأكد أن صورة الخريطة الأساسية موجودة داخل مجلد صور الموقع.</p></div></div>}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">{regions.map((r) => <polygon key={r.id} points={(r.points || []).map((p) => `${p.x},${p.y}`).join(" ")} fill={`${r.color}40`} stroke={r.color} strokeWidth="0.45" vectorEffect="non-scaling-stroke" className="cursor-pointer opacity-85 transition-opacity hover:opacity-100" onMouseEnter={() => setActive(r)} onClick={() => setActive(r)}/>)}</svg>
        <div className="pointer-events-none absolute inset-0">{regions.filter((r) => r.show_label && r.points?.length).map((r) => { const x = r.points.reduce((a,p) => a+p.x,0)/r.points.length; const y = r.points.reduce((a,p) => a+p.y,0)/r.points.length; return <span key={`${r.id}-l`} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-black/80 px-3 py-1.5 text-[10px] font-black text-white shadow-xl backdrop-blur-md" style={{left:`${x}%`,top:`${y}%`,borderColor:r.color,boxShadow:`0 0 18px ${r.color}30`}}>{r.name}</span>; })}</div>
        {!loading && regions.length === 0 && <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex justify-center"><div className="rounded-full border border-white/[.09] bg-black/75 px-4 py-2 text-[10px] font-black text-zinc-500 backdrop-blur-xl">الخريطة الأساسية ظاهرة — لم تعتمد مناطق ملونة بعد.</div></div>}
      </div>
    </section>

    {!configured && <div className="mt-4 rounded-[18px] border border-white/[.06] p-4 text-xs text-zinc-700"><MapPinned size={14} className="ml-2 inline bronze-text"/> وضع المعاينة يعرض مناطق تجريبية. اربط قاعدة البيانات ثم ارسم المناطق من «إدارة الخريطة».</div>}
  </div><Footer/></main>;
}
