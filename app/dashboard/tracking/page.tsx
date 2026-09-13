"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  BookOpenCheck,
  CheckCircle2,
  FilePlus2,
  Loader2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { can } from "@/lib/auth";
import { useCurrentProfile } from "@/lib/use-current-profile";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { DEMO_ROSTER, getResolvedRank, type PublicRosterEntry } from "@/lib/roster";
import { getPromotionRequirement, REPORT_TYPES, type ReportTypeKey } from "@/lib/promotions";

type TrackKind = ReportTypeKey | "attendance" | "course";
type Entry = {
  id: string;
  roster_id: string;
  kind: TrackKind;
  quantity: number;
  hours: number;
  course_name?: string | null;
  note?: string | null;
  recorded_by_name: string;
  recorded_by_title: string;
  created_at: string;
  person_name?: string;
};

type AdjustmentType = "report_discount" | "half_requirements";
type Adjustment = {
  id: string;
  roster_id: string;
  adjustment_type: AdjustmentType;
  report_kind?: ReportTypeKey | null;
  amount: number;
  note?: string | null;
  active: boolean;
  recorded_by_name: string;
  recorded_by_title: string;
  created_at: string;
};

const KIND_LABEL: Record<TrackKind, string> = {
  operations: "تقرير عمليات",
  area_officer: "تقرير ضابط منطقة",
  officer: "تقرير ضباط",
  duty_officer: "تقرير ضابط خفر",
  attendance: "ساعات تواجد",
  course: "دورة مكتملة",
};

const demoEntries: Entry[] = [
  {
    id: "t1",
    roster_id: "r3",
    kind: "operations",
    quantity: 2,
    hours: 0,
    note: "رصد تجريبي",
    recorded_by_name: "رئيس النظام — وضع المعاينة",
    recorded_by_title: "الشؤون الإدارية",
    created_at: new Date().toISOString(),
    person_name: "مثال عسكري",
  },
];

const demoAdjustments: Adjustment[] = [];

