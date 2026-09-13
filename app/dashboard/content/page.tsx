"use client";

import { useEffect, useMemo, useState } from "react";
import { FilePlus2, Plus, Rocket, Save, Send, Trash2 } from "lucide-react";
import { DEMO_CONTENT, PAGE_META, type ContentItem, type ContentSlug } from "@/lib/content";
import { can } from "@/lib/auth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/lib/use-current-profile";
import type { Permission } from "@/lib/site";

const SLUGS: ContentSlug[] = ["laws", "protocols", "promotions", "leaves"];

type Toast = { type: "ok" | "warn"; text: string } | null;

export default function ContentManagerPage() {
  const configured = isSupabaseConfigured();
  const { profile, loading: accessLoading } = useCurrentProfile();
  const [toast, setToast] = useState<Toast>(null);
  const canPublish = Boolean(profile && (profile.is_owner || can(profile, "publish_content")));

  const allowedSlugs = useMemo<ContentSlug[]>(() => {
    if (!profile) return [];
    if (profile.is_owner || can(profile, "manage_content")) return SLUGS;
    const map: Record<ContentSlug, Permission> = { laws: "edit_laws", protocols: "edit_protocols", promotions: "edit_promotions", leaves: "edit_leaves" };
    return SLUGS.filter((value) => can(profile, map[value]));
  }, [profile]);

  const [slug, setSlug] = useState<ContentSlug>("laws");
  const [items, setItems] = useState<ContentItem[]>(DEMO_CONTENT.laws);
  const [saving, setSaving] = useState<string | null>(null);

  async function load(nextSlug = slug) {
    const supabase = getSupabase();
    if (!supabase) { setItems(DEMO_CONTENT[nextSlug]); return; }
    const { data } = await supabase.from("content_items").select("*").eq("slug", nextSlug).order("sort_order", { ascending: true });
    setItems((data ?? []) as ContentItem[]);
  }

  useEffect(() => {
    if (!accessLoading && allowedSlugs.length && !allowedSlugs.includes(slug)) { setSlug(allowedSlugs[0]); return; }
    if (!accessLoading && allowedSlugs.includes(slug)) load(slug);
  }, [slug, accessLoading, allowedSlugs]);

  function patch(index: number, values: Partial<ContentItem>) { setItems((current) => current.map((item, i) => i === index ? { ...item, ...values } : item)); }
  function add() { setItems((current) => [...current, { slug, category: "عام", title: "بند جديد", body: "", badge: "", sort_order: (current.length + 1) * 10, active: true }]); }

  function payload(item: ContentItem) {
    return { category: item.category, title: item.title, body: item.body, badge: item.badge || null, sort_order: item.sort_order, active: item.active };
  }

  async function saveDraft(item: ContentItem, index: number, changeKind: "upsert" | "delete" = "upsert") {
    const key = item.id ?? `new-${index}`; setSaving(`draft-${key}`);
    if (!configured) { setToast({ type: "ok", text: "تمت محاكاة إرسال المسودة للمراجعة في وضع المعاينة." }); setSaving(null); return; }
    const supabase = getSupabase(); if (!supabase) return;
    const { error } = await supabase.from("content_drafts").insert({ source_item_id: item.id ?? null, slug, change_kind: changeKind, payload: payload(item), status: "pending_review" });
    setToast(error ? { type: "warn", text: "تعذر حفظ المسودة. تأكد من تشغيل schema-v2.sql." } : { type: "ok", text: "تم إرسال المسودة إلى طابور المراجعة." });
    setSaving(null);
  }

  async function publish(item: ContentItem, index: number) {
    const key = item.id ?? `new-${index}`; setSaving(`publish-${key}`);
    if (!configured) { setToast({ type: "ok", text: "تمت محاكاة النشر في وضع المعاينة." }); setSaving(null); return; }
    const supabase = getSupabase(); if (!supabase) return;
    let error: unknown = null;
    if (item.id) {
      const result = await supabase.from("content_items").update({ ...payload(item), updated_at: new Date().toISOString() }).eq("id", item.id); error = result.error;
    } else {
      const result = await supabase.from("content_items").insert({ slug, ...payload(item) }).select("*").single(); error = result.error; if (result.data) patch(index, result.data as ContentItem);
    }
    setToast(error ? { type: "warn", text: "تعذر النشر. تحقق من الصلاحية وقاعدة البيانات." } : { type: "ok", text: "تم نشر التعديل في المرجع العام." });
    setSaving(null);
  }

  async function remove(item: ContentItem, index: number) {
    if (!canPublish) { await saveDraft(item, index, "delete"); return; }
    if (!configured || !item.id) { setItems((current) => current.filter((_, i) => i !== index)); return; }
    await getSupabase()?.from("content_items").delete().eq("id", item.id);
    setItems((current) => current.filter((_, i) => i !== index));
  }

  if (accessLoading) return <div className="glass mx-auto max-w-7xl rounded-[30px] p-10 text-center text-zinc-600">جارٍ التحقق من الصلاحية...</div>;
  if (!allowedSlugs.length) return <div className="glass mx-auto max-w-3xl rounded-[30px] p-10 text-center"><h1 className="text-2xl font-black">غير مصرح لك</h1><p className="mt-3 text-zinc-600">لم يتم منح حسابك صلاحية تعديل أي قسم.</p></div>;

  return <div className="mx-auto max-w-[1350px] space-y-5">
    <header className="glass rounded-[32px] p-7 sm:p-9"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[rgba(213,166,116,.16)] bg-[rgba(213,166,116,.05)]"><FilePlus2 size={20} className="bronze-text"/></span><div><p className="text-[10px] font-black text-zinc-700">إدارة المحتوى</p><h1 className="mt-1 text-3xl font-black">استوديو المحتوى</h1></div></div><p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-600">عدّل المرجع بدون كود. صاحب صلاحية النشر يستطيع الاعتماد فورًا، وبقية المحررين يرسلون مسودة إلى طابور المراجعة بدل تغيير المحتوى العام مباشرة.</p></header>

    <div className="glass flex flex-wrap gap-2 rounded-[24px] p-2.5">{allowedSlugs.map((value)=><button key={value} onClick={()=>setSlug(value)} className={`rounded-[16px] px-4 py-3 text-xs font-black transition ${slug===value?"bg-[rgba(213,166,116,.1)] text-[#efd0ad]":"text-zinc-600 hover:bg-white/[.03] hover:text-zinc-300"}`}>{PAGE_META[value].title}</button>)}</div>

    <div className={`rounded-[22px] border px-5 py-4 text-sm leading-7 ${canPublish?"border-[rgba(127,155,140,.15)] bg-[rgba(127,155,140,.045)] text-zinc-500":"border-[rgba(213,166,116,.15)] bg-[rgba(213,166,116,.045)] text-zinc-500"}`}><span className={`font-black ${canPublish?"text-[#91ad9d]":"bronze-text"}`}>{canPublish ? "صلاحية النشر مفعّلة:" : "وضع المحرر:"}</span> {canPublish ? "تقدر تنشر مباشرة أو تحفظ مسودة للمراجعة." : "تعديلاتك لا تظهر للعامة حتى يعتمدها شخص لديه صلاحية النشر."}</div>
    {toast && <button onClick={()=>setToast(null)} className={`w-full rounded-[18px] border px-4 py-3 text-right text-sm font-bold ${toast.type==="ok"?"border-[rgba(127,155,140,.16)] bg-[rgba(127,155,140,.05)] text-[#91ad9d]":"border-[rgba(183,106,91,.16)] bg-[rgba(183,106,91,.05)] text-[#c87a6b]"}`}>{toast.text}</button>}

    <div className="space-y-4">{items.map((item,index)=>{
      const key=item.id??`new-${index}`;
      return <article key={key} className="glass rounded-[28px] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between"><div><span className="text-[10px] font-black bronze-text">ITEM {String(index+1).padStart(2,"0")}</span><p className="mt-1 text-xs text-zinc-700">{item.id ? "بند منشور موجود" : "بند جديد غير منشور"}</p></div><label className="flex items-center gap-2 text-xs font-black text-zinc-600"><input type="checkbox" checked={item.active} onChange={(e)=>patch(index,{active:e.target.checked})}/> ظاهر للعامة</label></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label><span className="mb-2 block text-[10px] font-black text-zinc-700">القسم</span><input value={item.category} onChange={(e)=>patch(index,{category:e.target.value})} className="w-full rounded-[17px] border border-white/[.07] bg-black/25 px-4 py-3 text-sm outline-none focus:border-[rgba(213,166,116,.22)]"/></label>
          <label className="xl:col-span-2"><span className="mb-2 block text-[10px] font-black text-zinc-700">العنوان</span><input value={item.title} onChange={(e)=>patch(index,{title:e.target.value})} className="w-full rounded-[17px] border border-white/[.07] bg-black/25 px-4 py-3 text-sm outline-none focus:border-[rgba(213,166,116,.22)]"/></label>
          <label><span className="mb-2 block text-[10px] font-black text-zinc-700">الشارة</span><input value={item.badge??""} onChange={(e)=>patch(index,{badge:e.target.value})} className="w-full rounded-[17px] border border-white/[.07] bg-black/25 px-4 py-3 text-sm outline-none focus:border-[rgba(213,166,116,.22)]"/></label>
        </div>
        <label className="mt-4 block"><span className="mb-2 block text-[10px] font-black text-zinc-700">النص</span><textarea rows={4} value={item.body} onChange={(e)=>patch(index,{body:e.target.value})} className="w-full resize-y rounded-[18px] border border-white/[.07] bg-black/25 px-4 py-3 text-sm leading-7 outline-none focus:border-[rgba(213,166,116,.22)]"/></label>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-white/[.055] pt-5"><button onClick={()=>remove(item,index)} className="inline-flex items-center gap-2 rounded-[15px] border border-[rgba(183,106,91,.13)] px-4 py-2.5 text-xs font-black text-[#b76a5b]"><Trash2 size={14}/>{canPublish?"حذف":"طلب حذف"}</button><button onClick={()=>saveDraft(item,index)} disabled={saving===`draft-${key}`} className="inline-flex items-center gap-2 rounded-[15px] border border-white/[.08] px-4 py-2.5 text-xs font-black text-zinc-400 disabled:opacity-40"><Send size={14}/> إرسال للمراجعة</button>{canPublish&&<button onClick={()=>publish(item,index)} disabled={saving===`publish-${key}`} className="inline-flex items-center gap-2 rounded-[15px] bg-[#d5a674] px-4 py-2.5 text-xs font-black text-[#17110d] disabled:opacity-40"><Rocket size={14}/> نشر الآن</button>}</div>
      </article>;
    })}</div>
    <button onClick={add} className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-[rgba(213,166,116,.22)] bg-[rgba(213,166,116,.025)] px-5 py-5 text-sm font-black bronze-text"><Plus size={18}/> إضافة بند جديد</button>
  </div>;
}
