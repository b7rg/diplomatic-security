"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCcw, Search, UserCog } from "lucide-react";
import { DEPARTMENT_TONES } from "@/components/department-visual";
import { can, type Profile } from "@/lib/auth";
import { MEMBER_TYPES, MILITARY_RANKS, PERMISSIONS, type MemberType, type Permission } from "@/lib/site";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/lib/use-current-profile";
import { useOrganization } from "@/lib/use-organization";

const DEMO_REQUESTS: Profile[] = [
  { id:"demo-1", name:"مثال — طلب جديد", job_code:"D-104", copy_id:"1024", status:"pending", title:"فرد", permissions:[], is_owner:false, member_type:"sector_member", military_rank:"جندي", department_key:null, server_roles:[] },
  { id:"demo-2", name:"مثال — لاعب معتمد", job_code:"AP-88", copy_id:"778", status:"approved", title:"لاعب معتمد", permissions:[], is_owner:false, member_type:"approved_player", military_rank:null, department_key:null, server_roles:[] },
  { id:"demo-3", name:"مثال — إداري", job_code:"D-12", copy_id:"12", status:"approved", title:"مسؤول الجدول", permissions:["manage_schedule"], is_owner:false, member_type:"management", military_rank:"نقيب", department_key:"admin-affairs", server_roles:["مسؤول الجدول"] },
];

