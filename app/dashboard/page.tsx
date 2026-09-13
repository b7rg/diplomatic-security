"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  Building2,
  UserRoundCog,
  FileClock,
  FilePenLine,
  HelpCircle,
  ShieldCheck,
  ClipboardList,
  ShieldAlert,
  MapPinned,
  Users,
  UserPlus,
} from "lucide-react";
import { can, type Permission } from "@/lib/auth";
import { useCurrentProfile } from "@/lib/use-current-profile";

type Action = {
  title: string;
  subtitle: string;
  href: string;
  icon: typeof Building2;
  badge: string;
  permissions?: Permission[];
};

const actions: Action[] = [
  { title: "القيادة والأقسام والمسميات", subtitle: "تعديل الهيكل وربط المسميات بصلاحياتها", href: "/dashboard/organization", icon: Building2, badge: "الهيكل", permissions: ["manage_organization", "edit_structure"] },
  { title: "طلبات الدخول", subtitle: "اعتماد الحسابات وتحديد الصلاحيات", href: "/dashboard/accounts", icon: Users, badge: "الحسابات", permissions: ["manage_accounts"] },
  { title: "طلبات الأقسام", subtitle: "مراجعة الطلبات والتسكين", href: "/dashboard/applications", icon: UserPlus, badge: "التقديم", permissions: ["manage_applications"] },
  { title: "الرصد والترقيات", subtitle: "التقارير والساعات وتسهيلات الترقية", href: "/dashboard/tracking", icon: ClipboardList, badge: "الرصد", permissions: ["manage_personnel_tracking"] },
  { title: "الشرطة العسكرية", subtitle: "تسجيل المخالفات ومتابعة التنفيذ", href: "/dashboard/military-police", icon: ShieldAlert, badge: "المخالفات", permissions: ["manage_military_police"] },
  { title: "إدارة الخريطة", subtitle: "رسم المناطق وتعديلها", href: "/dashboard/map", icon: MapPinned, badge: "الخريطة", permissions: ["manage_map"] },
  { title: "إدارة المحتوى", subtitle: "القوانين والبروتوكولات والشروط", href: "/dashboard/content", icon: FilePenLine, badge: "المحتوى", permissions: ["manage_content", "edit_laws", "edit_protocols", "edit_promotions", "edit_leaves"] },
  { title: "إدارة الأفراد", subtitle: "إضافة وتعديل وأرشفة الأفراد", href: "/dashboard/schedule", icon: UserRoundCog, badge: "الأفراد", permissions: ["manage_schedule", "manage_accounts", "manage_personnel_tracking"] },
  { title: "سجل التغييرات", subtitle: "مراجعة العمليات الحساسة", href: "/dashboard/audit", icon: FileClock, badge: "السجل", permissions: ["view_audit"] },
  { title: "دليل الاستخدام", subtitle: "شرح داخلي للمسؤولين", href: "/dashboard/guide", icon: HelpCircle, badge: "المساعدة" },
];

export default function DashboardPage() {
  const { profile, loading } = useCurrentProfile();
  const visible = actions.filter((action) => {
    if (!action.permissions?.length) return true;
    return Boolean(profile?.is_owner || action.permissions.some((permission) => can(profile, permission)));
  });

  if (loading) {
    return <div className="mx-auto max-w-[1560px] space-y-3"><div className="h-48 animate-pulse rounded-[28px] bg-white/[.02]"/><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Array.from({length:8}).map((_,i)=><div key={i} className="h-40 animate-pulse rounded-[24px] bg-white/[.018]"/>)}</div></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1560px] space-y-3">
      <header className="ds-page-hero p-5 sm:p-6 xl:p-7">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(213,166,116,.17)] bg-[rgba(213,166,116,.05)] px-3 py-2 text-[11px] font-black bronze-text"><ShieldCheck size={13}/> مركز الإدارة الرسمي</div>
            <h1 className="display-title mt-3 text-3xl font-black sm:text-4xl xl:text-5xl">مركز قيادة البوابة</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-500">تظهر لك فقط الأنظمة المرتبطة بصلاحياتك، وكل مهمة تبدأ من بطاقتها مباشرة.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              [String(visible.length), "أنظمة متاحة"],
              ["4", "أقسام رسمية"],
              ["3", "فئات أفراد"],
            ].map(([value, label]) => <div key={label} className="min-w-[92px] rounded-[18px] border border-white/[.07] bg-black/20 px-3 py-3 text-center"><p className="text-xl font-black bronze-text">{value}</p><p className="mt-1 text-[10px] font-bold text-zinc-600">{label}</p></div>)}
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {visible.map((action) => {
          const Icon = action.icon;
          return <Link key={action.href} href={action.href} className="group min-h-[158px] rounded-[24px] border border-white/[.065] bg-white/[.016] p-[18px] transition hover:-translate-y-1 hover:border-[rgba(213,166,116,.17)] hover:bg-[rgba(213,166,116,.025)]"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-white/[.07] bg-black/20"><Icon size={18} className="bronze-text"/></span><span className="rounded-full border border-white/[.06] px-2.5 py-1 text-[9px] font-black text-zinc-600">{action.badge}</span></div><h2 className="mt-4 text-sm font-black text-zinc-200">{action.title}</h2><p className="mt-1.5 text-xs leading-6 text-zinc-600">{action.subtitle}</p><span className="mt-3 inline-flex items-center gap-2 text-[11px] font-black text-zinc-600 transition group-hover:text-[#d5a674]">فتح <ArrowLeft size={13}/></span></Link>;
        })}
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.2fr_.8fr]">
        <div className="ds-panel p-5">
          <div className="flex items-center gap-3"><BellRing size={18} className="bronze-text"/><div><p className="text-xs font-black bronze-text">المهام السريعة</p><h2 className="mt-1 text-lg font-black">من وين أبدأ؟</h2></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["إضافة عسكري", "إدارة الأفراد ← إضافة فرد ← الرتبة ← الكود ← حفظ"],
              ["رصد تقرير", "الرصد والترقيات ← العسكري ← نوع التقرير ← حفظ"],
              ["تسجيل مخالفة", "الشرطة العسكرية ← العسكري ← السبب ← الإجراء ← التنفيذ"],
              ["تعديل قانون", "إدارة المحتوى ← مسودة ← مراجعة ← اعتماد"],
            ].map(([title, desc], index) => <div key={title} className="rounded-[16px] border border-white/[.055] bg-black/20 p-3.5"><span className="text-[9px] font-black bronze-text">{index+1}</span><p className="mt-1.5 text-sm font-black text-zinc-300">{title}</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">{desc}</p></div>)}
          </div>
        </div>

        <div className="ds-panel flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center gap-3"><HelpCircle size={18} className="bronze-text"/><div><p className="text-xs font-black bronze-text">مساعدة داخلية</p><h2 className="mt-1 text-lg font-black">استلمت مسؤولية جديدة؟</h2></div></div>
            <p className="mt-3 text-sm leading-7 text-zinc-600">الدليل موجود داخل النظام فقط ويشرح وظيفة كل صفحة وخطوات استخدامها بدون الحاجة للرجوع لشخص ثاني.</p>
          </div>
          <Link href="/dashboard/guide" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[15px] bg-[#d5a674] px-5 py-3 text-sm font-black text-[#17110d]">فتح الدليل <ArrowLeft size={15}/></Link>
        </div>
      </section>
    </div>
  );
}
