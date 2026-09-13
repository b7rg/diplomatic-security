-- =====================================================================
-- V5.4 — ROSTER MANAGEMENT / نظام أفراد مستقل عن حسابات الدخول
-- شغّل هذا الملف مرة واحدة إذا كانت قاعدة البيانات لديك على V5.3.
-- الفكرة: جدول القوة البشرية مستقل عن profiles، لذلك يمكن إضافة عسكري
-- إلى الجدول بدون إنشاء حساب دخول له. الربط بالحساب اختياري عبر profile_id.
-- =====================================================================

create table if not exists public.personnel_roster (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  name text not null,
  job_code text,
  copy_id text not null,
  title text not null default 'عضو',
  member_type text not null default 'sector_member'
    check (member_type in ('management','approved_player','sector_member')),
  military_rank text,
  department_key text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists personnel_roster_active_code_unique
  on public.personnel_roster (member_type, upper(job_code))
  where active = true and job_code is not null and btrim(job_code) <> '';

create unique index if not exists personnel_roster_active_copy_unique
  on public.personnel_roster (copy_id)
  where active = true and btrim(copy_id) <> '';

-- انقل الأعضاء الحاليين من profiles إلى الجدول المستقل مرة واحدة.
insert into public.personnel_roster(
  profile_id, name, job_code, copy_id, title, member_type,
  military_rank, department_key, active, created_by, created_at
)
select
  p.id, p.name, p.job_code, coalesce(nullif(p.copy_id,''), 'PROFILE-' || left(p.id::text,8)),
  p.title, p.member_type, p.military_rank, p.department_key,
  coalesce(p.personnel_state,'active') = 'active', p.approved_by, p.created_at
from public.profiles p
where p.is_owner = false and p.status = 'approved'
on conflict (profile_id) do nothing;

alter table public.personnel_roster enable row level security;

drop policy if exists "roster managers read" on public.personnel_roster;
create policy "roster managers read" on public.personnel_roster
for select to authenticated using (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_schedule')
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_personnel_tracking')
);

drop policy if exists "roster managers insert" on public.personnel_roster;
create policy "roster managers insert" on public.personnel_roster
for insert to authenticated with check (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_schedule')
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_personnel_tracking')
);

drop policy if exists "roster managers update" on public.personnel_roster;
create policy "roster managers update" on public.personnel_roster
for update to authenticated using (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_schedule')
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_personnel_tracking')
) with check (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_schedule')
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_personnel_tracking')
);

grant select, insert, update on public.personnel_roster to authenticated;

alter table public.personnel_departures
  add column if not exists roster_id uuid references public.personnel_roster(id) on delete set null;

-- العرض العام يقرأ فقط الحقول المطلوبة، ولا يفتح جدول personnel_roster للعامة.
create or replace function public.get_public_roster()
returns table (
  id uuid,
  name text,
  job_code text,
  copy_id text,
  title text,
  member_type text,
  military_rank text,
  department_key text,
  personnel_state text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.name, r.job_code, r.copy_id, r.title, r.member_type,
         r.military_rank, r.department_key, 'active'::text
  from public.personnel_roster r
  where r.active = true
  order by r.created_at asc;
$$;

grant execute on function public.get_public_roster() to anon, authenticated;

create or replace function public.create_roster_member(
  p_name text,
  p_job_code text,
  p_copy_id text,
  p_military_rank text,
  p_title text,
  p_member_type text,
  p_department_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not (
    public.current_profile_is_owner()
    or public.current_profile_has_permission('manage_schedule')
    or public.current_profile_has_permission('manage_accounts')
    or public.current_profile_has_permission('manage_personnel_tracking')
  ) then raise exception 'not authorized'; end if;

  if p_member_type not in ('management','approved_player','sector_member') then
    raise exception 'invalid member type';
  end if;
  if nullif(trim(p_name),'') is null then raise exception 'name is required'; end if;
  if nullif(trim(p_copy_id),'') is null then raise exception 'copy id is required'; end if;
  if nullif(trim(p_job_code),'') is null then raise exception 'job code is required'; end if;

  insert into public.personnel_roster(
    name, job_code, copy_id, military_rank, title,
    member_type, department_key, active, created_by
  ) values (
    trim(p_name), upper(trim(p_job_code)), trim(p_copy_id), nullif(trim(p_military_rank),''),
    coalesce(nullif(trim(p_title),''),'عضو'), p_member_type,
    nullif(trim(p_department_key),''), true, auth.uid()
  ) returning id into v_id;

  perform public.write_audit(
    'إضافة فرد للجدول', 'جدول القطاع', v_id::text, trim(p_name),
    'إضافة سجل جديد إلى القوة الحالية',
    jsonb_build_object('job_code',upper(trim(p_job_code)),'copy_id',trim(p_copy_id),'member_type',p_member_type,'title',p_title)
  );
  return v_id;
end;
$$;

grant execute on function public.create_roster_member(text,text,text,text,text,text,text) to authenticated;

create or replace function public.update_roster_member(
  p_roster_id uuid,
  p_name text,
  p_job_code text,
  p_copy_id text,
  p_military_rank text,
  p_title text,
  p_member_type text,
  p_department_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.current_profile_is_owner()
    or public.current_profile_has_permission('manage_schedule')
    or public.current_profile_has_permission('manage_accounts')
    or public.current_profile_has_permission('manage_personnel_tracking')
  ) then raise exception 'not authorized'; end if;

  if p_member_type not in ('management','approved_player','sector_member') then
    raise exception 'invalid member type';
  end if;

  update public.personnel_roster
  set name = coalesce(nullif(trim(p_name),''), name),
      job_code = nullif(upper(trim(p_job_code)),''),
      copy_id = coalesce(nullif(trim(p_copy_id),''), copy_id),
      military_rank = nullif(trim(p_military_rank),''),
      title = coalesce(nullif(trim(p_title),''),'عضو'),
      member_type = p_member_type,
      department_key = nullif(trim(p_department_key),''),
      updated_at = now()
  where id = p_roster_id and active = true;

  if not found then raise exception 'roster member not found'; end if;

  perform public.write_audit(
    'تعديل فرد في الجدول', 'جدول القطاع', p_roster_id::text,
    coalesce(nullif(trim(p_name),''),'عضو'), 'تحديث بيانات القوة البشرية',
    jsonb_build_object('job_code',p_job_code,'copy_id',p_copy_id,'rank',p_military_rank,'title',p_title,'member_type',p_member_type)
  );
end;
$$;

grant execute on function public.update_roster_member(uuid,text,text,text,text,text,text,text) to authenticated;

create or replace function public.archive_roster_member_v2(
  p_roster_id uuid,
  p_departure_type text,
  p_reason text,
  p_effective_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roster public.personnel_roster%rowtype;
  v_id uuid;
begin
  if not (
    public.current_profile_is_owner()
    or public.current_profile_has_permission('manage_schedule')
    or public.current_profile_has_permission('manage_accounts')
    or public.current_profile_has_permission('manage_personnel_tracking')
  ) then raise exception 'not authorized'; end if;

  if p_departure_type not in ('resignation','dismissal') then raise exception 'invalid departure type'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'reason is required'; end if;

  select * into v_roster from public.personnel_roster where id = p_roster_id and active = true;
  if not found then raise exception 'roster member not found'; end if;

  insert into public.personnel_departures(
    roster_id, profile_id, person_name, copy_id, job_code, military_rank,
    departure_type, reason, effective_date, created_by
  ) values (
    v_roster.id, v_roster.profile_id, v_roster.name, v_roster.copy_id, v_roster.job_code,
    v_roster.military_rank, p_departure_type, trim(p_reason), p_effective_date, auth.uid()
  ) returning id into v_id;

  update public.personnel_roster set active = false, updated_at = now() where id = v_roster.id;

  -- إذا كان السجل مربوطًا بحساب دخول، أوقف الحساب كذلك حتى لا يبقى فعالًا بعد الاستقالة/الفصل.
  if v_roster.profile_id is not null then
    update public.profiles
    set personnel_state = case when p_departure_type='resignation' then 'resigned' else 'dismissed' end,
        status = 'rejected'
    where id = v_roster.profile_id and is_owner = false;
  end if;

  perform public.write_audit(
    case when p_departure_type='resignation' then 'استقالة' else 'فصل' end,
    'جدول القطاع', v_roster.id::text, v_roster.name, trim(p_reason),
    jsonb_build_object('copy_id',v_roster.copy_id,'job_code',v_roster.job_code,'effective_date',p_effective_date)
  );
  return v_id;
end;
$$;

grant execute on function public.archive_roster_member_v2(uuid,text,text,date) to authenticated;
