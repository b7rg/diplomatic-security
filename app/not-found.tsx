import Link from "next/link";
import { ArrowRight, Home, Search } from "lucide-react";
import SectorLogo from "@/components/sector-logo";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-center">
      <div className="soft-grid pointer-events-none absolute inset-0 opacity-35" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(213,166,116,.08)] blur-[140px]" />
      <section className="glass relative w-full max-w-xl rounded-[32px] p-7 sm:p-10">
        <SectorLogo className="mx-auto h-20 w-20 rounded-[24px] border border-[rgba(213,166,116,.18)] bg-[rgba(213,166,116,.05)]" />
        <p className="section-kicker mt-7 justify-center">404 / الصفحة غير موجودة</p>
        <h1 className="display-title mt-3 text-4xl font-black sm:text-5xl">الصفحة غير موجودة</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-600">الرابط قديم أو تغيّر مساره. ارجع للرئيسية أو استخدم البحث للوصول للنظام المطلوب.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#d5a674] px-4 py-3.5 text-sm font-black text-[#17110d]"><Home size={17} /> الرئيسية</Link>
          <Link href="/laws" className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/[.08] bg-white/[.02] px-4 py-3.5 text-sm font-black text-zinc-400"><Search size={17} /> المرجع النظامي</Link>
        </div>
        <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-xs font-black text-zinc-700 transition hover:text-[#d5a674]">دخول النظام <ArrowRight size={14} /></Link>
      </section>
    </main>
  );
}
