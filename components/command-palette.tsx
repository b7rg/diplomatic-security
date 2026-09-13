"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpLeft, Command, Search, X } from "lucide-react";
import { COMMAND_LINKS } from "@/lib/site";

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMAND_LINKS;
    return COMMAND_LINKS.filter((item) =>
      `${item.title} ${item.description} ${item.keywords}`.toLowerCase().includes(q)
    );
  }, [query]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 px-4 pt-[12vh] backdrop-blur-xl"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -18, scale: .975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: .985 }}
            transition={{ duration: .18 }}
            className="glass-strong w-full max-w-2xl overflow-hidden rounded-[30px]"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Search size={20} className="bronze-text" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث: قانون، إجازة، ترقية، بروتوكول..."
                className="min-w-0 flex-1 bg-transparent py-2 text-base text-white outline-none placeholder:text-zinc-600"
              />
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-500 hover:text-white"
                aria-label="إغلاق البحث"
              >
                <X size={17} />
              </button>
            </div>

            <div className="slim-scrollbar max-h-[54vh] overflow-y-auto p-3">
              {results.length ? (
                results.map((item, index) => (
                  <button
                    key={item.href}
                    onClick={() => go(item.href)}
                    className="group flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-right transition hover:bg-white/[.045]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.025] text-xs font-black text-zinc-500 group-hover:border-[rgba(213,166,116,.25)] group-hover:text-[#d5a674]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-black text-zinc-100">{item.title}</span>
                      <span className="mt-1 block text-sm text-zinc-600">{item.description}</span>
                    </span>
                    <ArrowUpLeft size={18} className="text-zinc-700 transition group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:text-[#d5a674]" />
                  </button>
                ))
              ) : (
                <div className="px-5 py-12 text-center text-zinc-600">لا توجد نتيجة مطابقة.</div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-zinc-600">
              <span>بحث موحّد داخل البوابة</span>
              <span className="flex items-center gap-2"><Command size={13} /> اختصار البحث</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
