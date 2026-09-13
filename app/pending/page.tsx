"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth-card";
import { getSupabase } from "@/lib/supabase/client";

export default function PendingPage() {
  const router = useRouter();

  async function logout() {
    await getSupabase()?.auth.signOut();
    router.replace("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <AuthCard
        title="الطلب بانتظار الاعتماد"
        description="تم استلام الحساب، لكنه لن يفتح لوحة النظام حتى يعتمد مالك النظام الطلب ويحدد الصلاحيات."
      >
        <Clock3 className="bronze-text" size={34} />
        <p className="mt-5 leading-8 text-zinc-400">
          بعد الاعتماد يكفي تسجيل الدخول بنفس الحساب. لا تحتاج إنشاء طلب جديد.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={logout}
            className="rounded-2xl bg-[#d5a674] px-5 py-3 font-black text-black"
          >
            تسجيل خروج
          </button>
          <Link
            href="/"
            className="glass rounded-2xl px-5 py-3 font-bold text-zinc-300"
          >
            الصفحة الرئيسية
          </Link>
        </div>
      </AuthCard>
    </main>
  );
}
