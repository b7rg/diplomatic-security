"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Archive,
  BadgeCheck,
  CheckCircle2,
  Crown,
  Edit3,
  Loader2,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  UserCog,
  UserRoundPlus,
  UserX,
  Users,
  X,
} from "lucide-react";
import { can } from "@/lib/auth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/lib/use-current-profile";
import { useOrganization } from "@/lib/use-organization";
import { DEPARTMENTS, MEMBER_TYPES, type MemberType } from "@/lib/site";
import {
  DEMO_DEPARTURES,
  DEMO_ROSTER,
  NON_MILITARY_CODE_FAMILIES,
  RANK_RULES,
  ROSTER_GROUPS,
  deriveMilitaryRank,
  getAvailableCodesForRank,
  getCodeTheme,
  getFormalDisplayName,
  getResolvedRank,
  normalizeFCode,
  rankOrder,
  type DepartureRecord,
  type DepartureType,
  type PublicRosterEntry,
} from "@/lib/roster";

const groupIcons: Record<MemberType, typeof Users> = {
  sector_member: ShieldCheck,
  approved_player: BadgeCheck,
  management: UserCog,
};

type RosterForm = {
  name: string;
  copy_id: string;
  member_type: MemberType;
  military_rank: string;
  job_code: string;
  title: string;
  department_key: string;
  discord_id: string;
  hired_at: string;
};

const emptyForm: RosterForm = {
  name: "",
  copy_id: "",
  member_type: "sector_member",
  military_rank: "جندي",
  job_code: "",
  title: "فرد",
  department_key: "",
  discord_id: "",
  hired_at: new Date().toISOString().slice(0, 10),
};

