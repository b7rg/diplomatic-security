"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  CreditCard,
  FileCheck2,
  GitBranch,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import SectorLogo from "@/components/sector-logo";

const quick = [
  ["القوانين", "/laws", BookOpenCheck],
  ["بطاقتي", "/my-card", CreditCard],
  ["الهيكل", "/structure", GitBranch],
] as const;

export default function HeroCommand() {
  return (
    <section className="relative overflow-hidden px-4 pb-7 pt-28 sm:px-6 md:pt-32 lg:px-8">
      <div className="soft-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="noise-layer pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute right-[8%] top-20 h-64 w-64 rounded-full bg-[rgba(184,130,85,.10)] blur-[110px]" />

      <div className="relative mx-auto max-w-[1500px]">
        <div className="grid gap-4 lg:grid-cols-[1.12fr_.88fr] lg:items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .65 }}
            className="glass-strong relative flex min-h-[430px] flex-col justify-between overflow-hidden rounded-[34px] p-6 sm:p-8 lg:p-10"
          >
            <div className="micro-grid pointer-events-none absolute inset-0 opacity-[.035]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(112,145,126,.18)] bg-[rgba(112,145,126,.06)] px-3 py-2 text-[11px] font-black text-[#91ad9d]">
                <span className="signal-dot" /> البوابة الرسمية للقطاع
              </div>
              <p className="section-kicker mt-6">المرجع الرسمي</p>
              <h1 className="display-title mt-3 max-w-4xl text-[2.65rem] font-black leading-[1.08] sm:text-6xl xl:text-[4.35rem]">
                كل ما يخص القطاع،<br />
                <span className="bronze-text">مرتب في مكان واحد.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-zinc-500 md:text-base">
                القوانين والبروتوكولات والترقيات والإجازات والهيكل والخريطة، مع بطاقة فردية للبحث والوصول السريع للمعلومة المعتمدة.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/laws" className="inline-flex items-center gap-2 rounded-full bg-[#d5a674] px-5 py-3 text-sm font-black text-[#17110d]">
                  فتح القوانين <ArrowLeft size={15} />
                </Link>
                <Link href="/apply" className="inline-flex items-center gap-2 rounded-full border border-white/[.09] bg-white/[.025] px-5 py-3 text-sm font-black text-zinc-300">
                  <Sparkles size={15} className="bronze-text" /> التقديم على القطاع
                </Link>
              </div>
            </div>

            <div className="relative mt-8 grid gap-2 sm:grid-cols-3">
              {quick.map(([title, href, Icon]) => (
                <Link key={href} href={href} className="group flex items-center gap-3 rounded-[18px] border border-white/[.06] bg-black/20 p-3.5 transition hover:border-[rgba(213,166,116,.16)] hover:bg-white/[.02]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/[.065] bg-white/[.018]">
                    <Icon size={16} className="bronze-text" />
                  </span>
                  <span className="text-sm font-black text-zinc-400 group-hover:text-zinc-200">{title}</span>
                  <ArrowLeft size={13} className="mr-auto text-zinc-800 transition group-hover:-translate-x-1 group-hover:text-[#d5a674]" />
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: .975, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: .1, duration: .75 }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="glass relative col-span-2 flex min-h-[294px] items-center justify-center overflow-hidden rounded-[32px]">
              <div className="orbit-ring orbit-a scale-[.76] sm:scale-[.9]" />
              <div className="orbit-ring orbit-b hidden scale-[.72] sm:block" />
              <div className="scan-line" />
              <SectorLogo className="relative z-10 h-44 w-44 rounded-[40px] border-0 bg-transparent shadow-none sm:h-52 sm:w-52" />
              <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
                <div className="rounded-[14px] border border-white/[.06] bg-black/45 p-3 backdrop-blur-lg">
                  <Radio size={13} className="text-[#8eaa99]" />
                  <p className="mt-2 text-[10px] font-black text-zinc-400">حالة البوابة</p>
                  <p className="mt-0.5 text-[9px] text-zinc-700">متاحة</p>
                </div>
                <div className="rounded-[14px] border border-white/[.06] bg-black/45 p-3 backdrop-blur-lg">
                  <UsersRound size={13} className="text-[#8fa5b6]" />
                  <p className="mt-2 text-[10px] font-black text-zinc-400">الأقسام</p>
                  <p className="mt-0.5 text-[9px] text-zinc-700">أربعة</p>
                </div>
                <div className="rounded-[14px] border border-white/[.06] bg-black/45 p-3 backdrop-blur-lg">
                  <ShieldCheck size={13} className="bronze-text" />
                  <p className="mt-2 text-[10px] font-black text-zinc-400">المرجع</p>
                  <p className="mt-0.5 text-[9px] text-zinc-700">موحّد</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-[26px] p-5">
              <Search size={18} className="bronze-text" />
              <p className="mt-4 text-sm font-black text-zinc-300">بحث سريع</p>
              <p className="mt-1 text-xs leading-6 text-zinc-700">ابحث عن القانون أو النظام المطلوب مباشرة.</p>
            </div>
            <div className="glass rounded-[26px] p-5">
              <FileCheck2 size={18} className="text-[#8eaa99]" />
              <p className="mt-4 text-sm font-black text-zinc-300">مرجع واحد</p>
              <p className="mt-1 text-xs leading-6 text-zinc-700">المعلومة المعتمدة بدون رسائل متفرقة.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
