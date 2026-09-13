"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  FileCheck2,
  Filter,
  Search,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import {
  DEMO_CONTENT,
  PAGE_META,
  type ContentItem,
  type ContentSlug,
} from "@/lib/content";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function PublicContentPage({ slug }: { slug: ContentSlug }) {
  const meta = PAGE_META[slug];
  const [items, setItems] = useState<ContentItem[]>(DEMO_CONTENT[slug]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("الكل");
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase
      .from("content_items")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setItems(data as ContentItem[]);
        setLoading(false);
      });
  }, [slug]);

  const categories = useMemo(
    () => ["الكل", ...Array.from(new Set(items.map((item) => item.category)))],
    [items]
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => map.set(item.category, (map.get(item.category) ?? 0) + 1));
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const categoryMatch = category === "الكل" || item.category === category;
      const textMatch = !term || `${item.title} ${item.body} ${item.category} ${item.badge ?? ""}`.toLowerCase().includes(term);
      return categoryMatch && textMatch;
    });
  }, [items, search, category]);

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="soft-grid pointer-events-none fixed inset-x-0 top-0 h-[400px] opacity-45" />
      <div className="relative mx-auto max-w-[1500px] px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-zinc-600 transition hover:text-[#d5a674]"><ArrowRight size={17} /> الرئيسية</Link>
          <span className="hidden items-center gap-2 rounded-full border border-white/[.07] bg-white/[.02] px-3 py-2 text-[10px] font-black text-zinc-700 sm:inline-flex"><ShieldCheck size={13} className="text-[#7f9b8c]" /> مرجع رسمي منشور</span>
        </div>

        <header className="relative mt-5 overflow-hidden rounded-[30px] border border-white/[.08] bg-[linear-gradient(135deg,rgba(24,25,25,.88),rgba(9,10,10,.82))] p-5 shadow-[0_28px_90px_rgba(0,0,0,.30)] sm:p-7 md:p-8">
          <div className="noise-layer pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[rgba(213,166,116,.1)] blur-[110px]" />
          <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="section-kicker">{meta.kicker}</p>
              <span className="mt-3 inline-flex rounded-full border border-[rgba(213,166,116,.16)] bg-[rgba(213,166,116,.055)] px-3 py-1.5 text-xs font-black bronze-text">مرجع رسمي منشور</span>
              <h1 className="display-title mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">{meta.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500 sm:text-base">{meta.intro}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-[260px]">
              <div className="rounded-[22px] border border-white/[.07] bg-white/[.02] p-4"><p className="text-[10px] font-black text-zinc-700">الإجمالي</p><p className="metric-number mt-2 text-3xl font-black">{items.length}</p></div>
              <div className="rounded-[22px] border border-white/[.07] bg-white/[.02] p-4"><p className="text-[10px] font-black text-zinc-700">الأقسام</p><p className="metric-number mt-2 text-3xl font-black bronze-text">{Math.max(0, categories.length - 1)}</p></div>
            </div>
          </div>
        </header>

        {slug === "protocols" && (
          <section className="mt-3 rounded-[24px] border border-[rgba(213,166,116,.12)] bg-[linear-gradient(145deg,rgba(213,166,116,.035),rgba(255,255,255,.012))] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black bronze-text">المسار المختصر للحالة</p>
                <p className="mt-1 text-xs leading-6 text-zinc-600">من لحظة استلام البلاغ إلى إنهاء الحالة وتوثيقها.</p>
              </div>
              <span className="rounded-full border border-white/[.06] px-3 py-1.5 text-[10px] font-black text-zinc-600">التفاصيل الكاملة بالأسفل</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["1", "استلام البلاغ", "تحديد المسؤول والموقع"],
                ["2", "تقييم الحالة", "تحديد الخطر والدعم"],
                ["3", "تأمين الموقع", "توزيع الوحدات والمهام"],
                ["4", "التحقيق والإجراء", "جمع الأدلة واتخاذ القرار"],
                ["5", "إنهاء الحالة", "التسليم والتوثيق وفك الوحدات"],
              ].map(([number, title, copy]) => (
                <div key={number} className="rounded-[17px] border border-white/[.055] bg-black/20 p-3.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[rgba(213,166,116,.08)] text-[10px] font-black bronze-text">{number}</span>
                  <p className="mt-2 text-xs font-black text-zinc-300">{title}</p>
                  <p className="mt-1 text-[10px] leading-5 text-zinc-600">{copy}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[250px_1fr]">
          <aside className="h-fit lg:sticky lg:top-28">
            <div className="glass rounded-[28px] p-4">
              <div className="flex items-center gap-2 px-2 py-2 text-xs font-black text-zinc-600"><Filter size={15} /> أقسام المرجع</div>
              <div className="mt-2 space-y-1">
                {categories.map((value) => (
                  <button
                    key={value}
                    onClick={() => setCategory(value)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-right text-sm font-black transition ${category === value ? "bg-[rgba(213,166,116,.09)] text-[#efd0ad]" : "text-zinc-500 hover:bg-white/[.035] hover:text-zinc-300"}`}
                  >
                    <span>{value}</span>
                    <span className="text-[10px] font-bold text-zinc-700">{value === "الكل" ? items.length : counts.get(value) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="glass rounded-[26px] p-3">
              <div className="relative">
                <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بكلمة من العنوان أو النص..." className="w-full rounded-[18px] border border-white/[.06] bg-black/20 py-4 pl-4 pr-11 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[rgba(213,166,116,.26)]" />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between px-1 text-xs font-bold text-zinc-700"><span>النتائج الظاهرة: {filtered.length}</span><span>اضغط على البند لعرض التفاصيل</span></div>

            <div className="mt-3 space-y-3">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-[24px] border border-white/[.06] bg-white/[.02]" />)
              ) : filtered.length ? filtered.map((item, index) => {
                const id = item.id ?? `${item.title}-${index}`;
                const open = openId === id;
                return (
                  <article key={id} className={`overflow-hidden rounded-[26px] border transition ${open ? "border-[rgba(213,166,116,.22)] bg-[rgba(213,166,116,.035)]" : "border-white/[.065] bg-white/[.016] hover:border-white/[.1]"}`}>
                    <button onClick={() => setOpenId(open ? null : id)} className="flex w-full items-center gap-4 p-5 text-right sm:p-6">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/[.07] bg-black/20 text-xs font-black bronze-text">{String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1"><span className="block text-[11px] font-black bronze-text">{item.category}</span><span className="mt-1 block text-base font-black text-zinc-200 sm:text-lg">{item.title}</span>{slug === "protocols" && !open && <span className="mt-2 block line-clamp-2 text-xs leading-6 text-zinc-700">{item.body}</span>}</span>
                      {item.badge && <span className="hidden shrink-0 rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] font-black text-zinc-600 sm:inline-flex">{item.badge}</span>}
                      <ChevronDown size={18} className={`shrink-0 text-zinc-700 transition ${open ? "rotate-180 text-[#d5a674]" : ""}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .22 }}>
                          <div className="border-t border-white/[.055] px-5 pb-6 pt-5 sm:px-[5.75rem] sm:pb-7">
                            <div className="flex gap-3"><FileCheck2 size={17} className="mt-1 shrink-0 bronze-text" /><p className="whitespace-pre-line text-sm leading-8 text-zinc-400 sm:text-base">{item.body}</p></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </article>
                );
              }) : (
                <div className="glass rounded-[28px] p-12 text-center"><Search className="mx-auto text-zinc-700" size={28} /><p className="mt-4 font-black text-zinc-400">ما لقينا نتيجة مطابقة</p><p className="mt-2 text-sm text-zinc-700">جرّب كلمة أقصر أو اختر قسمًا مختلفًا.</p></div>
              )}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
