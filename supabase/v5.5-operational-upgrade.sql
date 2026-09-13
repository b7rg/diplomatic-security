-- =====================================================================
-- DSC V5.5 — الرصد / البطاقة / الشرطة العسكرية / الخريطة / منع التوظيف
-- شغّل الملف مرة واحدة فوق V5.4.
-- =====================================================================

-- 1) بيانات إضافية لجدول الأفراد.
alter table public.personnel_roster add column if not exists discord_id text;
alter table public.personnel_roster add column if not exists hired_at date;
alter table public.personnel_roster add column if not exists appointment_rank text;
update public.personnel_roster
set hired_at = coalesce(hired_at, created_at::date),
    appointment_rank = coalesce(appointment_rank, military_rank)
where hired_at is null or appointment_rank is null;

create unique index if not exists personnel_roster_active_discord_unique
  on public.personnel_roster(discord_id)
  where active = true and discord_id is not null and btrim(discord_id) <> '';

-- السجل الكامل ليس عامًا. الإدارة تقرأ الجدول مباشرة عبر RLS فقط.
revoke all on function public.get_public_roster() from public;
revoke all on function public.get_public_roster() from anon;
revoke all on function public.get_public_roster() from authenticated;

-- 2) الرصد الإداري — بدون نقاط.
create table if not exists public.personnel_tracking_entries (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.personnel_roster(id) on delete cascade,
  kind text not null check (kind in ('operations','area_officer','officer','duty_officer','attendance','course')),
  quantity integer not null default 0 check (quantity >= 0),
  hours numeric(8,2) not null default 0 check (hours >= 0),
  course_name text,
  note text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_by_name text not null,
  recorded_by_title text not null,
  created_at timestamptz not null default now()
);
alter table public.personnel_tracking_entries enable row level security;

drop policy if exists "tracking managers read" on public.personnel_tracking_entries;
create policy "tracking managers read" on public.personnel_tracking_entries for select to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'));
drop policy if exists "tracking managers insert" on public.personnel_tracking_entries;
create policy "tracking managers insert" on public.personnel_tracking_entries for insert to authenticated
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'));
drop policy if exists "tracking managers update" on public.personnel_tracking_entries;
create policy "tracking managers update" on public.personnel_tracking_entries for update to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'));
drop policy if exists "tracking managers delete" on public.personnel_tracking_entries;
create policy "tracking managers delete" on public.personnel_tracking_entries for delete to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'));
grant select, insert, update, delete on public.personnel_tracking_entries to authenticated;

-- بطاقة عامة بالبحث الدقيق فقط: Discord ID أو Copy ID. لا توجد دالة تسرد كامل القطاع.
create or replace function public.search_personnel_card(p_search text)
returns table (
  id uuid, name text, job_code text, copy_id text, title text, member_type text,
  military_rank text, department_key text, discord_id text, hired_at date,
  appointment_rank text, created_at timestamptz,
  operations_reports bigint, area_officer_reports bigint, officer_reports bigint,
  duty_officer_reports bigint, attendance_hours numeric, courses text[]
)
language sql stable security definer set search_path = public
as $$
  select r.id, r.name, r.job_code, r.copy_id, r.title, r.member_type,
         r.military_rank, r.department_key, r.discord_id, r.hired_at,
         r.appointment_rank, r.created_at,
         coalesce(sum(t.quantity) filter (where t.kind='operations'),0)::bigint,
         coalesce(sum(t.quantity) filter (where t.kind='area_officer'),0)::bigint,
         coalesce(sum(t.quantity) filter (where t.kind='officer'),0)::bigint,
         coalesce(sum(t.quantity) filter (where t.kind='duty_officer'),0)::bigint,
         coalesce(sum(t.hours) filter (where t.kind='attendance'),0)::numeric,
         coalesce(array_remove(array_agg(distinct t.course_name) filter (where t.kind='course'), null), array[]::text[])
  from public.personnel_roster r
  left join public.personnel_tracking_entries t on t.roster_id=r.id
  where r.active=true and r.member_type='sector_member'
    and (r.copy_id=btrim(p_search) or r.discord_id=btrim(p_search))
  group by r.id
  limit 1;
