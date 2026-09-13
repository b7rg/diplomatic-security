import { LockKeyhole } from "lucide-react";

export default function AuthCard({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass-strong relative w-full max-w-xl overflow-hidden rounded-[34px] p-6 sm:p-8 md:p-9">
      <div className="noise-layer pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[rgba(213,166,116,.09)] blur-[100px]" />
      <div className="relative">
        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-700"><LockKeyhole size={14} className="bronze-text" /> دخول آمن للنظام</div>
        <h1 className="display-title mt-4 text-3xl font-black sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-600">{description}</p>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}