export default function TrackingPage() {
  const configured = isSupabaseConfigured();
  const { profile, loading: profileLoading } = useCurrentProfile();
  const allowed = Boolean(profile && (profile.is_owner || can(profile, "manage_personnel_tracking")));

  const [mode, setMode] = useState<"tracking" | "adjustments">("tracking");
  const [rows, setRows] = useState<PublicRosterEntry[]>(configured ? [] : DEMO_ROSTER.filter((r) => r.member_type === "sector_member"));
  const [entries, setEntries] = useState<Entry[]>(configured ? [] : demoEntries);
  const [adjustments, setAdjustments] = useState<Adjustment[]>(configured ? [] : demoAdjustments);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [kind, setKind] = useState<TrackKind>("operations");
  const [quantity, setQuantity] = useState(1);
  const [hours, setHours] = useState(1);
  const [course, setCourse] = useState("");
  const [note, setNote] = useState("");

  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("report_discount");
  const [reportKind, setReportKind] = useState<ReportTypeKey>("operations");
  const [discountAmount, setDiscountAmount] = useState(1);
  const [adjustmentNote, setAdjustmentNote] = useState("");

  async function load() {
    const s = getSupabase();
    if (!s) return;
    const [r, e, a] = await Promise.all([
      s.from("personnel_roster").select("*").eq("active", true).eq("member_type", "sector_member").order("name"),
      s.from("personnel_tracking_entries").select("*").order("created_at", { ascending: false }).limit(100),
      s.from("promotion_adjustments").select("*").eq("active", true).order("created_at", { ascending: false }).limit(120),
    ]);
    if (!r.error) setRows((r.data || []) as PublicRosterEntry[]);
    if (!e.error) setEntries((e.data || []) as Entry[]);
    if (!a.error) setAdjustments((a.data || []) as Adjustment[]);
  }

  useEffect(() => {
    if (configured && allowed) load();
  }, [configured, allowed]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => !q || [r.name, r.copy_id, r.job_code, getResolvedRank(r)].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [rows, search]);

  const person = rows.find((r) => r.id === selected);
  const rank = person ? getResolvedRank(person) : null;
  const promotion = getPromotionRequirement(rank);
  const personAdjustments = adjustments.filter((a) => a.roster_id === selected && a.active);
  const hasHalf = personAdjustments.some((a) => a.adjustment_type === "half_requirements");

  async function saveTracking() {
    if (!person || !profile) return;
    setSaving(true);
    setMessage("");
    const entry = {
      roster_id: person.id,
      kind,
      quantity: kind === "attendance" || kind === "course" ? 0 : Math.max(1, quantity),
      hours: kind === "attendance" ? Math.max(0.5, hours) : 0,
      course_name: kind === "course" ? course.trim() || null : null,
      note: note.trim() || null,
      recorded_by: profile.id,
      recorded_by_name: profile.name,
      recorded_by_title: profile.title || "بدون مسمى",
    };
    const s = getSupabase();
    if (!s) {
      setEntries((v) => [{ id: `demo-${Date.now()}`, ...entry, created_at: new Date().toISOString(), person_name: person.name } as Entry, ...v]);
      setMessage("تم الرصد في وضع المعاينة — يظهر اسمك ومسمّاك مع العملية.");
      setSaving(false);
      return;
    }
    const { error } = await s.from("personnel_tracking_entries").insert(entry);
    if (error) setMessage(error.message);
    else {
      setMessage("تم حفظ الرصد بنجاح.");
      setQuantity(1); setHours(1); setCourse(""); setNote("");
      await load();
    }
    setSaving(false);
  }

  async function saveAdjustment() {
    if (!person || !profile) return;
    if (adjustmentType === "half_requirements" && hasHalf) {
      setMessage("نصف الشروط مطبق بالفعل على هذا العسكري.");
      return;
    }
    setSaving(true);
    setMessage("");
    const payload = {
      roster_id: person.id,
      adjustment_type: adjustmentType,
      report_kind: adjustmentType === "report_discount" ? reportKind : null,
      amount: adjustmentType === "report_discount" ? Math.max(1, discountAmount) : 0,
      note: adjustmentNote.trim() || null,
      active: true,
      recorded_by: profile.id,
      recorded_by_name: profile.name,
      recorded_by_title: profile.title || "بدون مسمى",
    };
    const s = getSupabase();
    if (!s) {
      setAdjustments((v) => [{ id: `adj-${Date.now()}`, ...payload, created_at: new Date().toISOString() } as Adjustment, ...v]);
      setMessage("تم اعتماد التسهيل في وضع المعاينة.");
      setAdjustmentNote("");
      setSaving(false);
      return;
    }
    const { error } = await s.from("promotion_adjustments").insert(payload);
    if (error) setMessage(error.message);
    else {
      setMessage("تم اعتماد تسهيل الترقية وسيظهر في بطاقة العسكري.");
      setAdjustmentNote(""); setDiscountAmount(1);
      await load();
    }
    setSaving(false);
  }

  async function deactivateAdjustment(id: string) {
    const s = getSupabase();
    if (!s) {
      setAdjustments((v) => v.map((a) => a.id === id ? { ...a, active: false } : a));
      return;
    }
    await s.from("promotion_adjustments").update({ active: false, updated_at: new Date().toISOString() }).eq("id", id);
    await load();
  }

  if (profileLoading) return <div className="p-10 text-zinc-600">جارٍ التحقق من الصلاحية...</div>;
  if (!allowed) return <div className="rounded-[28px] border border-white/[.07] p-10 text-center"><ShieldCheck className="mx-auto text-zinc-700"/><h1 className="mt-4 text-2xl font-black">هذه الصفحة للشؤون الإدارية</h1><p className="mt-2 text-sm text-zinc-600">تحتاج صلاحية الرصد الإداري.</p></div>;

  return <div className="mx-auto max-w-[1450px] space-y-5">
    <header className="ds-page-hero p-6 sm:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="section-kicker">الرصد الإداري</p><h1 className="mt-3 text-4xl font-black">الرصد والترقيات</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">قسم واحد واضح للشؤون: رصد التقارير والساعات والدورات، أو اعتماد خصم تقارير / نصف الشروط. لا يوجد نظام نقاط.</p></div>
        <div className="inline-flex rounded-[18px] border border-white/[.07] bg-black/25 p-1.5">
          <button onClick={() => { setMode("tracking"); setMessage(""); }} className={`inline-flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-xs font-black transition ${mode === "tracking" ? "bg-[#d5a674] text-[#17110d]" : "text-zinc-600 hover:text-zinc-300"}`}><BookOpenCheck size={15}/> الرصد</button>
          <button onClick={() => { setMode("adjustments"); setMessage(""); }} className={`inline-flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-xs font-black transition ${mode === "adjustments" ? "bg-[#d5a674] text-[#17110d]" : "text-zinc-600 hover:text-zinc-300"}`}><BadgePercent size={15}/> تسهيلات الترقية</button>
        </div>
      </div>
    </header>

    <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="ds-panel p-5">
        <div className="flex items-center gap-2"><Search size={16} className="bronze-text"/><h2 className="font-black">اختر العسكري</h2></div>
        <div className="relative mt-4"><Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700"/><input className="ds-input pr-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اسم، كود، كوبي آي دي أو رتبة..."/></div>
        <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto slim-scrollbar">{filtered.map((r) => <button key={r.id} onClick={() => { setSelected(r.id); setMessage(""); }} className={`flex w-full items-center justify-between gap-3 rounded-[17px] border p-3 text-right transition ${selected === r.id ? "border-[rgba(213,166,116,.28)] bg-[rgba(213,166,116,.08)]" : "border-white/[.055] bg-black/15 hover:bg-white/[.025]"}`}><div><p className="text-sm font-black text-zinc-300">{r.name}</p><p className="mt-1 text-[10px] text-zinc-700">{getResolvedRank(r) || "—"} • {r.job_code || "—"} • Copy {r.copy_id || "—"}</p></div>{selected === r.id && <CheckCircle2 size={16} className="bronze-text"/>}</button>)}</div>
      </div>

      {mode === "tracking" ? <div className="ds-panel p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black bronze-text">عملية رصد جديدة</p><h2 className="mt-1 text-2xl font-black">{person?.name || "اختر عسكريًا أولًا"}</h2></div><span className="rounded-full border border-white/[.07] px-3 py-2 text-[9px] text-zinc-600">المسجل: {profile?.name} — {profile?.title}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-black text-zinc-600">نوع الرصد</span><select className="ds-input" value={kind} onChange={(e) => setKind(e.target.value as TrackKind)}>{REPORT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}<option value="attendance">ساعات التواجد</option><option value="course">دورة مكتملة</option></select></label>
        {kind === "attendance" ? <label><span className="mb-2 block text-xs font-black text-zinc-600">عدد الساعات</span><input type="number" step="0.5" min="0.5" className="ds-input" value={hours} onChange={(e) => setHours(Number(e.target.value))}/></label> : kind === "course" ? <label><span className="mb-2 block text-xs font-black text-zinc-600">اسم الدورة</span><input className="ds-input" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="مثال: دورة العمليات"/></label> : <label><span className="mb-2 block text-xs font-black text-zinc-600">عدد التقارير</span><input type="number" min="1" className="ds-input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}/></label>}
        <label className="sm:col-span-2"><span className="mb-2 block text-xs font-black text-zinc-600">ملاحظة اختيارية</span><textarea className="ds-input min-h-24" value={note} onChange={(e) => setNote(e.target.value)} placeholder="أي ملاحظة على الرصد..."/></label></div>
        <button onClick={saveTracking} disabled={!person || saving || (kind === "course" && !course.trim())} className="ds-primary mt-4 w-full">{saving ? <Loader2 className="animate-spin" size={17}/> : <FilePlus2 size={17}/>} حفظ الرصد</button>
        {message && <p className="mt-3 rounded-[14px] border border-white/[.06] p-3 text-xs text-zinc-500">{message}</p>}
      </div> : <div className="ds-panel p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black bronze-text">تسهيل معتمد للترقية</p><h2 className="mt-1 text-2xl font-black">{person?.name || "اختر عسكريًا أولًا"}</h2>{person && <p className="mt-2 text-xs text-zinc-600">{rank || "—"}{promotion ? ` ← ${promotion.targetRank}` : ""}</p>}</div><BadgePercent size={24} className="bronze-text"/></div>
        <div className="mt-5 rounded-[18px] border border-[rgba(213,166,116,.13)] bg-[rgba(213,166,116,.035)] p-4 text-xs leading-6 text-zinc-500"><strong className="text-[#e3bb8d]">نصف الشروط</strong> يخفض الشروط الرقمية فقط: المدة، ساعات التواجد والتقارير إلى النصف بالتقريب للأعلى. الدورات واعتماد القيادة تبقى مطلوبة. <strong className="text-[#e3bb8d]">خصم التقارير</strong> يخفض العدد المطلوب لنوع التقرير المحدد.</div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-black text-zinc-600">نوع التسهيل</span><select className="ds-input" value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}><option value="report_discount">خصم تقارير</option><option value="half_requirements">نصف شروط الترقية</option></select></label>
        {adjustmentType === "report_discount" ? <><label><span className="mb-2 block text-xs font-black text-zinc-600">نوع التقرير</span><select className="ds-input" value={reportKind} onChange={(e) => setReportKind(e.target.value as ReportTypeKey)}>{REPORT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></label><label><span className="mb-2 block text-xs font-black text-zinc-600">عدد التقارير المخصومة</span><input type="number" min="1" className="ds-input" value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))}/></label></> : <div className="rounded-[16px] border border-white/[.06] bg-black/20 p-4 text-xs text-zinc-500">{hasHalf ? "نصف الشروط مطبق حاليًا على هذا العسكري." : "سيتم تطبيق نصف الشروط الرقمية على الترقية الحالية في البطاقة."}</div>}
        <label className="sm:col-span-2"><span className="mb-2 block text-xs font-black text-zinc-600">سبب / ملاحظة</span><textarea className="ds-input min-h-24" value={adjustmentNote} onChange={(e) => setAdjustmentNote(e.target.value)} placeholder="مثال: مكافأة استثنائية معتمدة من القيادة..."/></label></div>
        <button onClick={saveAdjustment} disabled={!person || saving || (adjustmentType === "half_requirements" && hasHalf)} className="ds-primary mt-4 w-full">{saving ? <Loader2 className="animate-spin" size={17}/> : <SlidersHorizontal size={17}/>} اعتماد التسهيل</button>
        {message && <p className="mt-3 rounded-[14px] border border-white/[.06] p-3 text-xs text-zinc-500">{message}</p>}

        {person && <div className="mt-6 border-t border-white/[.06] pt-5"><div className="flex items-center justify-between"><h3 className="text-sm font-black">التسهيلات الفعالة</h3><span className="text-[10px] text-zinc-700">{personAdjustments.length} فعال</span></div><div className="mt-3 space-y-2">{personAdjustments.length === 0 ? <div className="rounded-[16px] border border-dashed border-white/[.07] p-5 text-center text-xs text-zinc-700">لا يوجد تسهيل حالي.</div> : personAdjustments.map((a) => <div key={a.id} className="flex items-start justify-between gap-3 rounded-[16px] border border-white/[.06] bg-black/20 p-3"><div><p className="text-xs font-black text-zinc-300">{a.adjustment_type === "half_requirements" ? "نصف شروط الترقية" : `خصم ${a.amount} ${REPORT_TYPES.find((x) => x.key === a.report_kind)?.label || "تقرير"}`}</p><p className="mt-1 text-[10px] text-zinc-700">اعتمده {a.recorded_by_name} — {a.recorded_by_title}</p>{a.note && <p className="mt-1 text-[10px] text-zinc-600">{a.note}</p>}</div><button onClick={() => deactivateAdjustment(a.id)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-red-500/15 bg-red-500/5 text-red-400" title="إلغاء التسهيل"><XCircle size={15}/></button></div>)}</div></div>}
      </div>}
    </section>

    <section className="overflow-hidden ds-panel"><div className="flex items-center gap-3 border-b border-white/[.06] p-5"><BookOpenCheck size={18} className="bronze-text"/><div><h2 className="font-black">آخر عمليات الرصد</h2><p className="mt-1 text-[10px] text-zinc-700">يبين من سجل العملية ومسمّاه وقت التسجيل.</p></div></div><div className="overflow-x-auto"><table className="ds-data-table w-full min-w-[980px] text-right text-xs"><thead><tr className="text-zinc-700"><th className="px-5 py-3">العسكري</th><th className="px-4 py-3">الرصد</th><th className="px-4 py-3">القيمة</th><th className="px-4 py-3">سجله</th><th className="px-4 py-3">المسمى</th><th className="px-4 py-3">الوقت</th></tr></thead><tbody>{entries.map((e) => { const r = rows.find((x) => x.id === e.roster_id); return <tr key={e.id} className="border-t border-white/[.05]"><td className="px-5 py-4 font-black text-zinc-300">{e.person_name || r?.name || "—"}</td><td className="px-4 py-4 text-zinc-500">{KIND_LABEL[e.kind]}</td><td className="px-4 py-4 font-black bronze-text">{e.kind === "attendance" ? `${e.hours} ساعة` : e.kind === "course" ? (e.course_name || "دورة") : e.quantity}</td><td className="px-4 py-4 text-zinc-400">{e.recorded_by_name}</td><td className="px-4 py-4 text-zinc-600">{e.recorded_by_title}</td><td className="px-4 py-4 text-zinc-700" dir="ltr">{new Date(e.created_at).toLocaleString("ar-SA")}</td></tr>; })}</tbody></table></div></section>
  </div>;
}