export default function AccountsPage(){
  const configured=isSupabaseConfigured();
  const {profile,loading:accessLoading}=useCurrentProfile();
  const {units,titles,loading:orgLoading}=useOrganization();
  const authorized=Boolean(profile&&(profile.is_owner||can(profile,"manage_accounts")||can(profile,"manage_roles")));
  const [rows,setRows]=useState<Profile[]>(configured?[]:DEMO_REQUESTS);
  const [search,setSearch]=useState("");
  const [segment,setSegment]=useState<"all"|MemberType>("all");
  const [loading,setLoading]=useState(configured);
  const [saving,setSaving]=useState<string|null>(null);
  const [notice,setNotice]=useState("");

  async function load(){const s=getSupabase();if(!s)return;setLoading(true);const {data,error}=await s.from("profiles").select("*").eq("is_owner",false).order("created_at",{ascending:false});if(!error)setRows((data??[]) as Profile[]);setLoading(false)}
  useEffect(()=>{if(configured)load()},[configured]);
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return rows.filter(r=>(segment==="all"||r.member_type===segment)&&(!q||[r.name,r.job_code,r.copy_id,r.title,r.military_rank].some(v=>String(v??"").toLowerCase().includes(q))))},[rows,search,segment]);
  const counts=useMemo(()=>Object.fromEntries(MEMBER_TYPES.map(t=>[t.key,rows.filter(r=>r.member_type===t.key).length])),[rows]);
  const patch=(id:string,p:Partial<Profile>)=>setRows(v=>v.map(r=>r.id===id?{...r,...p}:r));
  const toggle=(row:Profile,p:Permission)=>patch(row.id,{permissions:row.permissions.includes(p)?row.permissions.filter(x=>x!==p):[...row.permissions,p]});

  function changeDepartment(row:Profile,key:string){
    const available=titles.filter(t=>t.unit_key===key&&t.active).sort((a,b)=>a.sort_order-b.sort_order);
    const first=available[0];
    patch(row.id,{department_key:key||null,title:first?.name||"عضو",permissions:first?.permission_keys??[],server_roles:first?[first.name]:[]});
  }
  function changeTitle(row:Profile,id:string){
    const selected=titles.find(t=>t.id===id);
    if(!selected)return;
    patch(row.id,{title:selected.name,permissions:selected.permission_keys,server_roles:[selected.name],department_key:selected.unit_key});
    setNotice(`تم تطبيق صلاحيات مسمى «${selected.name}» تلقائيًا. تقدر تعدل الصلاحيات الإضافية قبل الحفظ إذا لزم.`);
  }
  async function save(row:Profile){
    if(!configured){setNotice("وضع المعاينة: التعديل ظاهر الآن فقط ولن يحفظ بعد تحديث الصفحة.");return}
    const s=getSupabase();if(!s)return;setSaving(row.id);setNotice("");
    const {error}=await s.from("profiles").update({status:row.status,title:row.title,permissions:row.permissions,member_type:row.member_type,military_rank:row.military_rank||null,department_key:row.department_key||null,server_roles:row.server_roles??[],approved_at:row.status==="approved"?new Date().toISOString():null,approved_by:row.status==="approved"?profile?.id??null:null}).eq("id",row.id);
    setNotice(error?`تعذر الحفظ: ${error.message}`:`تم حفظ حساب ${row.name}.`);setSaving(null);
  }

  if(accessLoading||orgLoading)return <div className="glass rounded-[28px] p-10 text-center text-zinc-600">جارٍ التحقق وتحميل المسميات...</div>;
  if(!authorized)return <div className="glass rounded-[28px] p-10 text-center">غير مصرح لك.</div>;
  return <div className="mx-auto max-w-[1500px] space-y-4">
    <header className="glass rounded-[28px] p-5 sm:p-7"><p className="section-kicker">إدارة الحسابات</p><h1 className="mt-2 text-3xl font-black md:text-5xl">الحسابات والتسكين</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600">الطريقة الأسهل: <b className="text-zinc-400">اعتماد الحساب ← اختيار الفئة ← اختيار القسم ← اختيار المسمى</b>. عند اختيار المسمى تُطبّق صلاحياته التي حددتها في «القيادة والأقسام والمسميات» تلقائيًا.</p></header>

    <section className="grid gap-2 md:grid-cols-4">{[{key:"all",label:"الجميع",count:rows.length},...MEMBER_TYPES.map(t=>({key:t.key,label:t.label,count:counts[t.key]||0}))].map(t=><button key={t.key} onClick={()=>setSegment(t.key as any)} className={`rounded-[20px] border p-4 text-right ${segment===t.key?"border-[rgba(213,166,116,.20)] bg-[rgba(213,166,116,.06)]":"border-white/[.06] bg-white/[.015]"}`}><p className="text-2xl font-black text-zinc-200">{t.count}</p><p className={`mt-1 text-[10px] font-black ${segment===t.key?"bronze-text":"text-zinc-700"}`}>{t.label}</p></button>)}</section>

    <section className="glass grid gap-2 rounded-[22px] p-3 md:grid-cols-[1fr_auto]"><div className="relative"><Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-700"/><input className="ds-input py-3 pr-10" value={search} onChange={e=>setSearch(e.target.value)} placeholder="الاسم، الكود، كوبي آي دي، الرتبة أو المسمى..."/></div><button onClick={load} disabled={!configured} className="inline-flex items-center justify-center gap-2 rounded-[15px] border border-white/[.07] px-4 py-3 text-xs font-black text-zinc-600 disabled:opacity-30"><RefreshCcw size={15}/> تحديث</button></section>

    {!configured&&<div className="rounded-[18px] border border-[rgba(213,166,116,.14)] bg-[rgba(213,166,116,.04)] p-4 text-xs text-zinc-500">وضع المعاينة — الحسابات المعروضة أمثلة. جرّب اختيار قسم ومسمى وشوف كيف تتطبق الصلاحيات.</div>}
    {notice&&<div className="rounded-[18px] border border-[rgba(127,155,140,.16)] bg-[rgba(127,155,140,.04)] p-4 text-xs text-zinc-500">{notice}</div>}

    <div className="space-y-3">{loading?<div className="h-72 animate-pulse rounded-[28px] bg-white/[.02]"/>:filtered.map(row=>{
      const dept=units.find(u=>u.key===row.department_key);
      const deptTitles=titles.filter(t=>t.unit_key===row.department_key&&t.active).sort((a,b)=>a.sort_order-b.sort_order);
      const selectedTitle=deptTitles.find(t=>t.name===row.title);
      const tone=dept?DEPARTMENT_TONES[dept.accent]:DEPARTMENT_TONES.bronze;
      return <article key={row.id} className="glass rounded-[26px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-start gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-[14px] border ${dept?`${tone.border} ${tone.bg}`:"border-white/[.06] bg-black/20"}`}><UserCog size={18} className={dept?tone.text:"bronze-text"}/></span><div><h2 className="font-black text-zinc-200">{row.name}</h2><p className="mt-1 text-[10px] text-zinc-700">{row.job_code||"—"} • كوبي آي دي {row.copy_id||"—"}</p></div></div><div className="flex flex-wrap gap-2">{[["pending","انتظار"],["approved","معتمد"],["rejected","مرفوض"]].map(([s,l])=><button key={s} onClick={()=>patch(row.id,{status:s as Profile["status"]})} className={`rounded-full px-3 py-2 text-[10px] font-black ${row.status===s?s==="approved"?"bg-[#8da697] text-black":s==="rejected"?"bg-[#b96f62] text-white":"bg-[#d5a674] text-black":"border border-white/[.07] text-zinc-700"}`}>{l}</button>)}</div></div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <Field label="1 — فئة الشخص"><select className="ds-input py-3" value={row.member_type} onChange={e=>patch(row.id,{member_type:e.target.value as MemberType})}>{MEMBER_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></Field>
          <Field label="2 — القسم"><select className="ds-input py-3" value={row.department_key||""} onChange={e=>changeDepartment(row,e.target.value)}><option value="">بدون قسم</option>{units.filter(u=>u.active).sort((a,b)=>a.sort_order-b.sort_order).map(u=><option key={u.key} value={u.key}>{u.name}</option>)}</select></Field>
          <Field label="3 — المسمى"><select className="ds-input py-3" value={selectedTitle?.id||""} onChange={e=>changeTitle(row,e.target.value)} disabled={!row.department_key}><option value="">اختر المسمى</option>{deptTitles.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label="الرتبة العسكرية"><select className="ds-input py-3" value={row.military_rank||""} onChange={e=>patch(row.id,{military_rank:e.target.value||null})}><option value="">بدون رتبة</option>{MILITARY_RANKS.map(rank=><option key={rank} value={rank}>{rank}</option>)}</select></Field>
        </div>

        {selectedTitle&&<div className={`mt-4 rounded-[18px] border p-4 ${tone.border} ${tone.bg}`}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className={`text-[10px] font-black ${tone.text}`}>صلاحيات المسمى المعتمدة</p><p className="mt-1 text-xs text-zinc-600">{selectedTitle.permission_keys.length?selectedTitle.permission_keys.map(k=>PERMISSIONS.find(p=>p.key===k)?.label??k).join(" • "):"هذا المسمى استخدام عام ولا يمنح صلاحيات إدارية تلقائيًا."}</p></div><span className="rounded-full border border-white/[.07] px-3 py-1.5 text-[9px] font-black text-zinc-600">{row.permissions.length} مفعّلة الآن</span></div></div>}

        <details className="mt-4 rounded-[18px] border border-white/[.055] bg-black/15"><summary className="cursor-pointer px-4 py-3 text-[11px] font-black text-zinc-600">صلاحيات إضافية / استثناءات — افتح فقط عند الحاجة</summary><div className="grid gap-2 border-t border-white/[.05] p-4 sm:grid-cols-2 xl:grid-cols-3">{PERMISSIONS.filter(p=>p.key!=="manage_admin_affairs_applications").map(p=>{const active=row.permissions.includes(p.key);return <button key={p.key} onClick={()=>toggle(row,p.key)} className={`flex items-start gap-2 rounded-[15px] border px-3 py-3 text-right text-[11px] font-black ${active?"border-[rgba(213,166,116,.22)] bg-[rgba(213,166,116,.07)] text-[#d5a674]":"border-white/[.055] bg-white/[.012] text-zinc-700"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${active?"bg-[#d5a674] text-black":"bg-white/[.04]"}`}>{active&&<Check size={12}/>}</span><span><span className="block">{p.label}</span><span className="mt-1 block text-[9px] font-medium leading-4 text-zinc-800">{p.description}</span></span></button>})}</div></details>

        <div className="mt-5 flex justify-end border-t border-white/[.055] pt-4"><button onClick={()=>save(row)} disabled={saving===row.id} className="rounded-[14px] bg-[#d5a674] px-5 py-3 text-xs font-black text-black disabled:opacity-35">{saving===row.id?"حفظ...":"حفظ الحساب"}</button></div>
      </article>})}</div>
  </div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label><span className="mb-2 block text-[9px] font-black text-zinc-700">{label}</span>{children}</label>}
