"use client";

import { useEffect } from "react";
import { RefreshCcw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="glass w-full max-w-lg rounded-[30px] p-8 text-center">
        <p className="section-kicker justify-center">تنبيه النظام</p>
        <h1 className="mt-3 text-3xl font-black">تعذر تحميل الصفحة</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-600">صار خطأ مؤقت أثناء تحميل هذه الصفحة. جرّب إعادة المحاولة، وإذا استمر الخطأ راجع اتصال قاعدة البيانات.</p>
        <button onClick={reset} className="mt-6 inline-flex items-center gap-2 rounded-[15px] bg-[#d5a674] px-5 py-3 text-sm font-black text-[#17110d]"><RefreshCcw size={16} /> إعادة المحاولة</button>
      </section>
    </main>
  );
}
