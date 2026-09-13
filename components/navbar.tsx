"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, LogIn, Menu, Search, Sparkles, X } from "lucide-react";
import SectorLogo from "@/components/sector-logo";
import CommandPalette from "@/components/command-palette";
import { PUBLIC_LINKS, SITE } from "@/lib/site";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <motion.header initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .55, ease: "easeOut" }} className="fixed inset-x-0 top-0 z-50">
        <div className="relative mx-auto mt-4 w-[96%] max-w-[1600px]">
          <div className="flex min-h-[70px] items-center justify-between rounded-full border border-white/[.09] bg-black/70 px-3 py-2 shadow-[0_24px_70px_rgba(0,0,0,.36)] backdrop-blur-2xl md:px-5">
            <Link href="/" onClick={() => setMenuOpen(false)} className="flex shrink-0 items-center gap-3">
              <SectorLogo className="h-12 w-12 rounded-full border border-[rgba(213,166,116,.16)] bg-[rgba(213,166,116,.04)]" />
              <div className="hidden sm:block">
                <h1 className="text-[15px] font-black text-zinc-100">{SITE.name}</h1>
                <p className="mt-0.5 text-[10px] font-black text-[#b88255]">البوابة الرسمية للقطاع</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 2xl:flex">
              {PUBLIC_LINKS.slice(0, 8).map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={`whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-bold transition ${active ? "bg-[rgba(213,166,116,.10)] text-[#e6bb88]" : "text-zinc-500 hover:bg-white/[.035] hover:text-zinc-200"}`}>
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Link href="/apply" className="hidden h-10 items-center gap-2 rounded-full border border-[rgba(213,166,116,.18)] bg-[rgba(213,166,116,.06)] px-4 text-xs font-black text-[#d5a674] transition hover:bg-[rgba(213,166,116,.11)] xl:flex"><Sparkles size={14} /> التقديم</Link>
              <Link href="/my-card" className="hidden h-10 items-center gap-2 rounded-full border border-white/[.08] bg-white/[.025] px-3 text-xs font-black text-zinc-400 transition hover:text-[#d5a674] lg:flex"><CreditCard size={14} /> بطاقتي</Link>
              <button onClick={openPalette} className="hidden h-10 items-center gap-2 rounded-full border border-white/[.08] bg-white/[.025] px-3 text-xs font-bold text-zinc-500 transition hover:text-[#d5a674] md:flex"><Search size={15} /><span>بحث</span></button>
              <Link href="/login" className="hidden h-10 items-center gap-2 rounded-full bg-[#d5a674] px-4 text-xs font-black text-[#17110d] transition hover:scale-[1.03] hover:bg-[#e8bd8b] sm:flex"><LogIn size={14} /> دخول النظام</Link>
              <button onClick={() => setMenuOpen((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[.09] bg-white/[.025] text-zinc-300 2xl:hidden" aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
            </div>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ opacity: 0, y: -12, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: .985 }} className="absolute left-0 right-0 top-[79px] overflow-hidden rounded-[26px] border border-white/[.09] bg-black/95 p-3 shadow-2xl backdrop-blur-2xl 2xl:hidden">
                <button onClick={openPalette} className="mb-2 flex w-full items-center gap-3 rounded-[16px] border border-white/[.07] bg-white/[.02] px-4 py-3 text-right text-sm font-bold text-zinc-500 md:hidden"><Search size={17} className="bronze-text" /> بحث داخل البوابة</button>
                <nav className="grid gap-1 sm:grid-cols-2">
                  {PUBLIC_LINKS.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`rounded-[16px] px-4 py-3 text-sm font-bold transition ${pathname === item.href ? "bg-[rgba(213,166,116,.08)] text-[#d5a674]" : "text-zinc-500 hover:bg-white/[.03] hover:text-zinc-200"}`}>{item.title}</Link>
                  ))}
                </nav>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#d5a674] px-5 py-3.5 font-black text-[#17110d] sm:hidden"><LogIn size={17} /> دخول النظام</Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </>
  );
}
