import Link from "next/link";
import { ArrowRight, Clock3, FileText, GraduationCap, ShieldCheck } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { PROMOTION_REQUIREMENTS } from "@/lib/promotions";

export default function PromotionsPage() {
  const soldiers = PROMOTION_REQUIREMENTS.filter((x) => !["ملازم","ملازم أول","نقيب","رائد","مقدم ركن","عقيد ركن","عميد ركن"].includes(x.currentRank));
  const officers = PROMOTION_REQUIREMENTS.filter((x) => !soldiers.includes(x));
  return <main className="min-h-screen"><Navbar/><div className="mx-auto max-w-[1500px] px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:px-8">
    <Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-zinc-600 hover:text-[#d5a674]"><ArrowRight size={15}/> الرئيسية</Link>
    <header className="mt-4 rounded-[30px] border border-white/[.08] bg-[linear-gradient(135deg,rgba(27,24,21,.9),rgba(9,9,9,.88))] p-6 sm:p-8">
      <p className="section-kicker">نظام الترقيات</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">شروط ترقيات الأمن الدبلوماسي</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-500">الشروط مربوطة بالرتبة الحالية: المدة، ساعات التواجد، التقارير، الدورات والاعتمادات. وجود إنذار وظيفي أو مخالفة مؤثرة قد يوقف استحقاق الترقية، والقيادة تملك قرار الاعتماد النهائي.</p>
    </header>
    <div className="mt-5 rounded-[22px] border border-[rgba(213,166,116,.16)] bg-[linear-gradient(90deg,rgba(213,166,116,.055),rgba(255,255,255,.012))] p-5 text-sm leading-7 text-zinc-500"><strong className="text-[#e6bc8a]">تسهيلات الترقية:</strong> يمكن للجهة المخولة اعتماد خصم عدد محدد من التقارير أو نصف الشروط الرقمية للعسكري. نصف الشروط يشمل المدة والساعات والتقارير فقط؛ الدورات وموافقة القيادة لا تُلغى. بطاقة العسكري تعرض الشرط الفعلي بعد أي تسهيل معتمد.</div>
    <PromotionTable title="ترقيات الأفراد" rows={soldiers}/>
    <PromotionTable title="ترقيات الضباط" rows={officers}/>
    <div className="mt-4 rounded-[22px] border border-[#8f3028]/30 bg-[#8f3028]/10 p-5 text-sm font-black text-[#e39a8f]">تنبيه: زمن الترقية والشروط قابلة للتعديل من القيادة، والاستحقاق لا يعني الترقية الآلية.</div>
  </div><Footer/></main>
}
function PromotionTable({title,rows}:{title:string;rows:typeof PROMOTION_REQUIREMENTS}){
  return <section className="mt-5 overflow-hidden rounded-[28px] border border-white/[.07] bg-white/[.012]"><div className="border-b border-white/[.06] p-5"><h2 className="text-2xl font-black">{title}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-right text-sm"><thead className="bg-[#5a3a21]/45 text-[#edc28e]"><tr><th className="px-5 py-4">الترقية</th><th className="px-4 py-4"><Clock3 size={14} className="ml-1 inline"/> المدة</th><th className="px-4 py-4">ساعات التواجد</th><th className="px-4 py-4"><FileText size={14} className="ml-1 inline"/> التقارير</th><th className="px-4 py-4"><GraduationCap size={14} className="ml-1 inline"/> الدورات</th><th className="px-4 py-4"><ShieldCheck size={14} className="ml-1 inline"/> الاعتماد</th></tr></thead><tbody>{rows.map((r)=><tr key={r.currentRank} className="border-t border-white/[.05]"><td className="px-5 py-4 font-black text-zinc-200">{r.currentRank} ← {r.targetRank}</td><td className="px-4 py-4 text-zinc-500">{r.minimumDays} يوم</td><td className="px-4 py-4 font-black text-[#d5a674]">{r.minimumHours} ساعة</td><td className="px-4 py-4 text-zinc-500">{reportText(r)}</td><td className="px-4 py-4 text-zinc-500">{r.requiredCourses.join(" + ")}</td><td className="px-4 py-4 text-zinc-500">{r.specialCondition||"استكمال جميع المتطلبات"}</td></tr>)}</tbody></table></div></section>
}
function reportText(r:(typeof PROMOTION_REQUIREMENTS)[number]){const p:string[]=[];if(r.operationsReports)p.push(`${r.operationsReports} عمليات`);if(r.areaOfficerReports)p.push(`${r.areaOfficerReports} ضابط منطقة`);if(r.officerReports)p.push(`${r.officerReports} ضباط`);if(r.dutyOfficerReports)p.push(`${r.dutyOfficerReports} ضابط خفر`);return p.join(" + ")||"—"}
