"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { MILITARY_RANKS } from "@/lib/site";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type ExtraAnswer = { question_id: string; question: string; answer: string };

export default function ApplicationForm({
  targetKey,
  targetName,
  extraAnswers = [],
  onExtraChange,
  extraComplete = true,
}: {
  targetKey: string;
  targetName: string;
  extraAnswers?: ExtraAnswer[];
  onExtraChange?: (questionId: string, value: string) => void;
  extraComplete?: boolean;
}) {
  const configured = isSupabaseConfigured();
  const [form, setForm] = useState({
    full_name: "", game_name: "", discord_name: "", job_code: "", copy_id: "",
    military_rank: "", motivation: "", experience: "", availability: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const complete = useMemo(() => Object.values(form).every(v => v.trim()), [form]);
  const set = (key: keyof typeof form, value: string) => setForm(v => ({ ...v, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!complete || !accepted || !extraComplete) return;
    setBusy(true); setMessage("");
    if (!configured) {
      await new Promise(r => setTimeout(r, 350));
      setMessage(`تم إرسال طلب ${targetName} في وضع المعاينة بنجاح.`);
      setBusy(false); return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("department_applications").insert({
      target_key: targetKey,
      target_name: targetName,
      ...form,
      answers: extraAnswers,
      status: "new",
    });
    if (error) setMessage(`تعذر إرسال الطلب: ${error.message}`);
    else {
      setMessage("تم استلام طلبك بنجاح وإرساله للمراجعة.");
      setForm({ full_name:"", game_name:"", discord_name:"", job_code:"", copy_id:"", military_rank:"", motivation:"", experience:"", availability:"" });
      setAccepted(false);
    }
    setBusy(false);
  }

  return <form onSubmit={submit} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="الاسم الكامل"><input required value={form.full_name} onChange={e=>set("full_name",e.target.value)} className="ds-input" /></Field>
      <Field label="الاسم داخل السيرفر"><input required value={form.game_name} onChange={e=>set("game_name",e.target.value)} className="ds-input" /></Field>
      <Field label="اسم الديسكورد"><input required value={form.discord_name} onChange={e=>set("discord_name",e.target.value)} className="ds-input" /></Field>
      <Field label="الكود العسكري"><input required value={form.job_code} onChange={e=>set("job_code",e.target.value)} className="ds-input" /></Field>
      <Field label="كوبي آي دي"><input required value={form.copy_id} onChange={e=>set("copy_id",e.target.value)} className="ds-input" /></Field>
      <Field label="الرتبة الحالية"><select required value={form.military_rank} onChange={e=>set("military_rank",e.target.value)} className="ds-input"><option value="">اختر الرتبة</option>{MILITARY_RANKS.map(r=><option key={r}>{r}</option>)}</select></Field>
    </div>
    <div className="grid gap-3 lg:grid-cols-3">
      <Field label="سبب التقديم"><textarea required rows={5} value={form.motivation} onChange={e=>set("motivation",e.target.value)} className="ds-input resize-none" /></Field>
      <Field label="الخبرات والمهارات"><textarea required rows={5} value={form.experience} onChange={e=>set("experience",e.target.value)} className="ds-input resize-none" /></Field>
      <Field label="أوقات التواجد"><textarea required rows={5} value={form.availability} onChange={e=>set("availability",e.target.value)} className="ds-input resize-none" /></Field>
    </div>

    {extraAnswers.length > 0 && <section className="rounded-[24px] border border-white/[.065] bg-black/15 p-4 sm:p-5">
      <div className="mb-4"><p className="section-kicker">أسئلة القبول</p><h3 className="mt-1 text-lg font-black">أسئلة القبول</h3></div>
      <div className="grid gap-3">
        {extraAnswers.map((item,index)=><Field key={item.question_id} label={`${String(index+1).padStart(2,"0")} — ${item.question}`}><textarea required rows={4} value={item.answer} onChange={e=>onExtraChange?.(item.question_id,e.target.value)} className="ds-input resize-none" /></Field>)}
      </div>
    </section>}

    <label className={`flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 transition ${accepted?"border-[rgba(127,155,140,.20)] bg-[rgba(127,155,140,.06)]":"border-white/[.065] bg-white/[.015]"}`}>
      <button type="button" onClick={()=>setAccepted(v=>!v)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${accepted?"border-[#8da697] bg-[#8da697] text-black":"border-white/15"}`}>{accepted&&<CheckCircle2 size={13}/>}</button>
      <span><span className="block text-sm font-black text-zinc-300">أتعهد بصحة البيانات</span><span className="mt-1 block text-xs leading-6 text-zinc-600">أفهم أن إرسال الطلب لا يعني القبول، وأن القرار النهائي للجهة المختصة.</span></span>
    </label>

    {message && <div className="rounded-[18px] border border-[rgba(213,166,116,.15)] bg-[rgba(213,166,116,.05)] p-4 text-sm text-zinc-300">{message}</div>}
    <button disabled={!complete||!accepted||!extraComplete||busy} className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#d5a674] px-5 py-4 font-black text-[#17110d] transition hover:bg-[#e7bb88] disabled:cursor-not-allowed disabled:opacity-35"><Send size={17}/>{busy?"جارٍ الإرسال...":"إرسال الطلب للمراجعة"}</button>
  </form>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-[11px] font-black text-zinc-600">{label}</span>{children}</label>}
