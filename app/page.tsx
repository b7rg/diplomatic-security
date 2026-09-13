"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  BookOpenCheck,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  GitBranch,
  Medal,
  ScrollText,
  Sparkles,
  UsersRound,
  MapPinned,
} from "lucide-react";
import Navbar from "@/components/navbar";
import HeroCommand from "@/components/hero-command";
import Footer from "@/components/footer";
import { DepartmentIcon, DEPARTMENT_TONES } from "@/components/department-visual";
import { useOrganization } from "@/lib/use-organization";

const systems = [
  { title: "القوانين", copy: "مرجع مصنف وقابل للبحث.", href: "/laws", icon: BookOpenCheck, tone: "bronze" },
  { title: "البروتوكولات", copy: "خطوات الاستجابة والقضايا.", href: "/protocols", icon: ClipboardList, tone: "steel" },
  { title: "شروط الترقيات", copy: "المتطلبات حسب الرتبة.", href: "/promotions", icon: Medal, tone: "bronze" },
  { title: "شروط الإجازات", copy: "الداخلية والخارجية.", href: "/leaves", icon: ScrollText, tone: "steel" },
];

const toneClass: Record<string, string> = {
  bronze: "text-[#d5a674]",
  steel: "text-[#8fa5b6]",
};

export default function HomePage() {
  const { units, titles } = useOrganization();
  const ordered = [...units].filter((u) => u.active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="min-h-screen overflow-hidden">
      <Navbar />
      <HeroCommand />

      <section className="compact-section perf-section px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-kicker">الأنظمة الرسمية</p>
              <h2 className="display-title mt-2 text-3xl font-black md:text-5xl">كل شيء واضح من أول دخول.</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-zinc-600">
              اختر المرجع أو الخدمة المطلوبة مباشرة، وكل قسم مرتب للوصول للمعلومة بأقل عدد من الخطوات.
            </p>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.18fr_.82fr]">
            <Link href="/structure" className="glass card-hover group relative min-h-[320px] overflow-hidden rounded-[30px] p-6 sm:p-7">
              <div className="micro-grid pointer-events-none absolute inset-0 opacity-[.035]" />
              <div className="relative flex h-full min-h-[270px] flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[rgba(213,166,116,.15)] bg-[rgba(213,166,116,.05)]">
                    <GitBranch size={20} className="bronze-text" />
                  </span>
                  <span className="rounded-full border border-white/[.06] px-3 py-1.5 text-[10px] font-black text-zinc-600">القيادة + 4 أقسام</span>
                </div>
                <div>
                  <p className="text-[11px] font-black bronze-text">الهيكل الرسمي</p>
                  <h3 className="mt-2 text-3xl font-black text-zinc-100 md:text-4xl">الهيكل التنظيمي</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-8 text-zinc-600">
                    القيادة في الأعلى، ثم الشؤون الإدارية وكلية التدريب والشرطة العسكرية وشؤون القبول والتجنيد ومسميات كل جهة.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-black bronze-text">
                    استعراض الهيكل <ChevronLeft size={14} className="transition group-hover:-translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Link href="/apply" className="group relative overflow-hidden rounded-[28px] border border-[rgba(132,65,58,.20)] bg-[linear-gradient(145deg,rgba(73,33,31,.18),rgba(15,13,13,.78))] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[rgba(200,131,121,.18)] bg-[rgba(132,65,58,.09)]">
                    <UsersRound size={19} className="text-[#c88379]" />
                  </span>
                  <Sparkles size={15} className="text-[#c88379]" />
                </div>
                <h3 className="mt-6 text-2xl font-black">مركز التقديم</h3>
                <p className="mt-2 text-sm leading-7 text-zinc-600">التقديم على الجهات المفتوحة أو كلية الضباط الأمنية.</p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#c88379]">ابدأ الطلب <ArrowLeft size={14} /></span>
              </Link>

              <Link href="/announcements" className="glass card-hover rounded-[28px] p-5 sm:p-6">
                <BellRing size={20} className="text-[#8fa5b6]" />
                <h3 className="mt-5 text-xl font-black">الإعلانات الرسمية</h3>
                <p className="mt-2 text-sm leading-7 text-zinc-700">آخر التنبيهات والتحديثات المنشورة من القيادة.</p>
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {systems.map((system) => {
              const Icon = system.icon;
              return (
                <Link key={system.href} href={system.href} className="group flex min-h-[132px] items-start gap-3 rounded-[24px] border border-white/[.06] bg-white/[.014] p-5 transition hover:border-[rgba(213,166,116,.15)] hover:bg-white/[.025]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-white/[.06] bg-black/20">
                    <Icon size={17} className={toneClass[system.tone]} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-zinc-300">{system.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-zinc-700">{system.copy}</p>
                    <span className="mt-3 inline-flex text-[11px] font-black text-zinc-700 transition group-hover:text-[#d5a674]">فتح الصفحة</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[.9fr_1.1fr]">
            <Link href="/my-card" className="ds-panel group overflow-hidden p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[rgba(213,166,116,.16)] bg-[rgba(213,166,116,.05)]">
                  <CreditCard size={19} className="bronze-text" />
                </span>
                <span className="rounded-full border border-white/[.06] px-3 py-1.5 text-[9px] font-black text-zinc-700">بحث فردي فقط</span>
              </div>
              <h3 className="mt-7 text-2xl font-black">بطاقتي في القطاع</h3>
              <p className="mt-2 max-w-xl text-sm leading-7 text-zinc-600">
                ابحث بمعرّف الديسكورد أو الكوبي آي دي. تظهر بطاقة الشخص فقط مع رتبته ورصده ومتطلبات ترقيته الحالية.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-black bronze-text">عرض البطاقة <ArrowLeft size={14} className="transition group-hover:-translate-x-1" /></span>
            </Link>

            <Link href="/map" className="group relative min-h-[270px] overflow-hidden rounded-[28px] border border-[rgba(213,166,116,.15)] bg-[#070707]">
              <img src="/maps/gta-map.png" alt="معاينة الخريطة الميدانية" className="absolute inset-0 h-full w-full object-cover opacity-[.46] transition duration-500 group-hover:scale-[1.025] group-hover:opacity-[.58]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,.98)_0%,rgba(5,5,5,.72)_45%,rgba(5,5,5,.18)_100%)]" />
              <div className="relative flex h-full min-h-[270px] max-w-xl flex-col justify-end p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[rgba(143,165,182,.18)] bg-[rgba(143,165,182,.07)]">
                  <MapPinned size={19} className="text-[#91aabb]" />
                </span>
                <p className="mt-5 text-[11px] font-black text-[#91aabb]">الخريطة الميدانية</p>
                <h3 className="mt-2 text-3xl font-black">المناطق والمسميات</h3>
                <p className="mt-2 text-sm leading-7 text-zinc-500">الخريطة الأساسية ظاهرة، والمناطق المعتمدة تظهر فوقها عند إضافتها.</p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#91aabb]">فتح الخريطة <ArrowLeft size={14} /></span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px] glass rounded-[30px] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">الهيكل الرسمي</p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">القيادة والأقسام الأربعة</h2>
            </div>
            <Link href="/structure" className="rounded-full border border-white/[.07] px-4 py-2 text-xs font-black text-zinc-500 hover:text-[#d5a674]">عرض الكل</Link>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {ordered.slice(0, 5).map((unit) => {
              const tone = DEPARTMENT_TONES[unit.accent];
              const count = titles.filter((t) => t.unit_key === unit.key && t.active).length;
              return (
                <Link href="/structure" key={unit.key} className={`group flex items-center gap-3 rounded-[18px] border p-3.5 transition ${tone.border} bg-black/15 hover:bg-white/[.025]`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border ${tone.border} ${tone.bg} ${tone.text}`}>
                    <DepartmentIcon iconKey={unit.icon_key} size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-zinc-400">{unit.name}</p>
                    <p className="mt-0.5 text-[9px] text-zinc-700">{count} مسميات</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
