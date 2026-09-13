-- =====================================================================
-- DSC V5.6 — تسهيلات الترقية + تحسين بطاقة العسكري
-- شغّل الملف مرة واحدة فوق V5.5.
-- =====================================================================

create table if not exists public.promotion_adjustments (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.personnel_roster(id) on delete cascade,
  adjustment_type text not null check (adjustment_type in ('report_discount','half_requirements')),
  report_kind text check (report_kind is null or report_kind in ('operations','area_officer','officer','duty_officer')),
  amount integer not null default 0 check (amount >= 0),
  note text,
  active boolean not null default true,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_by_name text not null,
  recorded_by_title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_adjustments_shape_check check (
    (adjustment_type='half_requirements' and report_kind is null)
    or
    (adjustment_type='report_discount' and report_kind is not null and amount > 0)
  )
);

create unique index if not exists promotion_adjustments_one_active_half_per_roster
  on public.promotion_adjustments(roster_id)
  where adjustment_type='half_requirements' and active=true;

create index if not exists promotion_adjustments_roster_idx
  on public.promotion_adjustments(roster_id, active, created_at desc);

alter table public.promotion_adjustments enable row level security;

drop policy if exists "promotion adjustments managers read" on public.promotion_adjustments;
create policy "promotion adjustments managers read" on public.promotion_adjustments for select to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'));

drop policy if exists "promotion adjustments managers insert" on public.promotion_adjustments;
create policy "promotion adjustments managers insert" on public.promotion_adjustments for insert to authenticated
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'));

drop policy if exists "promotion adjustments managers update" on public.promotion_adjustments;
create policy "promotion adjustments managers update" on public.promotion_adjustments for update to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_personnel_tracking'));

grant select, insert, update on public.promotion_adjustments to authenticated;

-- البطاقة العامة ترجع خلاصة التسهيلات فقط، وليس سجل من اعتمدها أو ملاحظاته الداخلية.
drop function if exists public.search_personnel_card(text);
create function public.search_personnel_card(p_search text)
returns table (
  id uuid, name text, job_code text, copy_id text, title text, member_type text,
  military_rank text, department_key text, discord_id text, hired_at date,
  appointment_rank text, created_at timestamptz,
  operations_reports bigint, area_officer_reports bigint, officer_reports bigint,
  duty_officer_reports bigint, attendance_hours numeric, courses text[],
  half_requirements boolean,
  operations_discount bigint, area_officer_discount bigint,
  officer_discount bigint, duty_officer_discount bigint
)
language sql stable security definer set search_path = public
as $$
  with tracking as (
    select
      t.roster_id,
      coalesce(sum(t.quantity) filter (where t.kind='operations'),0)::bigint as operations_reports,
      coalesce(sum(t.quantity) filter (where t.kind='area_officer'),0)::bigint as area_officer_reports,
      coalesce(sum(t.quantity) filter (where t.kind='officer'),0)::bigint as officer_reports,
      coalesce(sum(t.quantity) filter (where t.kind='duty_officer'),0)::bigint as duty_officer_reports,
      coalesce(sum(t.hours) filter (where t.kind='attendance'),0)::numeric as attendance_hours,
      coalesce(array_remove(array_agg(distinct t.course_name) filter (where t.kind='course'), null), array[]::text[]) as courses
    from public.personnel_tracking_entries t
    group by t.roster_id
  ), adjustments as (
    select
      a.roster_id,
      coalesce(bool_or(a.adjustment_type='half_requirements') filter (where a.active),false) as half_requirements,
      coalesce(sum(a.amount) filter (where a.active and a.adjustment_type='report_discount' and a.report_kind='operations'),0)::bigint as operations_discount,
      coalesce(sum(a.amount) filter (where a.active and a.adjustment_type='report_discount' and a.report_kind='area_officer'),0)::bigint as area_officer_discount,
      coalesce(sum(a.amount) filter (where a.active and a.adjustment_type='report_discount' and a.report_kind='officer'),0)::bigint as officer_discount,
      coalesce(sum(a.amount) filter (where a.active and a.adjustment_type='report_discount' and a.report_kind='duty_officer'),0)::bigint as duty_officer_discount
    from public.promotion_adjustments a
    group by a.roster_id
  )
  select
    r.id, r.name, r.job_code, r.copy_id, r.title, r.member_type,
    r.military_rank, r.department_key, r.discord_id, r.hired_at,
    r.appointment_rank, r.created_at,
    coalesce(t.operations_reports,0), coalesce(t.area_officer_reports,0),
    coalesce(t.officer_reports,0), coalesce(t.duty_officer_reports,0),
    coalesce(t.attendance_hours,0), coalesce(t.courses,array[]::text[]),
    coalesce(a.half_requirements,false),
    coalesce(a.operations_discount,0), coalesce(a.area_officer_discount,0),
    coalesce(a.officer_discount,0), coalesce(a.duty_officer_discount,0)
  from public.personnel_roster r
  left join tracking t on t.roster_id=r.id
  left join adjustments a on a.roster_id=r.id
  where r.active=true and r.member_type='sector_member'
    and (r.copy_id=btrim(p_search) or r.discord_id=btrim(p_search))
  limit 1;
$$;
revoke all on function public.search_personnel_card(text) from public;
grant execute on function public.search_personnel_card(text) to anon, authenticated;
