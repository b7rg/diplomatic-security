import Link from "next/link";
import { ArrowLeft, CreditCard, FileQuestion, GitBranch, MapPinned, Search, ShieldAlert, ShieldCheck, UserCog, UsersRound } from "lucide-react";

const paths = [
  { title: "الشؤون الإدارية", icon: CreditCard, steps: ["افتح الرصد والترقيات وابحث عن العسكري.", "سجل التقرير أو ساعات التواجد؛ ويحفظ النظام اسمك ومسمّاك تلقائيًا.", "إذا عند العسكري تسهيل معتمد استخدم خصم التقارير أو نصف الشروط الرقمية."], href: "/dashboard/tracking", action: "فتح الرصد والترقيات" },
  { title: "الشرطة العسكرية", icon: ShieldAlert, steps: ["الانضمام للشرطة العسكرية بالترشيح فقط.", "اختر العسكري وسجل السبب والقيمة والإجراء.", "حدد هل تم التنفيذ ثم احفظ السجل."], href: "/dashboard/military-police", action: "فتح الشرطة العسكرية" },
  { title: "إدارة الأفراد والجدول", icon: ShieldCheck, steps: ["للإضافة اضغط إضافة فرد.", "اختر الفئة والرتبة ثم الكود المتاح.", "التعديل والاستقالة والفصل تتم من بطاقة الفرد نفسها."], href: "/dashboard/schedule", action: "فتح إدارة الأفراد" },
  { title: "إدارة الحسابات", icon: UserCog, steps: ["حدد فئة الحساب ثم القسم.", "اختر المسمى ليتم تحميل صلاحياته المعتمدة.", "أضف أي صلاحية استثنائية فقط عند الحاجة."], href: "/dashboard/accounts", action: "فتح الحسابات" },
  { title: "القيادة والأقسام", icon: GitBranch, steps: ["اختر القسم المطلوب.", "عدل الاسم أو اللون أو الرمز عند الحاجة.", "اربط كل مسمى بصلاحياته ثم احفظ."], href: "/dashboard/organization", action: "فتح إدارة الهيكل" },
  { title: "أسئلة كلية الضباط", icon: FileQuestion, steps: ["أضف أو عدل الأسئلة.", "حدد الإجباري والاختياري ورتب الأسئلة.", "النموذج العام يتحدث تلقائيًا."], href: "/dashboard/officer-college-questions", action: "فتح الأسئلة" },
  { title: "إدارة الخريطة", icon: MapPinned, steps: ["فعّل وضع الرسم.", "اضغط حول حدود المنطقة نقطة بنقطة.", "حدد الاسم واللون والوصف ثم احفظ."], href: "/dashboard/map", action: "فتح إدارة الخريطة" },
  { title: "البحث عن معلومة", icon: Search, steps: ["استخدم البحث داخل القوانين أو البروتوكولات.", "تأكد من النسخة المنشورة قبل اتخاذ الإجراء.", "إذا كان التعديل إداريًا ارفعه كمسودة ثم اعتمده."], href: "/dashboard/content", action: "فتح إدارة المحتوى" },
];

export default function DashboardGuidePage() {
  return <div className="mx-auto w-full max-w-[1500px] space-y-4">
    <header className="ds-page-hero p-6 sm:p-8">
      <p className="section-kicker">دليل المسؤولين</p>
      <h1 className="mt-3 text-4xl font-black md:text-5xl">كيف تستخدم مركز القيادة؟</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">هذا الدليل داخلي ويظهر بعد تسجيل الدخول فقط. اختر مهمتك واتبع الخطوات المختصرة.</p>
    </header>
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {paths.map((path, index) => { const Icon = path.icon; return <article key={path.title} className="ds-panel p-5"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[rgba(213,166,116,.14)] bg-[rgba(213,166,116,.05)]"><Icon size={19} className="bronze-text"/></span><span className="text-[10px] font-black text-zinc-800">{String(index+1).padStart(2,"0")}</span></div><h2 className="mt-5 text-lg font-black text-zinc-200">{path.title}</h2><div className="mt-4 space-y-2">{path.steps.map((step,i)=><div key={step} className="flex gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[.035] text-[9px] font-black text-zinc-600">{i+1}</span><p className="text-xs leading-6 text-zinc-600">{step}</p></div>)}</div><Link href={path.href} className="mt-5 inline-flex items-center gap-2 text-xs font-black bronze-text">{path.action} <ArrowLeft size={13}/></Link></article> })}
    </section>
  </div>;
}
