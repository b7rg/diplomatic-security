"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, CalendarClock, Radio } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Announcement = { id?: string; title: string; body: string; badge?: string | null; published_at?: string | null; priority?: number };
const DEMO: Announcement[] = [
  { title: "مرحبًا في مركز الإعلانات", body: "هذه بطاقة معاينة. بعد ربط قاعدة البيانات ستظهر هنا التعاميم والتنبيهات التي تنشرها من مركز القيادة.", badge: "معاينة", published_at: new Date().toISOString(), priority: 1 },
];

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>(DEMO);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  useEffect(() => {
    const supabase = getSupabase(); if (!supabase) return;
    supabase.from("announcements").select("*").eq("active", true).order("priority", { ascending: false }).order("published_at", { ascending: false }).then(({ data, error }) => { if (!error && data) setItems(data as Announcement[]); setLoading(false); });
  }, []);
  return <main className="min-h-screen"><Navbar />
    <div className="soft-grid pointer-events-none fixed inset-x-0 top-0 h-[500px] opacity-50" />
    <div className="relative mx-auto max-w-[1200px] px-4 pb-24 pt-32 sm:px-6 md:pt-36 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-zinc-600 hover:text-[#d5a674]"><ArrowRight size={17}/> الرئيسية</Link>
      <header className="mt-8 border-b border-white/[.07] pb-10"><div className="flex items-center gap-3 text-[#d5a674]"><BellRing size={20}/><span className="text-xs font-black">الإعلانات الرسمية</span></div><h1 className="display-title mt-5 text-5xl font-black md:text-7xl">الإعلانات الرسمية</h1><p className="mt-5 max-w-2xl leading-8 text-zinc-500">التعاميم والتنبيهات والتحديثات التي تحتاج أن تصل للجميع بدون ضياعها بين الرسائل.</p></header>
      <section className="mt-8 space-y-4">{loading ? Array.from({length:3}).map((_,i)=><div key={i} className="h-40 animate-pulse rounded-[28px] border border-white/[.06] bg-white/[.02]" />) : items.length ? items.map((item,index)=><article key={item.id ?? index} className="glass card-hover rounded-[30px] p-6 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-[11px] font-black bronze-text"><Radio size={13}/>{item.badge ?? "إعلان رسمي"}</div><h2 className="mt-3 text-xl font-black text-zinc-100 sm:text-2xl">{item.title}</h2><p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-8 text-zinc-500 sm:text-base">{item.body}</p></div>{item.published_at && <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/[.07] bg-black/20 px-3 py-2 text-[10px] font-bold text-zinc-700"><CalendarClock size={13}/>{new Date(item.published_at).toLocaleDateString("ar-SA")}</span>}</div></article>) : <div className="glass rounded-[30px] p-12 text-center text-zinc-600">لا يوجد إعلان منشور حاليًا.</div>}</section>
    </div><Footer /></main>;
}