export default function RosterManagerPage() {
  const configured = isSupabaseConfigured();
  const { profile, loading: accessLoading } = useCurrentProfile();
  const { units } = useOrganization();
  const authorized = Boolean(
    profile &&
      (profile.is_owner ||
        can(profile, "manage_schedule") ||
        can(profile, "manage_accounts") ||
        can(profile, "manage_personnel_tracking")),
  );

  const [rows, setRows] = useState<PublicRosterEntry[]>(configured ? [] : DEMO_ROSTER);
  const [departures, setDepartures] = useState<DepartureRecord[]>(configured ? [] : DEMO_DEPARTURES);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<"all" | MemberType>("all");
  const [loading, setLoading] = useState(configured);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RosterForm>(emptyForm);
  const [archiveTab, setArchiveTab] = useState<"all" | DepartureType>("all");
  const [archiveSource, setArchiveSource] = useState<PublicRosterEntry | null>(null);
  const archiveRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<DepartureRecord>({
    person_name: "",
    copy_id: "",
    job_code: "",
    military_rank: "",
    departure_type: "resignation",
    reason: "",
    effective_date: new Date().toISOString().slice(0, 10),
  });

  const departmentOptions = useMemo(
    () =>
      [...units]
        .filter((unit) => unit.active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((unit) => ({ key: unit.key, name: unit.name })),
    [units],
  );

  async function load() {
    const s = getSupabase();
    if (!s) return;
    setLoading(true);
    const [rosterResult, departureResult] = await Promise.all([
      s.from("personnel_roster").select("*").eq("active", true).order("created_at", { ascending: true }),
      s.from("personnel_departures").select("*").order("effective_date", { ascending: false }),
    ]);
    if (!rosterResult.error) setRows((rosterResult.data ?? []) as PublicRosterEntry[]);
    if (!departureResult.error) setDepartures((departureResult.data ?? []) as DepartureRecord[]);
    if (rosterResult.error) setNotice(`تعذر تحميل الجدول: ${rosterResult.error.message}`);
    setLoading(false);
  }

  useEffect(() => {
    if (configured && authorized) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, authorized]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((row) => segment === "all" || row.member_type === segment)
      .filter(
        (row) =>
          !q ||
          [row.name, row.job_code, row.copy_id, row.title, getResolvedRank(row)]
            .some((value) => String(value ?? "").toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        if (a.member_type !== b.member_type) {
          return (
            ROSTER_GROUPS.findIndex((item) => item.key === a.member_type) -
            ROSTER_GROUPS.findIndex((item) => item.key === b.member_type)
          );
        }
        const rankDiff = rankOrder(getResolvedRank(a), a.job_code) - rankOrder(getResolvedRank(b), b.job_code);
        if (rankDiff) return rankDiff;
        return String(a.name).localeCompare(String(b.name), "ar");
      });
  }, [rows, search, segment]);

  const counts = useMemo(
    () => Object.fromEntries(ROSTER_GROUPS.map((group) => [group.key, rows.filter((row) => row.member_type === group.key).length])),
    [rows],
  );

  const availableCodes = useMemo(() => {
    if (form.member_type !== "sector_member") return [];
    const codes = getAvailableCodesForRank(form.military_rank, rows, editingId);
    const current = editingId ? normalizeFCode(form.job_code) : null;
    if (current && !codes.includes(current)) return [current, ...codes];
    return codes;
  }, [form.member_type, form.military_rank, form.job_code, rows, editingId]);

  const filteredDepartures = useMemo(
    () => departures.filter((row) => archiveTab === "all" || row.departure_type === archiveTab),
    [departures, archiveTab],
  );

  const banPreview = useMemo(() => {
    if (!archiveSource || draft.departure_type !== "resignation") return { required: false, reasons: [] as string[], until: "" };
    const rank = getResolvedRank(archiveSource) || archiveSource.military_rank || "";
    const reasons: string[] = [];
    if (archiveSource.appointment_rank && rank === archiveSource.appointment_rank) reasons.push("استقالة بنفس رتبة التعيين");
    const hired = archiveSource.hired_at ? new Date(archiveSource.hired_at) : null;
    const effective = draft.effective_date ? new Date(draft.effective_date) : new Date();
    if (hired && !Number.isNaN(hired.getTime()) && (effective.getTime() - hired.getTime()) < 14 * 86400000) reasons.push("استقالة خلال فترة التدريب (أقل من أسبوعين)");
    if (rank === "جندي" || rank === "جندي أول") reasons.push(`استقالة برتبة ${rank}`);
    const untilDate = new Date(effective); untilDate.setDate(untilDate.getDate() + 14);
    return { required: reasons.length > 0, reasons, until: untilDate.toISOString().slice(0, 10) };
  }, [archiveSource, draft.departure_type, draft.effective_date]);

  function openAdd() {
    const initialRank = "جندي";
    const firstCode = getAvailableCodesForRank(initialRank, rows, null)[0] ?? "F-700";
    setEditingId(null);
    setForm({ ...emptyForm, military_rank: initialRank, job_code: firstCode });
    setFormOpen(true);
    setNotice("");
    window.setTimeout(() => document.getElementById("roster-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function openEdit(row: PublicRosterEntry) {
    const rank = getResolvedRank(row) || row.military_rank || "جندي";
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      copy_id: row.copy_id ?? "",
      member_type: row.member_type,
      military_rank: rank,
      job_code: row.job_code ?? "",
      title: row.title ?? "",
      department_key: row.department_key ?? "",
      discord_id: row.discord_id ?? "",
      hired_at: (row.hired_at ?? row.created_at ?? new Date().toISOString()).slice(0,10),
    });
    setFormOpen(true);
    setNotice("");
    window.setTimeout(() => document.getElementById("roster-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function changeType(type: MemberType) {
    if (type === "sector_member") {
      const rank = form.military_rank || "جندي";
      const code = getAvailableCodesForRank(rank, rows, editingId)[0] ?? normalizeFCode(form.job_code) ?? "F-700";
      setForm((current) => ({ ...current, member_type: type, military_rank: rank, job_code: code }));
    } else {
      setForm((current) => ({ ...current, member_type: type, military_rank: "", job_code: "", department_key: "" }));
    }
  }

  function changeRank(rank: string) {
    const code = getAvailableCodesForRank(rank, rows, editingId)[0] ?? "";
    setForm((current) => ({ ...current, military_rank: rank, job_code: code }));
  }

  async function saveRoster(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    const copyId = form.copy_id.trim();
    const code = form.member_type === "sector_member" ? normalizeFCode(form.job_code) : form.job_code.trim().toUpperCase();
    const rank = form.member_type === "sector_member" ? deriveMilitaryRank(code) : form.military_rank.trim() || null;
    if (!name || !copyId || !code) {
      setNotice("كمّل الاسم وكوبي آي دي والكود قبل الحفظ.");
      return;
    }
    const duplicateCode = rows.some(
      (row) => row.id !== editingId && row.member_type === form.member_type && String(row.job_code ?? "").toUpperCase() === String(code).toUpperCase(),
    );
    if (duplicateCode) {
      setNotice("هذا الكود مستخدم مسبقًا داخل نفس الفئة.");
      return;
    }
    const duplicateCopy = rows.some((row) => row.id !== editingId && String(row.copy_id ?? "") === copyId);
    if (duplicateCopy) {
      setNotice("هذا كوبي آي دي موجود في الجدول مسبقًا.");
      return;
    }

    const payload = {
      name,
      copy_id: copyId,
      job_code: code,
      military_rank: rank,
      title: form.title.trim() || (form.member_type === "sector_member" ? "فرد" : "عضو"),
      member_type: form.member_type,
      department_key: form.department_key || null,
      discord_id: form.discord_id.trim() || null,
      hired_at: form.hired_at || new Date().toISOString().slice(0,10),
      appointment_rank: editingId ? (rows.find(r=>r.id===editingId)?.appointment_rank || rank) : rank,
    };

    if (!configured) {
      if (editingId) {
        setRows((current) => current.map((row) => (row.id === editingId ? { ...row, ...payload } as PublicRosterEntry : row)));
        setNotice(`وضع المعاينة: تم تعديل ${name} محليًا.`);
      } else {
        setRows((current) => [...current, { id: `demo-${Date.now()}`, personnel_state: "active", ...payload } as PublicRosterEntry]);
        setNotice(`وضع المعاينة: تمت إضافة ${name} محليًا.`);
      }
      closeForm();
      return;
    }

    const s = getSupabase();
    if (!s) return;
    setSaving("roster");
    const result = editingId
      ? await s.rpc("update_roster_member_v55", {
          p_roster_id: editingId,
          p_name: payload.name,
          p_job_code: payload.job_code,
          p_copy_id: payload.copy_id,
          p_military_rank: payload.military_rank,
          p_title: payload.title,
          p_member_type: payload.member_type,
          p_department_key: payload.department_key,
          p_discord_id: payload.discord_id,
          p_hired_at: payload.hired_at,
        })
      : await s.rpc("create_roster_member_v55", {
          p_name: payload.name,
          p_job_code: payload.job_code,
          p_copy_id: payload.copy_id,
          p_military_rank: payload.military_rank,
          p_title: payload.title,
          p_member_type: payload.member_type,
          p_department_key: payload.department_key,
          p_discord_id: payload.discord_id,
          p_hired_at: payload.hired_at,
        });
    setSaving(null);
    if (result.error) {
      setNotice(`تعذر الحفظ: ${result.error.message}`);
      return;
    }
    setNotice(editingId ? `تم تعديل ${name} في جدول الأفراد.` : `تمت إضافة ${name} إلى جدول الأفراد.`);
    closeForm();
    await load();
  }

  function prepareArchive(row: PublicRosterEntry, type: DepartureType) {
    setArchiveSource(row);
    setDraft({
      roster_id: row.id,
      profile_id: row.profile_id ?? null,
      person_name: row.name,
      copy_id: row.copy_id || "",
      job_code: row.job_code || "",
      military_rank: getResolvedRank(row) || row.military_rank || "",
      departure_type: type,
      reason: "",
      effective_date: new Date().toISOString().slice(0, 10),
    });
    window.setTimeout(() => archiveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  async function saveDeparture() {
    if (!draft.person_name.trim() || !draft.copy_id.trim() || !draft.reason.trim() || !draft.effective_date) {
      setNotice("كمّل الاسم وكوبي آي دي والتاريخ والسبب قبل الحفظ.");
      return;
    }
    if (!configured) {
      const item = { ...draft, id: `demo-${Date.now()}`, ban_required: banPreview.required, ban_until: banPreview.required ? banPreview.until : null, ban_reason: banPreview.reasons.join(" + ") || null };
      setDepartures((current) => [item, ...current]);
      if (draft.roster_id) setRows((current) => current.filter((row) => row.id !== draft.roster_id));
      setNotice("وضع المعاينة: تم نقل السجل إلى الأرشيف محليًا.");
      resetDraft();
      return;
    }
    if (!draft.roster_id) { setNotice("اختر فردًا من القوة الحالية أولًا."); return; }
    const s = getSupabase();
    if (!s) return;
    setSaving("departure");
    const { error } = await s.rpc("archive_roster_member_v2", {
      p_roster_id: draft.roster_id,
      p_departure_type: draft.departure_type,
      p_reason: draft.reason,
      p_effective_date: draft.effective_date,
    });
    setSaving(null);
    setNotice(error ? `تعذر الأرشفة: ${error.message}` : "تم نقل الفرد من القوة الحالية إلى سجل الاستقالات والفصل.");
    if (!error) {
      resetDraft();
      await load();
    }
  }

  function resetDraft() {
    setArchiveSource(null);
    setDraft({
      person_name: "",
      copy_id: "",
      job_code: "",
      military_rank: "",
      departure_type: "resignation",
      reason: "",
      effective_date: new Date().toISOString().slice(0, 10),
    });
  }

  if (accessLoading) return <div className="glass rounded-[28px] p-10 text-center text-zinc-600">جارٍ التحقق من الصلاحية...</div>;
  if (!authorized) return <div className="glass rounded-[28px] p-10 text-center">غير مصرح لك بإدارة جدول القطاع.</div>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="glass rounded-[28px] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="section-kicker">إدارة الأفراد</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">إدارة أفراد القطاع</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-zinc-600">نفس فكرة نظام الميكانيك: أضف الفرد من هنا، اختر رتبته، خذ كودًا متاحًا، وعدّل أو انقل للأرشيف من نفس البطاقة.</p>
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-[16px] bg-[#d5a674] px-5 py-3.5 text-sm font-black text-[#17110d] transition hover:-translate-y-0.5 hover:bg-[#e7bb88]">
            <UserRoundPlus size={18} /> إضافة فرد
          </button>
        </div>
      </header>

      {!configured && (
        <div className="rounded-[18px] border border-[rgba(213,166,116,.14)] bg-[rgba(213,166,116,.04)] p-4 text-xs text-zinc-500">وضع المعاينة — الإضافة والتعديل يعملان محليًا. للحفظ الدائم اربط قاعدة البيانات وشغّل تحديث قاعدة البيانات المطلوب.</div>
      )}
      {notice && (
        <div className="flex items-center gap-3 rounded-[18px] border border-[rgba(127,155,140,.16)] bg-[rgba(127,155,140,.04)] p-4 text-xs text-zinc-500"><CheckCircle2 size={16} className="text-[#8eaa99]" /> {notice}</div>
      )}

      {formOpen && (
        <section id="roster-form" className="scroll-mt-8 overflow-hidden rounded-[28px] border border-[rgba(213,166,116,.19)] bg-[linear-gradient(145deg,rgba(31,28,25,.86),rgba(13,14,14,.9))] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black bronze-text">{editingId ? "تعديل بيانات الفرد" : "إضافة فرد جديد"}</p>
              <h2 className="mt-1 text-2xl font-black">{editingId ? "تعديل بيانات الفرد" : "إضافة فرد جديد"}</h2>
              <p className="mt-2 text-xs text-zinc-600">لعساكر القطاع: اختَر الرتبة وسيعرض النظام الأكواد المتاحة فقط، مثل نظام الميكانيك.</p>
            </div>
            <button onClick={closeForm} className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[.08] bg-white/[.025] text-zinc-500 transition hover:text-white" aria-label="إغلاق"><X size={18} /></button>
          </div>

          <form onSubmit={saveRoster} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="الاسم">
              <input className="ds-input" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="اسم الفرد داخل القطاع" />
            </Field>
            <Field label="كوبي آي دي">
              <input className="ds-input" value={form.copy_id} onChange={(e) => setForm((v) => ({ ...v, copy_id: e.target.value }))} placeholder="مثال: 245" />
            </Field>
            <Field label="معرّف الديسكورد" hint="لبحث البطاقة">
              <input className="ds-input font-mono" dir="ltr" value={form.discord_id} onChange={(e) => setForm((v) => ({ ...v, discord_id: e.target.value }))} placeholder="741060063740821594" />
            </Field>
            <Field label="تاريخ التعيين">
              <input type="date" className="ds-input" value={form.hired_at} onChange={(e) => setForm((v) => ({ ...v, hired_at: e.target.value }))} />
            </Field>
            <Field label="الفئة">
              <select className="ds-input" value={form.member_type} onChange={(e) => changeType(e.target.value as MemberType)}>
                {MEMBER_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
              </select>
            </Field>

            {form.member_type === "sector_member" ? (
              <>
                <Field label="الرتبة">
                  <select className="ds-input" value={form.military_rank} onChange={(e) => changeRank(e.target.value)}>
                    {RANK_RULES.slice().reverse().map((rule) => <option key={rule.rank} value={rule.rank}>{rule.rank}</option>)}
                  </select>
                </Field>
                <Field label="الكود المتاح" hint={`المتبقي ${availableCodes.length}`}>
                  <select className="ds-input font-mono" dir="ltr" value={form.job_code} onChange={(e) => setForm((v) => ({ ...v, job_code: e.target.value }))}>
                    {availableCodes.length ? availableCodes.map((code) => <option key={code} value={code}>{code}</option>) : <option value="">لا يوجد كود متاح</option>}
                  </select>
                </Field>
              </>
            ) : (
              <Field label="الكود" hint={form.member_type === "approved_player" ? "C / CA" : "AM / S / M / F / A / A+"}>
                <input className="ds-input font-mono" dir="ltr" value={form.job_code} onChange={(e) => setForm((v) => ({ ...v, job_code: e.target.value.toUpperCase() }))} placeholder={form.member_type === "approved_player" ? "C-044" : "A-021"} />
              </Field>
            )}

            <Field label="المسمى / المنصب">
              <input className="ds-input" value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} placeholder="مثال: قائد الأمن الدبلوماسي / مسؤول جدول" />
            </Field>

            <Field label="الجهة داخل القطاع" hint="اختياري">
              <select className="ds-input" value={form.department_key} onChange={(e) => setForm((v) => ({ ...v, department_key: e.target.value }))}>
                <option value="">بدون جهة محددة</option>
                {departmentOptions.map((unit) => <option key={unit.key} value={unit.key}>{unit.name}</option>)}
              </select>
            </Field>

            {form.member_type === "sector_member" && (
              <div className="rounded-[18px] border border-white/[.07] bg-black/20 p-4">
                <p className="text-[10px] font-black text-zinc-700">التعريف الناتج</p>
                <p className="mt-2 text-sm font-black text-zinc-300">{getFormalDisplayName({ name: form.name || "الاسم", job_code: form.job_code, title: form.title, member_type: form.member_type, military_rank: form.military_rank })}</p>
              </div>
            )}

            <button type="submit" disabled={saving === "roster" || !form.job_code} className="inline-flex items-center justify-center gap-2 rounded-[17px] bg-[#d5a674] p-4 font-black text-[#17110d] transition hover:bg-[#e7bb88] disabled:cursor-not-allowed disabled:opacity-45 md:col-span-2 xl:col-span-3">
              {saving === "roster" ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {editingId ? "حفظ التعديل" : "إضافة الفرد للجدول"}
            </button>
          </form>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="إجمالي القوة الحالية" value={rows.length} icon={Users} />
        <Metric label="عساكر وقيادات القطاع" value={counts.sector_member ?? 0} icon={ShieldCheck} accent />
        <Metric label="القيادات والمعتمدون" value={counts.approved_player ?? 0} icon={BadgeCheck} />
        <Metric label="الإدارة والمسؤولون" value={counts.management ?? 0} icon={UserCog} />
      </section>

      <section className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative"><Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-700" /><input className="ds-input py-3 pr-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم، الكود، كوبي آي دي، الرتبة أو المسمى..." /></div>
        <select className="ds-input min-w-52 py-3" value={segment} onChange={(e) => setSegment(e.target.value as "all" | MemberType)}><option value="all">جميع الفئات</option>{ROSTER_GROUPS.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}</select>
        <button onClick={load} disabled={!configured} className="inline-flex items-center justify-center gap-2 rounded-[15px] border border-white/[.07] px-4 py-3 text-xs font-black text-zinc-600 disabled:opacity-30"><RefreshCcw size={15} /> تحديث</button>
      </section>

      <div className="space-y-5">
        {loading ? <div className="h-80 animate-pulse rounded-[28px] bg-white/[.02]" /> : ROSTER_GROUPS.map((group) => {
          if (segment !== "all" && segment !== group.key) return null;
          const groupRows = filtered.filter((row) => row.member_type === group.key);
          const Icon = groupIcons[group.key];
          return (
            <section key={group.key} className="overflow-hidden rounded-[28px] border border-white/[.07] bg-white/[.012]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.06] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[rgba(213,166,116,.14)] bg-[rgba(213,166,116,.04)]"><Icon size={17} className="bronze-text" /></span><div><h2 className="font-black text-zinc-200">{group.label}</h2><p className="mt-1 text-[10px] text-zinc-700">{group.description}</p></div></div>
                <span className="rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] font-black text-zinc-600">{groupRows.length} مسجل</span>
              </div>
              {groupRows.length ? (
                <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-2 2xl:grid-cols-3">
                  {groupRows.map((row) => <RosterCard key={row.id} row={row} onEdit={() => openEdit(row)} onArchive={prepareArchive} />)}
                </div>
              ) : <div className="px-6 py-10 text-center text-xs text-zinc-700">لا توجد نتائج في هذا القسم.</div>}
            </section>
          );
        })}
      </div>

      <section className="rounded-[24px] border border-white/[.055] bg-white/[.012] p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-black text-zinc-300">دليل ألوان الرتب</p><p className="mt-1 text-[9px] text-zinc-700">لون ثابت لكل رتبة لقراءة الجدول بسرعة.</p></div><Crown size={17} className="bronze-text" /></div>
        <div className="flex gap-2 overflow-x-auto pb-1 slim-scrollbar">{RANK_RULES.map((rule) => <div key={rule.rank} className="min-w-max rounded-xl border px-3 py-2" style={{ borderColor: rule.border, background: rule.soft }}><span className="text-[10px] font-black" style={{ color: rule.color }}>{rule.rank}</span></div>)}</div>
      </section>

      <section className="rounded-[22px] border border-white/[.055] bg-white/[.012] p-4"><div className="mb-3"><p className="text-xs font-black text-zinc-300">أكواد المعتمد والإدارة</p><p className="mt-1 text-[9px] text-zinc-700">الفئة تفصل بين F العسكري وF الإداري.</p></div><div className="flex flex-wrap gap-2">{NON_MILITARY_CODE_FAMILIES.map((item) => { const theme = getCodeTheme(item.group, item.code); return <span key={`${item.group}-${item.code}`} className="rounded-xl border px-3 py-2 text-[10px] font-black" style={{ color: theme.color, borderColor: theme.border, background: theme.soft }}><b dir="ltr" className="font-mono">{item.code}</b><span className="mr-2 text-zinc-600">{item.label}</span></span>; })}</div></section>

      <section ref={archiveRef} className="scroll-mt-8 overflow-hidden rounded-[28px] border border-[rgba(183,106,91,.14)] bg-[rgba(183,106,91,.025)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.055] p-5 sm:p-6"><div className="flex items-center gap-3"><Archive size={19} className="text-[#c87a6b]" /><div><h2 className="font-black">سجل الاستقالات والفصل</h2><p className="mt-1 text-xs text-zinc-700">منفصل عن القوة الحالية، مع التاريخ والسبب وكوبي آي دي.</p></div></div><div className="flex gap-2">{[{ key: "all", label: "الكل" }, { key: "resignation", label: "استقالات" }, { key: "dismissal", label: "فصل" }].map((tab) => <button key={tab.key} onClick={() => setArchiveTab(tab.key as any)} className={`rounded-[13px] border px-3 py-2 text-[10px] font-black ${archiveTab === tab.key ? "border-[rgba(183,106,91,.22)] bg-[rgba(183,106,91,.09)] text-[#d58a7b]" : "border-white/[.06] text-zinc-700"}`}>{tab.label}</button>)}</div></div>

        {draft.roster_id && (
          <div className="border-b border-white/[.055] p-5 sm:p-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Field label="العسكري"><input className="ds-input" value={draft.person_name} readOnly /></Field>
              <Field label="كوبي آي دي"><input className="ds-input" value={draft.copy_id} readOnly /></Field>
              <Field label="النوع"><select className="ds-input" value={draft.departure_type} onChange={(e) => setDraft((v) => ({ ...v, departure_type: e.target.value as DepartureType }))}><option value="resignation">استقالة</option><option value="dismissal">فصل</option></select></Field>
              <Field label="التاريخ"><input type="date" className="ds-input" value={draft.effective_date} onChange={(e) => setDraft((v) => ({ ...v, effective_date: e.target.value }))} /></Field>
              <Field label="السبب"><input className="ds-input" value={draft.reason} onChange={(e) => setDraft((v) => ({ ...v, reason: e.target.value }))} placeholder="اكتب السبب" /></Field>
            </div>
            {draft.departure_type === "resignation" && archiveSource && <div className={`mt-3 rounded-[16px] border p-4 text-xs ${banPreview.required ? "border-red-500/20 bg-red-500/[.05] text-red-300" : "border-emerald-500/15 bg-emerald-500/[.04] text-emerald-400"}`}>{banPreview.required ? <><p className="font-black">يستحق منع توظيف 14 يوم — حتى {banPreview.until}</p><p className="mt-2 text-[10px] opacity-80">السبب: {banPreview.reasons.join(" • ")}</p></> : <p className="font-black">لا تنطبق حالات منع التوظيف المحددة على هذه الاستقالة.</p>}</div>}
            <div className="mt-3 flex justify-end gap-2"><button onClick={resetDraft} className="rounded-[14px] border border-white/[.07] px-4 py-2.5 text-xs font-black text-zinc-600">إلغاء</button><button onClick={saveDeparture} disabled={saving === "departure"} className="inline-flex items-center gap-2 rounded-[14px] bg-[#b76a5b] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving === "departure" ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />} اعتماد ونقل للأرشيف</button></div>
          </div>
        )}

        <div className="overflow-x-auto"><table className="ds-data-table w-full min-w-[850px] text-right"><thead><tr className="text-[10px] font-black text-zinc-700"><th className="px-5 py-3">الحالة</th><th className="px-4 py-3">العسكري</th><th className="px-4 py-3">الكود</th><th className="px-4 py-3">كوبي آي دي</th><th className="px-4 py-3">التاريخ</th><th className="px-4 py-3">السبب</th><th className="px-4 py-3">منع التوظيف</th></tr></thead><tbody>{filteredDepartures.map((row) => <tr key={row.id ?? `${row.person_name}-${row.effective_date}`} className="border-t border-white/[.045]"><td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${row.departure_type === "dismissal" ? "border-red-500/20 bg-red-500/5 text-red-400" : "border-orange-500/20 bg-orange-500/5 text-orange-300"}`}>{row.departure_type === "dismissal" ? "فصل" : "استقالة"}</span></td><td className="px-4 py-4 text-xs font-black text-zinc-300">{row.person_name}</td><td className="px-4 py-4 font-mono text-xs text-zinc-500" dir="ltr">{row.job_code || "—"}</td><td className="px-4 py-4 font-mono text-xs text-zinc-500">{row.copy_id}</td><td className="px-4 py-4 text-xs text-zinc-600">{row.effective_date}</td><td className="px-4 py-4 text-xs text-zinc-500">{row.reason}</td><td className="px-4 py-4 text-xs">{row.ban_required?<span className="font-black text-red-400">14 يوم — حتى {row.ban_until}</span>:<span className="text-zinc-700">لا يوجد</span>}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center justify-between gap-2 text-xs font-black text-zinc-500"><span>{label}</span>{hint && <span className="text-[9px] font-bold text-zinc-700">{hint}</span>}</span>{children}</label>;
}

function Metric({ label, value, icon: Icon, accent = false }: { label: string; value: number; icon: typeof Users; accent?: boolean }) {
  return <div className={`rounded-[24px] border p-4 ${accent ? "border-[rgba(213,166,116,.16)] bg-[rgba(213,166,116,.045)]" : "border-white/[.06] bg-white/[.014]"}`}><div className="flex items-center justify-between"><p className="text-[10px] font-black text-zinc-700">{label}</p><Icon size={16} className={accent ? "bronze-text" : "text-zinc-700"} /></div><p className={`metric-number mt-3 text-3xl font-black ${accent ? "bronze-text" : "text-zinc-200"}`}>{value}</p></div>;
}

function RosterCard({ row, onEdit, onArchive }: { row: PublicRosterEntry; onEdit: () => void; onArchive: (row: PublicRosterEntry, type: DepartureType) => void }) {
  const rank = getResolvedRank(row);
  const theme = getCodeTheme(row.member_type, row.job_code);
  const department = row.department_key ? (DEPARTMENTS.find((item) => item.key === row.department_key)?.name ?? row.department_key) : "";
  return <article className="relative overflow-hidden rounded-[22px] border bg-black/20 p-4 transition hover:-translate-y-0.5" style={{ borderColor: theme.border }}>
    <div className="pointer-events-none absolute -left-12 -top-12 h-28 w-28 rounded-full blur-[65px]" style={{ background: theme.soft }} />
    <div className="relative">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-zinc-200">{getFormalDisplayName(row)}</p><p className="mt-1 truncate text-[10px] text-zinc-700">{row.title || "بدون مسمى"}{department ? ` • ${department}` : ""}</p></div><span className="shrink-0 rounded-[11px] border px-2.5 py-1.5 font-mono text-[10px] font-black" dir="ltr" style={{ color: theme.color, borderColor: theme.border, background: theme.soft }}>{row.job_code || "—"}</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-[13px] border border-white/[.055] bg-white/[.016] p-3"><p className="text-[9px] font-black text-zinc-700">الرتبة</p><p className="mt-1 text-xs font-black" style={{ color: theme.color }}>{rank || "—"}</p></div><div className="rounded-[13px] border border-white/[.055] bg-white/[.016] p-3"><p className="text-[9px] font-black text-zinc-700">كوبي آي دي</p><p className="mt-1 font-mono text-xs font-black text-zinc-400">{row.copy_id || "—"}</p></div></div>
      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2"><button onClick={onEdit} className="inline-flex items-center justify-center gap-2 rounded-[13px] border border-[rgba(213,166,116,.15)] bg-[rgba(213,166,116,.05)] px-3 py-2.5 text-[10px] font-black bronze-text"><Edit3 size={13} /> تعديل</button><button onClick={() => onArchive(row, "resignation")} className="rounded-[13px] border border-orange-500/15 bg-orange-500/[.04] px-3 py-2.5 text-[10px] font-black text-orange-300">استقالة</button><button onClick={() => onArchive(row, "dismissal")} className="flex items-center justify-center rounded-[13px] border border-red-500/15 bg-red-500/[.04] px-3 py-2.5 text-red-400" title="فصل"><UserX size={14} /></button></div>
    </div>
  </article>;
}