$$;
revoke all on function public.search_personnel_card(text) from public;
grant execute on function public.search_personnel_card(text) to anon, authenticated;

-- 3) الشرطة العسكرية — ترشيح فقط، وسجل مخالفات داخلي.
create table if not exists public.military_police_violations (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid references public.personnel_roster(id) on delete set null,
  person_name text not null,
  copy_id text not null,
  job_code text,
  reason text not null,
  value text not null default 'بدون قيمة',
  action text not null,
  executed boolean not null default false,
  evidence text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_by_name text not null,
  recorded_by_title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.military_police_violations enable row level security;
drop policy if exists "military police managers read" on public.military_police_violations;
create policy "military police managers read" on public.military_police_violations for select to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_military_police'));
drop policy if exists "military police managers insert" on public.military_police_violations;
create policy "military police managers insert" on public.military_police_violations for insert to authenticated
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_military_police'));
drop policy if exists "military police managers update" on public.military_police_violations;
create policy "military police managers update" on public.military_police_violations for update to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_military_police'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_military_police'));
grant select, insert, update on public.military_police_violations to authenticated;

update public.organization_units set application_enabled=false where key='military-police';
update public.organization_titles
set permission_keys = (select array_agg(distinct x) from unnest(coalesce(permission_keys,array[]::text[]) || array['manage_military_police']::text[]) x)
where unit_key='military-police';
update public.organization_titles
set permission_keys = (select array_agg(distinct x) from unnest(coalesce(permission_keys,array[]::text[]) || array['manage_map','manage_military_police']::text[]) x)
where unit_key='command' and name in ('قائد الأمن الدبلوماسي','نائب قائد الأمن الدبلوماسي');

-- 4) الخريطة الميدانية — مضلعات مرسومة بالنقاط.
create table if not exists public.map_regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  color text not null default '#b7793e',
  points jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  show_label boolean not null default true,
  sort_order integer not null default 10,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.map_regions enable row level security;
drop policy if exists "public reads map" on public.map_regions;
create policy "public reads map" on public.map_regions for select to anon, authenticated
using (active=true or public.current_profile_is_owner() or public.current_profile_has_permission('manage_map'));
drop policy if exists "map managers insert" on public.map_regions;
create policy "map managers insert" on public.map_regions for insert to authenticated
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_map'));
drop policy if exists "map managers update" on public.map_regions;
create policy "map managers update" on public.map_regions for update to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_map'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_map'));
drop policy if exists "map managers delete" on public.map_regions;
create policy "map managers delete" on public.map_regions for delete to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_map'));
grant select on public.map_regions to anon, authenticated;
grant insert, update, delete on public.map_regions to authenticated;

-- 5) بيانات الاستقالة ومنع التوظيف 14 يوم.
alter table public.personnel_departures add column if not exists ban_required boolean not null default false;
alter table public.personnel_departures add column if not exists ban_until date;
alter table public.personnel_departures add column if not exists ban_reason text;

