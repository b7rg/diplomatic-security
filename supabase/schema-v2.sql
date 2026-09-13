-- =====================================================================
-- DIPLOMATIC SECURITY COMMAND PORTAL — DATABASE V2
-- Run the entire file once in Supabase > SQL Editor.
-- Designed for: request approval, capability permissions, draft review,
-- public content, schedule, announcements, audit log and secure RLS.
-- =====================================================================

create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type public.account_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

-- ----------------------------- PROFILES -------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'مستخدم جديد',
  job_code text,
  copy_id text,
  status public.account_status not null default 'pending',
  title text not null default 'عضو',
  permissions text[] not null default '{}',
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, job_code, copy_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'job_code', ''),
    nullif(new.raw_user_meta_data->>'copy_id', '')
  ) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_profile_is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved' and p.is_owner = true
  );
$$;

create or replace function public.current_profile_has_permission(permission_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved'
      and (p.is_owner = true or permission_name = any(p.permissions))
  );
$$;

create or replace function public.can_edit_slug(slug_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_profile_is_owner()
    or public.current_profile_has_permission('manage_content')
    or (slug_name = 'laws' and public.current_profile_has_permission('edit_laws'))
    or (slug_name = 'protocols' and public.current_profile_has_permission('edit_protocols'))
    or (slug_name = 'promotions' and public.current_profile_has_permission('edit_promotions'))
    or (slug_name = 'leaves' and public.current_profile_has_permission('edit_leaves'));
$$;

alter table public.profiles enable row level security;
drop policy if exists "profile read own or managers" on public.profiles;
drop policy if exists "profile read own or owner" on public.profiles;
create policy "profile read own or managers" on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_roles')
);

drop policy if exists "account managers update profiles" on public.profiles;
drop policy if exists "owner updates profiles" on public.profiles;
create policy "account managers update profiles" on public.profiles for update to authenticated
using (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_roles')
)
with check (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_roles')
);

-- ------------------------------ AUDIT --------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_label text,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
drop policy if exists "audit readers" on public.audit_logs;
create policy "audit readers" on public.audit_logs for select to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('view_audit'));

create or replace function public.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_entity_label text default null,
  p_details text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from public.profiles where id = auth.uid();
  insert into public.audit_logs(actor_id, actor_name, action, entity_type, entity_id, entity_label, details, metadata)
  values(auth.uid(), coalesce(v_name,'النظام'), p_action, p_entity_type, p_entity_id, p_entity_label, p_details, coalesce(p_metadata,'{}'::jsonb));
end; $$;

-- ------------------------- PUBLISHED CONTENT --------------------------
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug in ('laws','protocols','promotions','leaves')),
  category text not null default 'عام',
  title text not null,
  body text not null,
  badge text,
  sort_order integer not null default 100,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.content_items enable row level security;
drop policy if exists "public reads published content" on public.content_items;
drop policy if exists "public reads active content" on public.content_items;
create policy "public reads published content" on public.content_items for select to anon, authenticated
using (active = true or public.can_edit_slug(slug) or public.current_profile_has_permission('publish_content'));

drop policy if exists "publishers write content" on public.content_items;
drop policy if exists "edit content" on public.content_items;
create policy "publishers write content" on public.content_items for all to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('publish_content'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('publish_content'));

-- --------------------------- DRAFT QUEUE ------------------------------
create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  source_item_id uuid references public.content_items(id) on delete set null,
  slug text not null check (slug in ('laws','protocols','promotions','leaves')),
  change_kind text not null default 'upsert' check (change_kind in ('upsert','delete')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending_review' check (status in ('pending_review','published','rejected')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creator_name text,
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);

alter table public.content_drafts enable row level security;
drop policy if exists "editors create drafts" on public.content_drafts;
create policy "editors create drafts" on public.content_drafts for insert to authenticated
with check (created_by = auth.uid() and public.can_edit_slug(slug));

drop policy if exists "draft readers" on public.content_drafts;
create policy "draft readers" on public.content_drafts for select to authenticated
using (
  created_by = auth.uid()
  or public.current_profile_is_owner()
  or public.current_profile_has_permission('publish_content')
);

drop policy if exists "publishers review drafts" on public.content_drafts;
create policy "publishers review drafts" on public.content_drafts for update to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('publish_content'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('publish_content'));

create or replace function public.fill_draft_creator_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.creator_name is null then
    select name into new.creator_name from public.profiles where id = new.created_by;
  end if;
  return new;
end; $$;

drop trigger if exists content_draft_creator on public.content_drafts;
create trigger content_draft_creator before insert on public.content_drafts
for each row execute procedure public.fill_draft_creator_name();

