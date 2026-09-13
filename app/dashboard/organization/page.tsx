"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, CirclePlus, Save, SlidersHorizontal } from "lucide-react";
import { DepartmentIcon, DEPARTMENT_ACCENT_OPTIONS, DEPARTMENT_ICON_OPTIONS, DEPARTMENT_TONES } from "@/components/department-visual";
import { can } from "@/lib/auth";
import { type OrgTitle, type OrgUnit } from "@/lib/organization-data";
import { PERMISSIONS, type DepartmentAccent, type DepartmentIconKey, type Permission } from "@/lib/site";
import { getSupabase } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/lib/use-current-profile";
import { useOrganization } from "@/lib/use-organization";

export default function OrganizationControlPage() {
  const { profile, loading: profileLoading } = useCurrentProfile();
  const allowed = Boolean(profile && (profile.is_owner || can(profile, "manage_organization") || can(profile, "edit_structure")));
  const { configured, units, titles, loading, reload, setUnits, setTitles } = useOrganization({ includeInactive: true });
  const [selectedKey, setSelectedKey] = useState("command");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");

  const selected = units.find(u => u.key === selectedKey) ?? units[0];
  const selectedTitles = useMemo(() => titles.filter(t => t.unit_key === selected?.key).sort((a,b)=>a.sort_order-b.sort_order), [titles, selected]);

  function patchUnit(patch: Partial<OrgUnit>) {
    if (!selected) return;
    setUnits(prev => prev.map(u => u.key === selected.key ? { ...u, ...patch } : u));
  }
  function patchTitle(id: string, patch: Partial<OrgTitle>) {
    setTitles(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }
  function togglePermission(title: OrgTitle, permission: Permission) {
    patchTitle(title.id, { permission_keys: title.permission_keys.includes(permission) ? title.permission_keys.filter(p => p !== permission) : [...title.permission_keys, permission] });
  }

  async function saveUnit() {
    if (!selected) return;
    setSaving(`unit:${selected.key}`); setNotice("");
    if (configured) {
      const supabase = getSupabase();
      const { error } = await supabase!.from("organization_units").upsert({
        key: selected.key, name: selected.name, kind: selected.kind, description: selected.description,
        accent: selected.accent, icon_key: selected.icon_key, sort_order: selected.sort_order,
        active: selected.active, application_enabled: selected.application_enabled,
      }, { onConflict: "key" });
      setNotice(error ? `تعذر الحفظ: ${error.message}` : "تم حفظ بيانات القسم.");
      if (!error) await reload();
    } else setNotice("تم تحديث القسم داخل وضع المعاينة. عند ربط قاعدة البيانات يصبح الحفظ دائمًا.");
    setSaving("");
  }

  async function saveTitle(title: OrgTitle) {
    setSaving(`title:${title.id}`); setNotice("");
    if (configured) {
      const supabase = getSupabase();
      const isPreviewId = title.id.startsWith("preview-") || title.id.startsWith("new-");
      const payload = { unit_key: title.unit_key, name: title.name, permission_keys: title.permission_keys, sort_order: title.sort_order, active: title.active, application_assignable: title.application_assignable };
      const result = isPreviewId ? await supabase!.from("organization_titles").insert(payload) : await supabase!.from("organization_titles").update(payload).eq("id", title.id);
      setNotice(result.error ? `تعذر حفظ المسمى: ${result.error.message}` : `تم حفظ «${title.name}» وصلاحياته.`);
      if (!result.error) await reload();
    } else setNotice(`تم تحديث «${title.name}» داخل وضع المعاينة.`);
    setSaving("");
  }



  async function addTitle() {
    if (!selected) return;
    const item: OrgTitle = { id: `new-${Date.now()}`, unit_key: selected.key, name: "مسمى جديد", permission_keys: [], sort_order: (selectedTitles.length + 1) * 10, active: true, application_assignable: true };
    setTitles(prev => [...prev, item]);
    setNotice("أضيف مسمى جديد. سمّه وحدد صلاحياته ثم اضغط حفظ المسمى.");
  }

  if (profileLoading || loading) return <div className="glass rounded-[28px] p-10 text-center text-zinc-600">جارٍ تحميل الهيكل...</div>;
  if (!allowed) return <div className="glass rounded-[28px] p-10 text-center">غير مصرح لك بإدارة الهيكل.</div>;
  if (!selected) return null;
  const tone = DEPARTMENT_TONES[selected.accent];

  return <div className="mx-auto max-w-[1540px] space-y-4">
    <header className="glass-strong rounded-[28px] p-5 sm:p-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="section-kicker">إدارة الهيكل</p><h1 className="mt-2 text-3xl font-black md:text-5xl">القيادة والأقسام والمسميات</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600">الهيكل ثابت على قيادة القطاع وأربعة أقسام رسمية فقط. تقدر تعدّل أسماء الأقسام وطابعها ومسمياتها وصلاحيات كل مسمى، لكن الدورات منفصلة عن الأقسام.</p></div>
      </div>
    </header>

    <div className="grid gap-4 xl:grid-cols-[310px_1fr]">
      <aside className="glass h-fit rounded-[26px] p-3 xl:sticky xl:top-7">
        <div className="px-3 py-2"><p className="text-[10px] font-black text-zinc-700">الهيكل الرسمي</p><h2 className="mt-1 text-lg font-black">القيادة + 4 أقسام</h2></div>
        <div className="mt-2 space-y-1.5">{[...units].sort((a,b)=>a.sort_order-b.sort_order).map(unit=>{const t=DEPARTMENT_TONES[unit.accent];const active=unit.key===selected.key;return <button key={unit.key} onClick={()=>setSelectedKey(unit.key)} className={`flex w-full items-center gap-3 rounded-[17px] border px-3 py-3 text-right transition ${active?`${t.border} ${t.bg}`:"border-transparent hover:border-white/[.06] hover:bg-white/[.02]"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-[12px] border ${active?`${t.border} ${t.bg} ${t.text}`:"border-white/[.06] bg-black/20 text-zinc-700"}`}><DepartmentIcon iconKey={unit.icon_key}/></span><span className="min-w-0 flex-1"><span className={`block truncate text-sm font-black ${active?"text-zinc-200":"text-zinc-500"}`}>{unit.name}</span><span className="mt-0.5 block text-[9px] text-zinc-700">{titles.filter(x=>x.unit_key===unit.key).length} مسميات {unit.active?"":"• مخفي"}</span></span><ChevronLeft size={13} className={active?t.text:"text-zinc-800"}/></button>})}</div>
      </aside>

      <div className="space-y-4">
        <section className="glass overflow-hidden rounded-[28px]">
          <div className={`border-b border-white/[.06] bg-gradient-to-l ${tone.soft} to-transparent p-5 sm:p-6`}>
            <div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-[15px] border ${tone.border} ${tone.bg} ${tone.text}`}><DepartmentIcon iconKey={selected.icon_key} size={20}/></span><div><p className="text-[10px] font-black text-zinc-700">معرّف القسم • {selected.key}</p><h2 className="mt-1 text-2xl font-black">بيانات القسم</h2></div></div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            <Field label="اسم القسم"><input className="ds-input" value={selected.name} onChange={e=>patchUnit({name:e.target.value})}/></Field>
            <Field label="نوع الجهة"><input className="ds-input opacity-70" value={selected.kind === "command" ? "قيادة القطاع" : "قسم رسمي"} disabled/></Field>
            <Field label="اللون المميز"><select className="ds-input" value={selected.accent} onChange={e=>patchUnit({accent:e.target.value as DepartmentAccent})}>{DEPARTMENT_ACCENT_OPTIONS.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select></Field>
            <Field label="الرمز"><select className="ds-input" value={selected.icon_key} onChange={e=>patchUnit({icon_key:e.target.value as DepartmentIconKey})}>{DEPARTMENT_ICON_OPTIONS.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select></Field>
            <Field label="الترتيب"><input type="number" className="ds-input" value={selected.sort_order} onChange={e=>patchUnit({sort_order:Number(e.target.value)||0})}/></Field>
            <div className="grid grid-cols-2 gap-2"><Toggle active={selected.active} onClick={()=>patchUnit({active:!selected.active})} label="ظاهر بالهيكل"/>{selected.kind === "department" ? <Toggle active={selected.application_enabled} onClick={()=>patchUnit({application_enabled:!selected.application_enabled})} label="التقديم مفتوح"/> : <div className="flex min-h-[48px] items-center justify-center rounded-[14px] border border-white/[.06] bg-black/15 px-3 text-[10px] font-black text-zinc-700">القيادة بدون تقديم</div>}</div>
            <label className="sm:col-span-2"><span className="mb-2 block text-[10px] font-black text-zinc-700">وصف القسم ومهمته</span><textarea rows={3} className="ds-input resize-none" value={selected.description} onChange={e=>patchUnit({description:e.target.value})}/></label>
          </div>
          <div className="flex justify-end border-t border-white/[.055] p-4"><button onClick={saveUnit} disabled={saving===`unit:${selected.key}`} className="inline-flex items-center gap-2 rounded-[14px] bg-[#d5a674] px-5 py-3 text-xs font-black text-black disabled:opacity-40"><Save size={15}/>{saving===`unit:${selected.key}`?"جارٍ الحفظ...":"حفظ بيانات القسم"}</button></div>
        </section>

        <section className="glass rounded-[28px] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-[14px] border ${tone.border} ${tone.bg} ${tone.text}`}><SlidersHorizontal size={17}/></span><div><p className="text-[10px] font-black text-zinc-700">صلاحيات المسمى</p><h2 className="mt-1 text-xl font-black">مسميات القسم وصلاحياتها</h2></div></div><button onClick={addTitle} className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-white/[.08] bg-white/[.02] px-4 py-2.5 text-xs font-black text-zinc-400"><CirclePlus size={15}/> إضافة مسمى</button></div>
          <p className="mt-3 text-xs leading-6 text-zinc-700">اختيار هذا المسمى في إدارة الحسابات يطبّق الصلاحيات المحددة هنا تلقائيًا. المسميات الميدانية التي لا تحتاج لوحة إدارة يمكن تركها بدون صلاحيات.</p>
          <div className="mt-4 space-y-3">{selectedTitles.map((title,index)=><article key={title.id} className="rounded-[22px] border border-white/[.06] bg-black/15 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_130px_auto] lg:items-end"><Field label={`المسمى ${index+1}`}><input className="ds-input py-3" value={title.name} onChange={e=>patchTitle(title.id,{name:e.target.value})}/></Field><Field label="الترتيب"><input type="number" className="ds-input py-3" value={title.sort_order} onChange={e=>patchTitle(title.id,{sort_order:Number(e.target.value)||0})}/></Field><div className="grid grid-cols-2 gap-2"><Toggle active={title.active} onClick={()=>patchTitle(title.id,{active:!title.active})} label="مفعّل"/><Toggle active={title.application_assignable} onClick={()=>patchTitle(title.id,{application_assignable:!title.application_assignable})} label="متاح للتسكين"/></div></div>
            <div className="mt-4"><div className="mb-2 flex items-center justify-between"><p className="text-[9px] font-black text-zinc-700">صلاحيات المسمى</p><span className="text-[9px] font-black text-zinc-700">{title.permission_keys.length?`${title.permission_keys.length} صلاحيات` : "استخدام عام فقط"}</span></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{PERMISSIONS.filter(p=>p.key!=="manage_admin_affairs_applications").map(permission=>{const active=title.permission_keys.includes(permission.key);return <button key={permission.key} onClick={()=>togglePermission(title,permission.key)} className={`flex items-start gap-2 rounded-[14px] border p-3 text-right transition ${active?`${tone.border} ${tone.bg}`:"border-white/[.05] bg-white/[.01]"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${active?`${tone.dot} text-black`:"bg-white/[.035] text-zinc-800"}`}>{active&&<Check size={12}/>}</span><span><span className={`block text-[10px] font-black ${active?tone.text:"text-zinc-600"}`}>{permission.label}</span><span className="mt-1 block text-[9px] leading-4 text-zinc-800">{permission.description}</span></span></button>})}</div></div>
            <div className="mt-4 flex justify-end"><button onClick={()=>saveTitle(title)} disabled={saving===`title:${title.id}`} className="inline-flex items-center gap-2 rounded-[13px] border border-white/[.08] bg-white/[.025] px-4 py-2.5 text-[10px] font-black text-zinc-300"><Save size={13}/> حفظ المسمى</button></div>
          </article>)}</div>
        </section>

        {notice&&<div className="rounded-[18px] border border-[rgba(213,166,116,.16)] bg-[rgba(213,166,116,.05)] p-4 text-xs text-zinc-400">{notice}</div>}
      </div>
    </div>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <label><span className="mb-2 block text-[10px] font-black text-zinc-700">{label}</span>{children}</label>; }
function Toggle({active,onClick,label}:{active:boolean;onClick:()=>void;label:string}) { return <button type="button" onClick={onClick} className={`flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border px-3 text-[10px] font-black transition ${active?"border-[rgba(127,155,140,.20)] bg-[rgba(127,155,140,.06)] text-[#91ad9d]":"border-white/[.06] bg-black/15 text-zinc-700"}`}><span className={`h-2 w-2 rounded-full ${active?"bg-[#91ad9d]":"bg-zinc-800"}`}/>{label}</button>; }
