-- =====================================================================
-- V5.3 — الجدول الرسمي للعساكر + أرشيف الاستقالات والفصل
-- شغّل هذا الملف مرة واحدة إذا كانت قاعدة البيانات لديك على V5.2 أو أقدم.
-- =====================================================================

alter table public.profiles
  add column if not exists personnel_state text not null default 'active';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_personnel_state_check') then
    alter table public.profiles add constraint profiles_personnel_state_check
      check (personnel_state in ('active','resigned','dismissed'));
  end if;
end $$;

-- سجل منفصل عن القوة الحالية.
create table if not exists public.personnel_departures (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  person_name text not null,
  copy_id text not null,
  job_code text,
  military_rank text,
  departure_type text not null check (departure_type in ('resignation','dismissal')),
  reason text not null,
  effective_date date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.personnel_departures enable row level security;

drop policy if exists "public reads personnel departures" on public.personnel_departures;
create policy "public reads personnel departures" on public.personnel_departures
for select to anon, authenticated using (true);

drop policy if exists "roster managers insert departures" on public.personnel_departures;
create policy "roster managers insert departures" on public.personnel_departures
for insert to authenticated with check (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_schedule')
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_personnel_tracking')
);

drop policy if exists "roster managers update departures" on public.personnel_departures;
create policy "roster managers update departures" on public.personnel_departures
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

drop policy if exists "roster managers delete departures" on public.personnel_departures;
create policy "roster managers delete departures" on public.personnel_departures
for delete to authenticated using (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_schedule')
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_personnel_tracking')
);

grant select on public.personnel_departures to anon, authenticated;
grant insert, update, delete on public.personnel_departures to authenticated;

-- واجهة عامة آمنة: لا تفتح جدول profiles للعامة، بل ترجع الحقول اللازمة فقط.
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
  select p.id, p.name, p.job_code, p.copy_id, p.title, p.member_type,
         p.military_rank, p.department_key, p.personnel_state
  from public.profiles p
  where p.status = 'approved'
    and coalesce(p.personnel_state,'active') = 'active'
  order by p.created_at asc;
$$;

grant execute on function public.get_public_roster() to anon, authenticated;

-- تعديل حقول الجدول المحددة فقط من مسؤول الجدول/الشؤون/الحسابات.
create or replace function public.update_roster_profile(
  p_profile_id uuid,
  p_name text,
  p_job_code text,
  p_copy_id text,
  p_military_rank text,
  p_title text,
  p_member_type text
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
  ) then
    raise exception 'not authorized';
  end if;

  if p_member_type not in ('management','approved_player','sector_member') then
    raise exception 'invalid member type';
  end if;

  update public.profiles
  set name = coalesce(nullif(trim(p_name),''), name),
      job_code = nullif(upper(trim(p_job_code)),''),
      copy_id = nullif(trim(p_copy_id),''),
      military_rank = nullif(trim(p_military_rank),''),
      title = coalesce(nullif(trim(p_title),''),'عضو'),
      member_type = p_member_type
  where id = p_profile_id and is_owner = false;

  perform public.write_audit(
    'تعديل بيانات الجدول',
    'جدول القطاع',
    p_profile_id::text,
    coalesce(nullif(trim(p_name),''), 'عضو'),
    'تحديث بيانات الفرد في الجدول الرسمي',
    jsonb_build_object('job_code',p_job_code,'copy_id',p_copy_id,'rank',p_military_rank,'title',p_title,'member_type',p_member_type)
  );
end;
$$;

grant execute on function public.update_roster_profile(uuid,text,text,text,text,text,text) to authenticated;

-- ينقل العسكري للأرشيف ويوقف اعتماده حتى لا يبقى في الجدول أو النظام.
create or replace function public.archive_roster_member(
  p_profile_id uuid,
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
  v_profile public.profiles%rowtype;
  v_id uuid;
begin
  if not (
    public.current_profile_is_owner()
    or public.current_profile_has_permission('manage_schedule')
    or public.current_profile_has_permission('manage_accounts')
    or public.current_profile_has_permission('manage_personnel_tracking')
  ) then
    raise exception 'not authorized';
  end if;

  if p_departure_type not in ('resignation','dismissal') then
    raise exception 'invalid departure type';
  end if;
  if nullif(trim(p_reason),'') is null then
    raise exception 'reason is required';
  end if;

  select * into v_profile from public.profiles where id = p_profile_id and is_owner = false;
  if not found then raise exception 'profile not found'; end if;

  insert into public.personnel_departures(
    profile_id, person_name, copy_id, job_code, military_rank,
    departure_type, reason, effective_date, created_by
  ) values (
    v_profile.id, v_profile.name, coalesce(v_profile.copy_id,'—'), v_profile.job_code,
    v_profile.military_rank, p_departure_type, trim(p_reason), p_effective_date, auth.uid()
  ) returning id into v_id;

  update public.profiles
  set personnel_state = case when p_departure_type='resignation' then 'resigned' else 'dismissed' end,
      status = 'rejected'
  where id = p_profile_id;

  perform public.write_audit(
    case when p_departure_type='resignation' then 'استقالة' else 'فصل' end,
    'جدول القطاع',
    p_profile_id::text,
    v_profile.name,
    trim(p_reason),
    jsonb_build_object('copy_id',v_profile.copy_id,'job_code',v_profile.job_code,'effective_date',p_effective_date)
  );

  return v_id;
end;
$$;

grant execute on function public.archive_roster_member(uuid,text,text,date) to authenticated;