-- إضافة فرد V5.5
create or replace function public.create_roster_member_v55(
  p_name text, p_job_code text, p_copy_id text, p_military_rank text,
  p_title text, p_member_type text, p_department_key text,
  p_discord_id text, p_hired_at date
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not (public.current_profile_is_owner() or public.current_profile_has_permission('manage_schedule') or public.current_profile_has_permission('manage_accounts') or public.current_profile_has_permission('manage_personnel_tracking')) then raise exception 'not authorized'; end if;
  if p_member_type not in ('management','approved_player','sector_member') then raise exception 'invalid member type'; end if;
  if nullif(btrim(p_name),'') is null or nullif(btrim(p_copy_id),'') is null or nullif(btrim(p_job_code),'') is null then raise exception 'required fields missing'; end if;
  insert into public.personnel_roster(name,job_code,copy_id,military_rank,title,member_type,department_key,discord_id,hired_at,appointment_rank,active,created_by)
  values(btrim(p_name),upper(btrim(p_job_code)),btrim(p_copy_id),nullif(btrim(p_military_rank),''),coalesce(nullif(btrim(p_title),''),'عضو'),p_member_type,nullif(btrim(p_department_key),''),nullif(btrim(p_discord_id),''),coalesce(p_hired_at,current_date),case when p_member_type='sector_member' then nullif(btrim(p_military_rank),'') else null end,true,auth.uid()) returning id into v_id;
  perform public.write_audit('إضافة فرد للجدول','جدول القطاع',v_id::text,btrim(p_name),'إضافة فرد جديد',jsonb_build_object('job_code',p_job_code,'copy_id',p_copy_id));
  return v_id;
end;$$;
grant execute on function public.create_roster_member_v55(text,text,text,text,text,text,text,text,date) to authenticated;

create or replace function public.update_roster_member_v55(
  p_roster_id uuid, p_name text, p_job_code text, p_copy_id text, p_military_rank text,
  p_title text, p_member_type text, p_department_key text,
  p_discord_id text, p_hired_at date
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not (public.current_profile_is_owner() or public.current_profile_has_permission('manage_schedule') or public.current_profile_has_permission('manage_accounts') or public.current_profile_has_permission('manage_personnel_tracking')) then raise exception 'not authorized'; end if;
  update public.personnel_roster set name=coalesce(nullif(btrim(p_name),''),name),job_code=nullif(upper(btrim(p_job_code)),''),copy_id=coalesce(nullif(btrim(p_copy_id),''),copy_id),military_rank=nullif(btrim(p_military_rank),''),title=coalesce(nullif(btrim(p_title),''),'عضو'),member_type=p_member_type,department_key=nullif(btrim(p_department_key),''),discord_id=nullif(btrim(p_discord_id),''),hired_at=coalesce(p_hired_at,hired_at),updated_at=now() where id=p_roster_id and active=true;
  if not found then raise exception 'roster member not found'; end if;
  perform public.write_audit('تعديل فرد في الجدول','جدول القطاع',p_roster_id::text,coalesce(nullif(btrim(p_name),''),'عضو'),'تحديث بيانات القوة البشرية',jsonb_build_object('job_code',p_job_code,'copy_id',p_copy_id));
end;$$;
grant execute on function public.update_roster_member_v55(uuid,text,text,text,text,text,text,text,text,date) to authenticated;

-- استبدال دالة الأرشفة لتقييم منع التوظيف تلقائيًا عند الاستقالة.
create or replace function public.archive_roster_member_v2(
  p_roster_id uuid, p_departure_type text, p_reason text, p_effective_date date
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_roster public.personnel_roster%rowtype; v_id uuid; v_ban boolean:=false; v_reasons text[]:=array[]::text[]; v_reason text; v_until date;
begin
  if not (public.current_profile_is_owner() or public.current_profile_has_permission('manage_schedule') or public.current_profile_has_permission('manage_accounts') or public.current_profile_has_permission('manage_personnel_tracking')) then raise exception 'not authorized'; end if;
  if p_departure_type not in ('resignation','dismissal') then raise exception 'invalid departure type'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'reason is required'; end if;
  select * into v_roster from public.personnel_roster where id=p_roster_id and active=true;
  if not found then raise exception 'roster member not found'; end if;
  if p_departure_type='resignation' then
    if v_roster.appointment_rank is not null and v_roster.military_rank=v_roster.appointment_rank then v_reasons:=array_append(v_reasons,'استقالة بنفس رتبة التعيين'); end if;
    if v_roster.hired_at is not null and p_effective_date < (v_roster.hired_at + 14) then v_reasons:=array_append(v_reasons,'استقالة خلال فترة التدريب (أقل من أسبوعين)'); end if;
    if v_roster.military_rank in ('جندي','جندي أول') then v_reasons:=array_append(v_reasons,'استقالة برتبة '||v_roster.military_rank); end if;
    v_ban:=coalesce(array_length(v_reasons,1),0)>0;
  end if;
  if v_ban then v_until:=p_effective_date+14; v_reason:=array_to_string(v_reasons,' + '); end if;
  insert into public.personnel_departures(roster_id,profile_id,person_name,copy_id,job_code,military_rank,departure_type,reason,effective_date,ban_required,ban_until,ban_reason,created_by)
  values(v_roster.id,v_roster.profile_id,v_roster.name,v_roster.copy_id,v_roster.job_code,v_roster.military_rank,p_departure_type,btrim(p_reason),p_effective_date,v_ban,v_until,v_reason,auth.uid()) returning id into v_id;
  update public.personnel_roster set active=false,updated_at=now() where id=v_roster.id;
  if v_roster.profile_id is not null then update public.profiles set personnel_state=case when p_departure_type='resignation' then 'resigned' else 'dismissed' end,status='rejected' where id=v_roster.profile_id and is_owner=false; end if;
  perform public.write_audit(case when p_departure_type='resignation' then 'استقالة' else 'فصل' end,'جدول القطاع',v_roster.id::text,v_roster.name,btrim(p_reason),jsonb_build_object('ban_required',v_ban,'ban_until',v_until,'ban_reason',v_reason));
  return v_id;
end;$$;
grant execute on function public.archive_roster_member_v2(uuid,text,text,date) to authenticated;

-- محتوى قوانين V5.5 (يضاف فقط إذا لم يوجد نفس العنوان)
insert into public.content_items(slug,category,title,body,badge,sort_order,active)
select v.* from (values
  ('laws','السلوك والانضباط','الاحترام والانضباط العام','احترام أفراد القطاع وباقي القطاعات واللاعبين واجب. يمنع السب والاستنقاص والاستفزاز المتعمد، وإدخال الخلافات الشخصية في العمل، والتهريج وقت البلاغات الجدية، واستغلال الرتبة أو الصلاحية ضد شخص بسبب خلاف.','أساسي',10,true),
  ('laws','السلوك والانضباط','عدم استغلال الصلاحيات','يمنع استخدام الصلاحيات لصديق أو قريب، أو تجاهل مخالفة، أو تسريب معلومات، أو إعطاء ميزة غير مستحقة. أي تصرف يضر سمعة القطاع أو يسبب مشاكل متكررة يخضع للمحاسبة.','جسيم',20,true),
  ('laws','الرول بلاي','RDM / VDM / Meta / PowerGaming','تطبق قوانين السيرفر العامة أولًا. يمنع القتل أو الدهس دون سبب RP، واستخدام معلومات خارج اللعبة، وإجبار الطرف الآخر على نتيجة غير منطقية، والخروج من اللعبة للهروب من مطاردة أو توقيف أو محاسبة.','RP',30,true),
  ('laws','الرول بلاي','البق والثغرات والبث','يمنع استغلال مشاكل اللعبة أو الأنيميشن أو مناطق الأمان، وStream Sniping، وبناء قرار ميداني على معلومة إدارية أو معلومة لم يحصل عليها العسكري داخل السيناريو.','RP',40,true),
  ('laws','الزي والتجهيز','الزي والرتب والتجهيزات','كل رتبة تلتزم بالزي المخصص لها. يمنع لبس شارة أو رتبة أو قطعة تدل على منصب غير منصبك، وتسليم سلاح أو تجهيز تابع للقطاع لشخص خارجه، واستخدام تجهيز العمليات خارج الحاجة.','ميداني',50,true),
  ('laws','المركبات','المركبة الحكومية','استخدم المركبة المصرح بها حسب الرتبة والمهمة. يمنع استخدامها لمشاوير شخصية أو تفحيط أو استعراض، والسير بمركبة تالفة أو غير آمنة، وتغيير لونها أو شكلها بما يخالف الهوية المعتمدة.','ميداني',60,true),
  ('laws','البلاغات','استلام البلاغ والتحديث','أول وحدة تستلم البلاغ تعطي تحديثًا واضحًا: الحالة والموقع والحاجة للدعم. يمنع تكدس الوحدات على بلاغ بسيط، ويجب تنسيق الاختصاص مع القطاعات الأخرى قبل استلام المشهد.','عمليات',70,true),
  ('laws','البلاغات','نهاية الحالة','بعد انتهاء الحالة يعطي المسؤول نهاية واضحة للراديو، وتفك الوحدات الزائدة. إذا كانت الحالة أكبر من قدرة الوحدة أو فيها عدة مشتبهين مسلحين يطلب الدعم مبكرًا.','عمليات',80,true),
  ('laws','القضايا والتحقيق','بناء القضية على سبب ودليل','قبل اتهام أي شخص يجب وجود سبب واضح داخل RP: مشاهدة، بلاغ موثوق، دليل، اعتراف أو قرائن منطقية. يمنع تلفيق دليل أو تغيير قصة، ويجب توثيق الأدلة المهمة بالطريقة المتاحة.','تحقيق',90,true),
  ('laws','القضايا والتحقيق','حياد المحقق','إذا كان العسكري طرفًا في المشكلة أو بينه وبين المتهم خلاف شخصي يفضل تسليم التحقيق لشخص آخر. الأدلة المبرئة لا تُتجاهل، والقضايا الكبيرة يفضل مراجعتها من ضابط أو مسؤول.','تحقيق',100,true),
  ('laws','التوقيف والتفتيش','التقييد والتفتيش','لا يقيّد أو يفتش شخص بدون مبرر مقبول حسب نظام السيرفر. لا يطول التوقيف بدون داع، ولا تؤخذ أغراض لا علاقة لها بالقضية، ويطلب الهلال الأحمر للمصاب عند الحاجة.','إجراء',110,true),
  ('laws','القوة والسلاح','التدرج في استخدام القوة','القوة تكون على قدر الخطر. السلاح الناري لا يخرج لمجرد عدم التعاون بالكلام، ويمنع إطلاق النار للترهيب أو على مركبة هاربة دون مبرر. إذا انتهى التهديد ينتهي التصعيد.','حساس',120,true),
  ('laws','المطاردات','تنظيم المطاردة','الوحدة الأولى هي المرجع للتحديثات ما لم تُسلّم القيادة. التحديث مختصر: الاتجاه والموقع والمركبة وعدد الأشخاص والخطر. يمنع الصدم العشوائي والتكدس والمخاطرة غير المبررة.','ميداني',130,true),
  ('laws','الراديو','انضباط الراديو','الراديو للعمل وقت المباشرة. وقت البلاغات الكبيرة يتكلم من لديه معلومة مهمة فقط، ويلتزم الجميع بصمت الراديو عند طلبه. يمنع استخدام الراديو لطلب ترقية أو إجازة أو موضوع إداري.','اتصالات',140,true),
  ('laws','الحضور','الدخول والخروج والساعات','احتساب الحضور والساعات يكون من التسجيلات المعتمدة. أي تلاعب أو تسجيل وهمي مخالفة قوية. الخروج المتأخر لا يتجاوز ساعة من الوقت الحقيقي وبالرد على رسالة الدخول الأصلية، ولا يسجل شخص عن شخص.','إداري',150,true),
  ('laws','التقارير والرصد','شروط قبول التقرير','أي تقرير يظهر عليه EDITED يرفض إذا هذا هو النظام المعتمد. لا يرسل التقرير قبل اكتمال مدته، وبعد اكتمال الساعة تكون مهلة الإرسال 10 دقائق. التوجيهات تكتب كاملة، والملاحظات والإيجابيات والسلبيات توضح، وإذا لا يوجد يكتب «لا يوجد».','رصد',160,true),
  ('laws','الإجازات','الإجازة والانتداب وسد العجز','الإجازة الداخلية بالساعات والخارجية بالتواريخ. رفع الطلب لا يعني اعتماده. الانتداب وسد العجز يكونان بتكليف واضح ولمدة أو سبب معروف، وبعد انتهاء التكليف يعود الشخص لوضعه الطبيعي.','إداري',170,true),
  ('laws','الرتب والترقيات','الترقية والصلاحيات','الترقية لا تعتمد بالكلام أو بتغيير رول فقط، ولا يحق لأي شخص تعديل رتبته بنفسه. طلب الترقية أو الضغط عليها لا يعطي استحقاقًا. الاعتراض يكون بالقناة الرسمية، والاستحقاق مرتبط بالحضور والانضباط وجودة العمل والتقارير والدورات.','ترقيات',180,true),
  ('laws','القيادات','مسؤولية القيادي','القيادي يطبق القانون على نفسه قبل الأفراد. يمنع التهديد بالرتبة، والقرارات الكبيرة مثل الفصل وكسر الرتبة وتغيير المسؤوليات توثق. لا يحاسب القيادي شخصًا وهو منفعل بسبب خلاف مباشر.','قيادة',190,true),
  ('laws','الشؤون الإدارية','توثيق السجلات والصلاحيات','الشؤون توثق القرارات التي تمس رتبة أو محاسبة أو إجازة. يمنع تعديل الحضور أو المخالفات لإرضاء شخص. كل موظف إداري يأخذ الصلاحيات اللازمة لعمله فقط، والمسؤول والمدقق يلتزمان باختصاصهما.','شؤون',200,true),
  ('laws','الشرطة العسكرية','المحاسبات الداخلية','الشرطة العسكرية تستلم القضايا الداخلية دون تحيز. الشكوى تحتاج واقعة واضحة ويفضل إثبات. يمنع فتح محاسبة كيدية، والعقوبة تعتمد على حجم المخالفة والتكرار والضرر والسجل. نتيجة المحاسبة توثق بالاسم والرتبة والسبب والإجراء والتاريخ ومن أصدر القرار.','MP',210,true),
  ('laws','التنسيق','التعامل مع القطاعات الأخرى','كل قطاع له اختصاصه. الأمن الدبلوماسي ليس مرورًا ولا ينفذ نقاط تفتيش أو مخالفات مرورية عشوائية إلا إذا كانت مرتبطة بقضية أو تكليف أو عملية مشتركة. الخلافات بين القطاعات تُحل إداريًا بعد إنهاء الخطر.','مشترك',220,true),
  ('laws','الديسكورد','القنوات والبيانات الإدارية','الرومات الرسمية تستخدم لغرضها. يمنع حذف رسائل إدارية لإخفاء خطأ، ونشر صور أو معلومات من رومات خاصة، واستخدام الصلاحيات لتعديل روالات أو حذف محتوى بدون سبب وصلاحية. المنشن يكون للحاجة فقط.','Discord',230,true),
  ('laws','مخالفات جسيمة','حالات تستحق تصعيدًا قويًا','من المخالفات الجسيمة بعد التحقق: تسريب معلومات للمجرمين، التلاعب بالرتب والروالات، تلفيق الأدلة، استغلال صلاحية إدارية للفوز أو الانتقام، التلاعب المتعمد والمتكرر بالساعات أو التقارير، الفساد والابتزاز وتسريب كلمات المرور.','جسيم',240,true)
) as v(slug,category,title,body,badge,sort_order,active)
where not exists (select 1 from public.content_items c where c.slug='laws' and c.title=v.title);

-- خصوصية سجل الاستقالات والفصل: السجل كامل داخلي فقط.
drop policy if exists "public reads personnel departures" on public.personnel_departures;
revoke select on public.personnel_departures from anon;
drop policy if exists "roster managers read departures v55" on public.personnel_departures;
create policy "roster managers read departures v55" on public.personnel_departures for select to authenticated
using (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_schedule')
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_personnel_tracking')
);
