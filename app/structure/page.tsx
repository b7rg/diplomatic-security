"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, GitBranch, Search, ShieldCheck, Sparkles, UserCog } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { DepartmentIcon, DEPARTMENT_TONES } from "@/components/department-visual";
import { MILITARY_RANKS } from "@/lib/site";
import { useOrganization } from "@/lib/use-organization";

export default function StructurePage() {
  const { units, titles, loading } = useOrganization();
  const [active, setActive] = useState("command");
  const [rankSearch, setRankSearch] = useState("");
  const orderedUnits = useMemo(() => [...units].filter((item) => item.active).sort((a, b) => a.sort_order - b.sort_order), [units]);
  const current = orderedUnits.find((item) => item.key === active) ?? orderedUnits[0];
  const departmentCount = orderedUnits.filter((item) => item.kind === "department").length;
  const currentTitles = useMemo(() => titles.filter((t) => t.unit_key === current?.key && t.active).sort((a, b) => a.sort_order - b.sort_order), [titles, current]);
  const ranks = useMemo(() => {
    const term = rankSearch.trim();
    return term ? MILITARY_RANKS.filter((rank) => rank.includes(term)) : MILITARY_RANKS;
  }, [rankSearch]);

  if (!current || loading) {
    return <main className="min-h-screen"><Navbar /><div className="mx-auto max-w-5xl px-5 pt-40"><div className="glass rounded-[28px] p-10 text-center text-zinc-600">جارٍ تحميل الهيكل التنظيمي...</div></div></main>;
  }

  const tone = DEPARTMENT_TONES[current.accent];

  return (
    <main className="min-h-screen overflow-hidden">
      <Navbar />
      <div className="soft-grid pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-30" />
      <div className="relative mx-auto max-w-[1500px] px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-zinc-600 transition hover:text-[#d5a674]"><ArrowRight size={17} /> الرئيسية</Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[.07] bg-white/[.02] px-3 py-2 text-[11px] font-black text-zinc-600"><Sparkles size={14} className="bronze-text" /> القيادة + أربعة أقسام رسمية</div>
        </div>

        <header className="ds-page-hero mt-5 p-6 sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="section-kicker">الهيكل التنظيمي</p>
              <h1 className="display-title mt-3 text-4xl font-black md:text-6xl">القيادة والأقسام والرتب</h1>
              <p className="mt-3 max-w-3xl text-sm leading-8 text-zinc-500">القيادة في الأعلى، وتحتها الشؤون الإدارية وكلية التدريب الأمنية والشرطة العسكرية وشؤون القبول والتجنيد فقط.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:w-[250px]">
              <Metric value={departmentCount} label="أقسام" />
              <Metric value={MILITARY_RANKS.length} label="رتبة" />
            </div>
          </div>
        </header>

        <section className="mt-4 grid gap-4 xl:grid-cols-[300px_1fr]">
          <aside className="glass h-fit rounded-[26px] p-3 xl:sticky xl:top-28">
            <div className="flex items-center justify-between px-3 py-2">
              <div><p className="text-[10px] font-black bronze-text">الهيكل الرسمي</p><h2 className="mt-1 text-lg font-black">اختر الجهة</h2></div>
              <GitBranch size={19} className="bronze-text" />
            </div>
            <div className="mt-2 space-y-1.5">
              {orderedUnits.map((item) => {
                const itemTone = DEPARTMENT_TONES[item.accent];
                const selected = item.key === current.key;
                const count = titles.filter((t) => t.unit_key === item.key && t.active).length;
                return (
                  <button key={item.key} onClick={() => setActive(item.key)} className={`group flex w-full items-center gap-3 rounded-[18px] border px-3.5 py-3 text-right transition ${selected ? `${itemTone.border} ${itemTone.bg}` : "border-transparent hover:border-white/[.055] hover:bg-white/[.025]"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border ${selected ? `${itemTone.border} ${itemTone.bg} ${itemTone.text}` : "border-white/[.06] bg-black/20 text-zinc-700"}`}><DepartmentIcon iconKey={item.icon_key} /></span>
                    <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-black ${selected ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-300"}`}>{item.name}</span><span className="mt-0.5 block text-[10px] text-zinc-700">{count} مسميات</span></span>
                    <ChevronLeft size={14} className={selected ? itemTone.text : "text-zinc-800"} />
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-4">
            <article className={`overflow-hidden rounded-[28px] border ${tone.border} bg-[linear-gradient(145deg,rgba(19,20,20,.88),rgba(10,10,10,.82))]`}>
              <div className={`grid gap-5 border-b border-white/[.055] bg-gradient-to-l ${tone.soft} to-transparent p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center`}>
                <div className="flex items-start gap-4">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border ${tone.border} ${tone.bg} ${tone.text}`}><DepartmentIcon iconKey={current.icon_key} size={21} /></span>
                  <div><p className="text-[10px] font-black bronze-text">الجهة المحددة</p><h2 className="mt-1 text-2xl font-black md:text-3xl">{current.name}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600">{current.description}</p></div>
                </div>
                {current.application_enabled && <Link href={`/apply/${current.key}`} className={`inline-flex items-center justify-center gap-2 rounded-[16px] border px-5 py-3 text-sm font-black ${tone.border} ${tone.bg} ${tone.text}`}>التقديم على القسم <ChevronLeft size={16} /></Link>}
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
                {currentTitles.map((role, index) => (
                  <div key={role.id} className="min-h-[92px] rounded-[20px] border border-white/[.055] bg-white/[.014] p-4 transition hover:bg-white/[.025]">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border ${tone.border} ${tone.bg} ${tone.text} text-[10px] font-black`}>{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0"><p className="text-sm font-black text-zinc-300">{role.name}</p><p className="mt-1 text-[10px] font-bold text-zinc-700">{role.permission_keys.length ? `${role.permission_keys.length} صلاحيات مرتبطة بالمسمى` : "مسمى بدون صلاحية إدارية"}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[.07] bg-black/20"><ShieldCheck size={18} className="bronze-text" /></span><div><p className="text-[10px] font-black bronze-text">الرتب العسكرية</p><h2 className="mt-1 text-xl font-black">السلم العسكري</h2></div></div>
                <div className="relative w-full md:w-72"><Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-700" /><input value={rankSearch} onChange={(e) => setRankSearch(e.target.value)} placeholder="ابحث عن رتبة..." className="w-full rounded-[15px] border border-white/[.07] bg-black/25 py-2.5 pl-3 pr-9 text-sm outline-none focus:border-[rgba(213,166,116,.25)]" /></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {ranks.map((rank, index) => <div key={rank} className="relative overflow-hidden rounded-[17px] border border-white/[.055] bg-white/[.016] px-3 py-3.5"><span className="absolute left-2 top-2 text-[9px] font-black text-zinc-800">{String(index + 1).padStart(2, "0")}</span><UserCog size={14} className="bronze-text" /><p className="mt-2 text-xs font-black text-zinc-400">{rank}</p></div>)}
              </div>
            </article>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-[18px] border border-white/[.065] bg-black/25 px-4 py-3"><p className="text-2xl font-black bronze-text">{value}</p><p className="mt-1 text-[10px] font-bold text-zinc-700">{label}</p></div>;
}
