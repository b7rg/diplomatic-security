"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import AuthCard from "@/components/auth-card";
import SectorLogo from "@/components/sector-logo";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const supabase = getSupabase();
    if (!supabase) return;

    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setMessage("بيانات الدخول غير صحيحة.");
      setBusy(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", data.user.id)
      .single();

    if (!profile || profile.status === "pending") {
      router.replace("/pending");
    } else if (profile.status === "rejected") {
      await supabase.auth.signOut();
      setMessage("طلب هذا الحساب مرفوض. راجع إدارة القطاع.");
      setBusy(false);
    } else {
      router.replace("/dashboard");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8"><div className="soft-grid pointer-events-none absolute inset-0 opacity-45" /><div className="noise-layer pointer-events-none absolute inset-0" />
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link
          href="/"
          className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-300"
        >
          <ArrowRight size={17} />
          الرئيسية
        </Link>
        <SectorLogo className="h-14 w-14" />
      </div>

      <div className="mx-auto flex min-h-[78vh] max-w-6xl items-center justify-center py-10">
        <AuthCard
          title="دخول النظام"
          description="الدخول مخصص للحسابات المعتمدة فقط. الحسابات الجديدة تمر على طلب اعتماد قبل فتح لوحة الإدارة."
        >
          {configured ? (
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-400">
                  البريد الإلكتروني
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none focus:border-[rgba(213,166,116,.30)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-400">
                  كلمة المرور
                </span>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 pl-12 text-white outline-none focus:border-[rgba(213,166,116,.30)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((value) => !value)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                  >
                    {show ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </label>

              {message && (
                <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-300">
                  {message}
                </p>
              )}

              <button
                disabled={busy}
                className="w-full rounded-2xl bg-[#d5a674] px-5 py-4 font-black text-black transition hover:bg-[#efd0ad] disabled:opacity-50"
              >
                {busy ? "جارٍ الدخول..." : "دخول"}
              </button>

              <p className="text-center text-sm text-zinc-500">
                ما عندك حساب؟{" "}
                <Link href="/register" className="font-black bronze-text">
                  أرسل طلب دخول
                </Link>
              </p>
            </form>
          ) : (
            <div>
              <div className="rounded-2xl border border-[rgba(213,166,116,.16)] bg-[rgba(213,166,116,.05)] p-4 text-sm leading-7 text-zinc-300">
                أنت الآن في وضع المعاينة لأن قاعدة البيانات غير مربوطة. تقدر تشوف
                التصميم ولوحة المالك كاملة قبل تفعيل الحسابات الحقيقية.
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-4 w-full rounded-2xl bg-[#d5a674] px-5 py-4 font-black text-black"
              >
                دخول وضع المعاينة
              </button>
            </div>
          )}
        </AuthCard>
      </div>
    </main>
  );
}
