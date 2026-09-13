"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import AuthCard from "@/components/auth-card";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    jobCode: "",
    copyId: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          job_code: form.jobCode,
          copy_id: form.copyId,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    router.replace("/pending");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8"><div className="soft-grid pointer-events-none absolute inset-0 opacity-45" /><div className="noise-layer pointer-events-none absolute inset-0" />
      <Link
        href="/login"
        className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-300"
      >
        <ArrowRight size={17} />
        تسجيل الدخول
      </Link>

      <div className="mx-auto flex min-h-[82vh] max-w-6xl items-center justify-center py-10">
        <AuthCard
          title="طلب دخول جديد"
          description="إنشاء الحساب لا يمنح أي صلاحية تلقائيًا. الطلب يظهر لمالك النظام للموافقة وتحديد المسمى والصلاحيات."
        >
          {!configured ? (
            <div className="rounded-2xl border border-[rgba(213,166,116,.16)] bg-[rgba(213,166,116,.05)] p-5 leading-8 text-zinc-300">
              ربط قاعدة البيانات غير مفعل في نسخة المعاينة. نموذج التسجيل الحقيقي
              يعمل فور إضافة متغيرات البيئة وتشغيل ملف قاعدة البيانات.
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              {[
                ["name", "الاسم داخل القطاع", "text"],
                ["jobCode", "الكود الوظيفي", "text"],
                ["copyId", "كوبي آي دي", "text"],
                ["email", "البريد الإلكتروني", "email"],
              ].map(([key, label, type]) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-sm font-bold text-zinc-400">
                    {label}
                  </span>
                  <input
                    type={type}
                    required
                    value={form[key as keyof typeof form]}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        [key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none focus:border-[rgba(213,166,116,.30)]"
                  />
                </label>
              ))}

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-zinc-400">
                  كلمة المرور
                </span>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      password: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none focus:border-[rgba(213,166,116,.30)]"
                />
              </label>

              {message && (
                <p className="md:col-span-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {message}
                </p>
              )}

              <button
                disabled={busy}
                className="md:col-span-2 rounded-2xl bg-[#d5a674] px-5 py-4 font-black text-black disabled:opacity-50"
              >
                {busy ? "جارٍ إرسال الطلب..." : "إرسال طلب الدخول"}
              </button>
            </form>
          )}
        </AuthCard>
      </div>
    </main>
  );
}
