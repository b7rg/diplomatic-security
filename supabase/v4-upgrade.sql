-- =====================================================================
-- V4 UPGRADE — personnel categories, unified applications, officer
-- college question builder, personal promotion card and tracking.
-- Safe to run after the V2/V3 schema in this same file.
-- =====================================================================

-- ----------------------- PROFILE CLASSIFICATION ----------------------
alter table public.profiles add column if not exists member_type text not null default 'sector_member';
alter table public.profiles add column if not exists military_rank text;
alter table public.profiles add column if not exists department_key text;
alter table public.profiles add column if not exists server_roles text[] not null default '{}';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_member_type_check') then
    alter table public.profiles add constraint profiles_member_type_check
      check (member_type in ('management','approved_player','sector_member'));
  end if;
end $$;

-- Refresh profile policies so personnel trackers can read/update people.
drop policy if exists "profile read own or managers" on public.profiles;
create policy "profile read own or managers" on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_roles')
  or public.current_profile_has_permission('manage_personnel_tracking')
);

drop policy if exists "account managers update profiles" on public.profiles;
create policy "account managers update profiles" on public.profiles for update to authenticated
using (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_roles')
  or public.current_profile_has_permission('manage_personnel_tracking')
)
with check (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_roles')
  or public.current_profile_has_permission('manage_personnel_tracking')
);

-- ---------------------- UNIFIED DEPARTMENT INTAKE --------------------
create table if not exists public.department_applications (
  id uuid primary key default gen_random_uuid(),
  target_key text not null,
  target_name text not null,
  full_name text not null,
  game_name text not null,
  discord_name text not null,
  job_code text not null,
  copy_id text not null,
  military_rank text not null,
  motivation text not null,
  experience text not null,
  availability text not null,
  answers jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new','reviewing','accepted','rejected')),
  reviewer_note text,
  assigned_title text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.department_applications enable row level security;

drop policy if exists "public submits department applications" on public.department_applications;
create policy "public submits department applications" on public.department_applications
for insert to anon, authenticated
with check (
  length(trim(target_key)) between 2 and 80
  and length(trim(target_name)) between 2 and 120
  and length(trim(full_name)) between 2 and 120
  and length(trim(job_code)) between 1 and 60
  and length(trim(copy_id)) between 1 and 60
  and status = 'new'
  and reviewer_note is null
  and assigned_title is null
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists "application managers read department applications" on public.department_applications;
create policy "application managers read department applications" on public.department_applications
for select to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_applications'));

drop policy if exists "application managers update department applications" on public.department_applications;
create policy "application managers update department applications" on public.department_applications
for update to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_applications'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_applications'));

create or replace function public.audit_department_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status
     or old.reviewer_note is distinct from new.reviewer_note
     or old.assigned_title is distinct from new.assigned_title then
    perform public.write_audit(
      'مراجعة طلب قسم',
      'طلبات الأقسام',
      new.id::text,
      new.full_name,
      'تم تحديث طلب ' || new.target_name,
      jsonb_build_object('target',new.target_key,'old_status',old.status,'new_status',new.status,'assigned_title',new.assigned_title)
    );
  end if;
  return new;
end; $$;

drop trigger if exists audit_department_applications on public.department_applications;
create trigger audit_department_applications after update on public.department_applications
for each row execute procedure public.audit_department_application();

-- --------------------- OFFICER COLLEGE QUESTIONS ---------------------
create table if not exists public.application_questions (
  id uuid primary key default gen_random_uuid(),
  target_key text not null default 'officer-college',
  question text not null,
  required boolean not null default true,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.application_questions enable row level security;

drop policy if exists "public reads active application questions" on public.application_questions;
create policy "public reads active application questions" on public.application_questions
for select to anon, authenticated
using (active = true or public.current_profile_is_owner() or public.current_profile_has_permission('manage_application_questions'));

drop policy if exists "question managers insert application questions" on public.application_questions;
create policy "question managers insert application questions" on public.application_questions
for insert to authenticated
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_application_questions'));

drop policy if exists "question managers update application questions" on public.application_questions;
create policy "question managers update application questions" on public.application_questions
for update to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_application_questions'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_application_questions'));

drop policy if exists "question managers delete application questions" on public.application_questions;
create policy "question managers delete application questions" on public.application_questions
for delete to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_application_questions'));

insert into public.application_questions(target_key,question,required,active,position)
select * from (values
 ('officer-college','ليش تبي تنضم لكلية الضباط الأمنية؟',true,true,1),
 ('officer-college','وش المهارات القيادية اللي تشوف أنها تميزك؟ اذكر مثال.',true,true,2),
 ('officer-college','كيف تتصرف لو استلمت مسؤولية فريق وحدث خلاف بين أفراده أثناء المهمة؟',true,true,3),
 ('officer-college','وش يعني لك الانضباط العسكري؟ وكيف تثبته عمليًا؟',true,true,4),
 ('officer-college','اذكر هدفك بعد التخرج من كلية الضباط الأمنية.',true,true,5)
) as seed(target_key,question,required,active,position)
where not exists (select 1 from public.application_questions where target_key='officer-college');

-- ---------------------- PERSONNEL PROMOTION TRACKING -----------------
create table if not exists public.personnel_progress (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  attendance_score integer not null default 0 check (attendance_score >= 0),
  reports_score integer not null default 0 check (reports_score >= 0),
  discipline_score integer not null default 0 check (discipline_score >= 0),
  missions_score integer not null default 0 check (missions_score >= 0),
  bonus_score integer not null default 0 check (bonus_score >= 0),
  penalty_score integer not null default 0 check (penalty_score >= 0),
  required_score integer not null default 100 check (required_score > 0),
  target_rank text,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.personnel_progress enable row level security;

drop policy if exists "person reads own progress or trackers read all" on public.personnel_progress;
create policy "person reads own progress or trackers read all" on public.personnel_progress
for select to authenticated
using (
  profile_id = auth.uid()
  or public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_personnel_tracking')
);

drop policy if exists "trackers insert progress" on public.personnel_progress;
create policy "trackers insert progress" on public.personnel_progress
for insert to authenticated
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'));

drop policy if exists "trackers update progress" on public.personnel_progress;
create policy "trackers update progress" on public.personnel_progress
for update to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'));

create or replace function public.audit_personnel_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from public.profiles where id = new.profile_id;
  perform public.write_audit(
    'تحديث رصد وترقية',
    'رصد الأفراد',
    new.profile_id::text,
    v_name,
    'تم تحديث نقاط الرصد ومسار الترقية',
    jsonb_build_object(
      'attendance',new.attendance_score,'reports',new.reports_score,'discipline',new.discipline_score,
      'missions',new.missions_score,'bonus',new.bonus_score,'penalty',new.penalty_score,
      'required',new.required_score,'target_rank',new.target_rank
    )
  );
  return new;
end; $$;

drop trigger if exists audit_personnel_progress on public.personnel_progress;
create trigger audit_personnel_progress after insert or update on public.personnel_progress
for each row execute procedure public.audit_personnel_progress();