create or replace function public.publish_content_draft(draft_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  d public.content_drafts%rowtype;
  target_id uuid;
begin
  if not (public.current_profile_is_owner() or public.current_profile_has_permission('publish_content')) then
    raise exception 'Not allowed to publish content';
  end if;

  select * into d from public.content_drafts where id = draft_id and status = 'pending_review' for update;
  if not found then raise exception 'Draft not found or already reviewed'; end if;

  if d.change_kind = 'delete' then
    if d.source_item_id is not null then
      delete from public.content_items where id = d.source_item_id;
      target_id := d.source_item_id;
    end if;
  elsif d.source_item_id is not null then
    update public.content_items set
      category = coalesce(d.payload->>'category', category),
      title = coalesce(d.payload->>'title', title),
      body = coalesce(d.payload->>'body', body),
      badge = nullif(d.payload->>'badge',''),
      sort_order = coalesce((d.payload->>'sort_order')::integer, sort_order),
      active = coalesce((d.payload->>'active')::boolean, active),
      updated_at = now(), updated_by = auth.uid()
    where id = d.source_item_id
    returning id into target_id;
  else
    insert into public.content_items(slug, category, title, body, badge, sort_order, active, updated_at, updated_by)
    values(
      d.slug,
      coalesce(d.payload->>'category','عام'),
      coalesce(d.payload->>'title','بند جديد'),
      coalesce(d.payload->>'body',''),
      nullif(d.payload->>'badge',''),
      coalesce((d.payload->>'sort_order')::integer,100),
      coalesce((d.payload->>'active')::boolean,true),
      now(), auth.uid()
    ) returning id into target_id;
  end if;

  update public.content_drafts set status='published', reviewed_by=auth.uid(), reviewed_at=now() where id=draft_id;
  perform public.write_audit('اعتماد ونشر مسودة','المحتوى',coalesce(target_id::text,draft_id::text),d.payload->>'title','تم اعتماد مسودة ونشرها من طابور المراجعة',jsonb_build_object('slug',d.slug,'draft_id',d.id));
  return target_id;
end; $$;

grant execute on function public.publish_content_draft(uuid) to authenticated;

-- ------------------------------ SCHEDULE ------------------------------
create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  day_label text not null,
  title text not null,
  time_label text not null,
  notes text,
  sort_order integer not null default 100,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.schedule_entries enable row level security;
drop policy if exists "public reads active schedule" on public.schedule_entries;
create policy "public reads active schedule" on public.schedule_entries for select to anon, authenticated
using (active = true or public.current_profile_is_owner() or public.current_profile_has_permission('manage_schedule'));
drop policy if exists "schedule managers edit schedule" on public.schedule_entries;
create policy "schedule managers edit schedule" on public.schedule_entries for all to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_schedule'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_schedule'));

-- --------------------------- ANNOUNCEMENTS ----------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  badge text,
  priority integer not null default 0,
  active boolean not null default true,
  published_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.announcements enable row level security;
drop policy if exists "public reads announcements" on public.announcements;
create policy "public reads announcements" on public.announcements for select to anon, authenticated
using (active = true or public.current_profile_is_owner() or public.current_profile_has_permission('manage_announcements'));
drop policy if exists "announcement managers" on public.announcements;
create policy "announcement managers" on public.announcements for all to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_announcements'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_announcements'));

-- ----------------------------- SETTINGS -------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.site_settings enable row level security;
drop policy if exists "settings owners read" on public.site_settings;
create policy "settings owners read" on public.site_settings for select to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_settings'));
drop policy if exists "settings owners write" on public.site_settings;
create policy "settings owners write" on public.site_settings for all to authenticated
using (public.current_profile_is_owner() or public.current_profile_has_permission('manage_settings'))
with check (public.current_profile_is_owner() or public.current_profile_has_permission('manage_settings'));

-- --------------------------- AUDIT TRIGGERS ---------------------------
create or replace function public.audit_content_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.write_audit('حذف محتوى','المحتوى',old.id::text,old.title,'تم حذف بند منشور',jsonb_build_object('slug',old.slug));
    return old;
  elsif tg_op = 'INSERT' then
    perform public.write_audit('نشر محتوى','المحتوى',new.id::text,new.title,'تم نشر بند جديد',jsonb_build_object('slug',new.slug));
    return new;
  else
    perform public.write_audit('تحديث محتوى','المحتوى',new.id::text,new.title,'تم تعديل بند منشور',jsonb_build_object('slug',new.slug));
    return new;
  end if;
end; $$;

drop trigger if exists audit_content on public.content_items;
create trigger audit_content after insert or update or delete on public.content_items
for each row execute procedure public.audit_content_change();

create or replace function public.audit_profile_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status or old.permissions is distinct from new.permissions or old.title is distinct from new.title then
    perform public.write_audit('تحديث حساب','الحسابات',new.id::text,new.name,'تم تغيير حالة أو مسمى أو صلاحيات الحساب',jsonb_build_object('old_status',old.status,'new_status',new.status));
  end if;
  return new;
end; $$;

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after update on public.profiles
for each row execute procedure public.audit_profile_change();

