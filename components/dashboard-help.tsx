"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, HelpCircle, Lightbulb, X } from "lucide-react";

const HELP: { match: string; title: string; what: string; steps: string[] }[] = [
  { match: "/dashboard/accounts", title: "الحسابات والفئات", what: "هنا تعتمد طلب الدخول وتحدد هل الشخص إداري أو لاعب معتمد أو عسكري أساسي، ثم تسكّنه على قسم ومسمى.", steps: ["اختر حالة الحساب", "حدد الفئة والقسم", "اختر المسمى — صلاحياته تطبق تلقائيًا", "راجع الصلاحيات الإضافية ثم احفظ"] },
  { match: "/dashboard/organization", title: "القيادة والأقسام والمسميات", what: "هنا يتغير الهيكل كاملًا بدون كود: أسماء الأقسام الأربعة، ألوانها، رموزها ومسميات كل قسم، مع بقاء الدورات منفصلة.", steps: ["اختر القسم من القائمة", "عدّل بياناته وطابعه", "عدّل المسميات وصلاحياتها", "احفظ القسم ثم المسميات"] },
  { match: "/dashboard/tracking", title: "الرصد والترقيات", what: "خاص بالشؤون الإدارية لتسجيل التقارير والساعات والدورات، واعتماد خصم تقارير أو نصف الشروط الرقمية بدون نظام نقاط.", steps: ["ابحث عن العسكري", "اختر الرصد أو تسهيلات الترقية", "أدخل العدد أو الساعات أو نوع الخصم", "احفظ — يظهر اسمك ومسمّاك تلقائيًا في السجل"] },
  { match: "/dashboard/military-police", title: "سجل الشرطة العسكرية", what: "لتسجيل مخالفات عساكر القطاع. الشرطة العسكرية ترشيح فقط ولا يوجد تقديم مباشر لها.", steps: ["اختر العسكري", "اكتب السبب والقيمة والإجراء", "حدد هل تم التنفيذ", "أضف الإثبات إن وجد ثم احفظ"] },
  { match: "/dashboard/map", title: "إدارة الخريطة", what: "ارسم المناطق الميدانية على خريطة المدينة نقطة بنقطة.", steps: ["اكتب اسم المنطقة واختر لونها", "فعّل الرسم", "اضغط حول حدود المنطقة ثلاث نقاط أو أكثر", "احفظ لتظهر في الخريطة العامة"] },
  { match: "/dashboard/schedule", title: "جدول القطاع والأرشيف", what: "هنا تدير سجل العساكر والأكواد والرتب وتحوّل المستقيل أو المفصول للأرشيف.", steps: ["ابحث عن العسكري", "حدّث الاسم والكود وكوبي آي دي والرتبة — الأكواد تُوزع داخليًا حسب الرتبة", "احفظ السطر", "عند الاستقالة أو الفصل اضغط الزر من نفس السطر واكتب التاريخ والسبب"] },
  { match: "/dashboard/applications", title: "طلبات الأقسام", what: "جميع طلبات الانضمام للأقسام تصل هنا للمراجعة.", steps: ["افتح الطلب", "راجع البيانات والإجابات", "حوّله لتحت المراجعة", "اقبل أو ارفض واكتب الملاحظة"] },
  { match: "/dashboard/content", title: "إدارة المحتوى", what: "أنشئ تعديلًا على القوانين أو البروتوكولات أو الترقيات أو الإجازات بدون نشر مباشر.", steps: ["اختر نوع المحتوى", "أضف أو عدّل البند", "أرسل المسودة للمراجعة", "صاحب صلاحية النشر يعتمدها"] },
  { match: "/dashboard/review", title: "طابور المراجعة", what: "هنا يعتمد صاحب صلاحية النشر التعديلات قبل ظهورها للعامة.", steps: ["راجع المسودة", "قارن التعديل", "اعتمد للنشر أو ارفض", "تأكد من النتيجة بالبوابة العامة"] },
  { match: "/dashboard", title: "مركز القيادة", what: "هذه الصفحة بداية الإدارة. لا تحتاج تدخل كل التبويبات؛ استخدم فقط القسم المرتبط بصلاحيتك.", steps: ["ابدأ من المهمة المطلوبة", "استخدم القائمة الجانبية", "راجع دليل الاستخدام عند الحاجة", "أي تغيير مهم يظهر في سجل التغييرات"] },
];

export default function DashboardHelp() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const item = useMemo(() => HELP.find(h => pathname.startsWith(h.match) && h.match !== "/dashboard") ?? HELP.find(h=>h.match==="/dashboard")!, [pathname]);
  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-5 left-5 z-40 flex h-12 items-center gap-2 rounded-full border border-[rgba(213,166,116,.22)] bg-[#151514]/95 px-4 text-xs font-black text-[#d5a674] shadow-[0_18px_50px_rgba(0,0,0,.42)] backdrop-blur-xl transition hover:-translate-y-0.5"><HelpCircle size={17}/> <span className="hidden sm:inline">كيف أستخدم هذي الصفحة؟</span></button>
    {open&&<div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center" onMouseDown={()=>setOpen(false)}><section onMouseDown={e=>e.stopPropagation()} className="glass-strong w-full max-w-xl rounded-[28px] p-5 sm:p-6" dir="rtl"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[rgba(213,166,116,.18)] bg-[rgba(213,166,116,.06)]"><Lightbulb size={18} className="bronze-text"/></span><div><p className="text-[10px] font-black text-zinc-700">مساعدة سريعة</p><h2 className="mt-1 text-xl font-black">{item.title}</h2></div></div><button onClick={()=>setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/[.07] text-zinc-600"><X size={16}/></button></div><p className="mt-4 text-sm leading-7 text-zinc-500">{item.what}</p><div className="mt-4 space-y-2">{item.steps.map((step,index)=><div key={step} className="flex items-center gap-3 rounded-[15px] border border-white/[.055] bg-black/20 px-3.5 py-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(213,166,116,.08)] text-[10px] font-black bronze-text">{index+1}</span><p className="text-xs font-bold text-zinc-500">{step}</p></div>)}</div><Link href="/dashboard/guide" className="mt-4 flex w-full items-center justify-center gap-2 rounded-[15px] bg-[#d5a674] px-4 py-3 text-xs font-black text-black">فتح دليل الاستخدام الكامل <ArrowLeft size={14}/></Link></section></div>}
  </>;
}