-- --------------------------- STARTER CONTENT --------------------------
insert into public.content_items (slug, category, title, body, badge, sort_order)
select * from (values
  ('laws','الانضباط','الالتزام بالتوجيهات','يجب الالتزام بتوجيهات القيادة والمسؤول المباشر أثناء المباشرة، وأي اعتراض يتم رفعه بالقنوات المخصصة بعيدًا عن تعطيل العمل الميداني.','أساسي',10),
  ('laws','الانضباط','القنوات الرسمية','يمنع الاستهبال أو الطقطقة أو الرسائل غير المتعلقة بالعمل داخل قنوات القطاع الرسمية والإدارية.','تنظيمي',20),
  ('laws','الميدان','الاستجابة للحالات','عند استلام حالة يتم تأكيد الاستلام وتحديد الوحدة المستجيبة وعدم مزاحمة الحالة إلا عند طلب الدعم.','ميداني',30),
  ('laws','الإدارة','عدم طلب الترقية','طلب الترقية أو الضغط للحصول عليها لا يعد سببًا للاستحقاق؛ التقييم يعتمد على الانضباط والنشاط والكفاءة والسجل الإداري.','إداري',40),
  ('protocols','البلاغات','استلام البلاغ','تأكيد الاستلام أولًا، تحديد موقع الحالة ونوعها، ثم توضيح الوحدة التي ستتولى المهمة.','01',10),
  ('protocols','البلاغات','طلب الدعم','يطلب الدعم عند الحاجة فقط مع توضيح السبب وعدد الوحدات المطلوبة.','02',20),
  ('protocols','القضايا','تسليم القضية','عند نقل المسؤولية يتم تقديم ملخص واضح للحالة وما تم تنفيذه وما تبقى.','03',30),
  ('promotions','الاستحقاق','الانضباط','يشترط وجود سجل انضباط جيد وعدم وجود محاسبة قائمة وقت دراسة الترقية.','شرط',10),
  ('promotions','الاستحقاق','النشاط','يؤخذ بالحسبان الحضور الفعلي والمشاركة والتقارير وجودة التفاعل المرتبط بعمل القطاع.','شرط',20),
  ('promotions','الإجراء','الترشيح','يتم الترشيح من الجهة المخولة ومراجعة السجل قبل الاعتماد النهائي من القيادة.','إجراء',30),
  ('leaves','عام','رفع الطلب','يرفع طلب الإجازة من القناة أو النموذج المعتمد مع تحديد النوع والمدة والبداية بوضوح.','01',10),
  ('leaves','عام','الاعتماد قبل الانقطاع','رفع الطلب لا يعني اعتماده، ولا تبدأ الإجازة إلا بعد اعتماد المسؤول المخول.','02',20),
  ('leaves','داخلية','الإجازة الداخلية','تستخدم للغياب القصير وتحدد بالساعات مع الالتزام بوقت العودة المعتمد.','داخلية',30),
  ('leaves','خارجية','الإجازة الخارجية','تحدد بتاريخ بداية ونهاية واضحين ويعود العسكري للمباشرة بعد انتهائها ما لم يصدر تمديد معتمد.','خارجية',40)
) as seed(slug, category, title, body, badge, sort_order)
where not exists (select 1 from public.content_items limit 1);

-- -------------------- ADMIN AFFAIRS APPLICATIONS ---------------------
create table if not exists public.admin_affairs_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  game_name text not null,
  discord_name text not null,
  job_code text not null,
  copy_id text not null,
  military_rank text not null,
  motivation text not null,
  experience text not null,
  availability text not null,
  status text not null default 'new' check (status in ('new','reviewing','accepted','rejected')),
  reviewer_note text,
  assigned_title text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.admin_affairs_applications enable row level security;

drop policy if exists "public submits admin affairs applications" on public.admin_affairs_applications;
create policy "public submits admin affairs applications" on public.admin_affairs_applications
for insert to anon, authenticated
with check (
  length(trim(full_name)) between 2 and 120
  and length(trim(job_code)) between 1 and 60
  and length(trim(copy_id)) between 1 and 60
  and status = 'new'
  and reviewer_note is null
  and assigned_title is null
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists "admin affairs managers read applications" on public.admin_affairs_applications;
create policy "admin affairs managers read applications" on public.admin_affairs_applications
for select to authenticated
using (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_admin_affairs_applications')
);

drop policy if exists "admin affairs managers update applications" on public.admin_affairs_applications;
create policy "admin affairs managers update applications" on public.admin_affairs_applications
for update to authenticated
using (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_admin_affairs_applications')
)
with check (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_admin_affairs_applications')
);

create or replace function public.audit_admin_affairs_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status or old.reviewer_note is distinct from new.reviewer_note or old.assigned_title is distinct from new.assigned_title then
    perform public.write_audit(
      'مراجعة طلب شؤون إدارية',
      'طلبات الشؤون الإدارية',
      new.id::text,
      new.full_name,
      'تم تحديث حالة أو ملاحظة أو مسمى طلب الانضمام للشؤون الإدارية',
      jsonb_build_object('old_status',old.status,'new_status',new.status,'assigned_title',new.assigned_title)
    );
  end if;
  return new;
end; $$;

drop trigger if exists audit_admin_affairs_applications on public.admin_affairs_applications;
create trigger audit_admin_affairs_applications after update on public.admin_affairs_applications
for each row execute procedure public.audit_admin_affairs_application();

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
