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


-- =====================================================================
-- V5 UPGRADE — editable organization, title-based permission presets,
-- clearer handoff/operation model, and department visual identity.
-- Run after V4 if the database already exists.
-- =====================================================================

-- ------------------------- ORGANIZATION UNITS -------------------------
create table if not exists public.organization_units (
  key text primary key,
  name text not null,
  kind text not null default 'department' check (kind in ('command','council','department','unit')),
  description text not null default '',
  accent text not null default 'steel' check (accent in ('bronze','wine','steel','green','violet','amber','blue','teal','red','sand')),
  icon_key text not null default 'briefcase',
  sort_order integer not null default 100,
  active boolean not null default true,
  application_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.organization_titles (
  id uuid primary key default gen_random_uuid(),
  unit_key text not null references public.organization_units(key) on delete cascade,
  name text not null,
  permission_keys text[] not null default '{}',
  sort_order integer not null default 100,
  active boolean not null default true,
  application_assignable boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(unit_key, name)
);

alter table public.organization_units enable row level security;
alter table public.organization_titles enable row level security;

drop policy if exists "public reads organization units" on public.organization_units;
create policy "public reads organization units" on public.organization_units for select to anon, authenticated
using (
  active = true
  or public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_organization')
  or public.current_profile_has_permission('edit_structure')
);

drop policy if exists "organization managers edit units" on public.organization_units;
create policy "organization managers edit units" on public.organization_units for all to authenticated
using (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_organization')
  or public.current_profile_has_permission('edit_structure')
)
with check (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_organization')
  or public.current_profile_has_permission('edit_structure')
);

drop policy if exists "public reads organization titles" on public.organization_titles;
create policy "public reads organization titles" on public.organization_titles for select to anon, authenticated
using (
  active = true
  or public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_organization')
  or public.current_profile_has_permission('edit_structure')
  or public.current_profile_has_permission('manage_accounts')
  or public.current_profile_has_permission('manage_roles')
);

drop policy if exists "organization managers edit titles" on public.organization_titles;
create policy "organization managers edit titles" on public.organization_titles for all to authenticated
using (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_organization')
  or public.current_profile_has_permission('edit_structure')
)
with check (
  public.current_profile_is_owner()
  or public.current_profile_has_permission('manage_organization')
  or public.current_profile_has_permission('edit_structure')
);

-- ------------------------------ SEEDS --------------------------------
insert into public.organization_units(key,name,kind,description,accent,icon_key,sort_order,active,application_enabled)
values
('command','قيادة قوات الأمن الدبلوماسي','command','مركز القرار والتوجيه العام للقطاع واعتماد التغييرات الجوهرية.','bronze','crown',10,true,false),
('admin-affairs','الشؤون الإدارية','department','الحضور والإجازات والتقارير والمتابعة والجدول والقرارات الإدارية.','steel','briefcase',20,true,true),
('training','كلية التدريب الأمنية','department','إدارة التدريب والتأهيل والاختبارات والبرامج المعتمدة للقطاع.','amber','graduation',30,true,true),
('military-police','الشرطة العسكرية','department','الانضباط العسكري والمحاسبات وتنفيذ الإجراءات النظامية داخل القطاع.','red','shield-alert',40,true,true),
('recruitment','شؤون القبول والتجنيد','department','استقبال المتقدمين وفرزهم ومتابعة إجراءات القبول والتعيين.','green','user-plus',50,true,true)
on conflict (key) do nothing;

insert into public.organization_titles(unit_key,name,permission_keys,sort_order,active,application_assignable)
values
('command','قائد الأمن الدبلوماسي',array['manage_accounts','manage_roles','manage_organization','manage_applications','manage_application_questions','manage_personnel_tracking','manage_content','publish_content','manage_schedule','manage_announcements','view_audit','manage_settings','edit_laws','edit_protocols','edit_promotions','edit_leaves','edit_structure']::text[],10,true,false),
('command','نائب قائد الأمن الدبلوماسي',array['manage_accounts','manage_roles','manage_organization','manage_applications','manage_personnel_tracking','manage_content','publish_content','manage_schedule','manage_announcements','view_audit','edit_structure']::text[],20,true,false),
('command','مساعد قائد الأمن الدبلوماسي',array['manage_accounts','manage_applications','manage_personnel_tracking','publish_content','manage_schedule','manage_announcements','view_audit']::text[],30,true,false),
('command','نائب مساعد قائد الأمن الدبلوماسي',array['manage_applications','manage_personnel_tracking','manage_schedule','view_audit']::text[],40,true,false),
('command','مجلس قيادة قوات الأمن الدبلوماسي',array['view_audit']::text[],50,true,false),

('admin-affairs','رئيس الشؤون الإدارية',array['manage_personnel_tracking','manage_schedule','edit_promotions','edit_leaves','manage_applications','view_audit']::text[],10,true,true),
('admin-affairs','نائب رئيس الشؤون الإدارية',array['manage_personnel_tracking','manage_schedule','edit_promotions','edit_leaves','manage_applications']::text[],20,true,true),
('admin-affairs','مساعد رئيس الشؤون الإدارية',array['manage_personnel_tracking','manage_schedule','edit_leaves']::text[],30,true,true),
('admin-affairs','مسؤول الحضور',array['manage_personnel_tracking']::text[],40,true,true),
('admin-affairs','مدقق الحضور',array['manage_personnel_tracking']::text[],50,true,true),
('admin-affairs','مسؤول الإجازات',array['edit_leaves']::text[],60,true,true),
('admin-affairs','مسؤول التقارير',array['manage_personnel_tracking']::text[],70,true,true),
('admin-affairs','مسؤول المتابعة',array['manage_personnel_tracking','view_audit']::text[],80,true,true),
('admin-affairs','مسؤول الجدول',array['manage_schedule']::text[],90,true,true),
('admin-affairs','طاقم الشؤون الإدارية',array['manage_personnel_tracking']::text[],100,true,true),

('training','رئيس كلية التدريب',array['manage_application_questions','manage_applications','manage_announcements']::text[],10,true,true),
('training','نائب رئيس كلية التدريب',array['manage_application_questions','manage_applications']::text[],20,true,true),
('training','مساعد رئيس كلية التدريب',array['manage_applications']::text[],30,true,true),

('military-police','رئيس الشرطة العسكرية',array['view_audit','manage_announcements']::text[],10,true,true),
('military-police','نائب رئيس الشرطة العسكرية',array['view_audit']::text[],20,true,true),
('military-police','مساعد رئيس الشرطة العسكرية',array['view_audit']::text[],30,true,true),

('recruitment','رئيس شؤون القبول والتجنيد',array['manage_applications','manage_accounts']::text[],10,true,true),
('recruitment','نائب رئيس شؤون القبول والتجنيد',array['manage_applications','manage_accounts']::text[],20,true,true),
('recruitment','مساعد رئيس شؤون القبول والتجنيد',array['manage_applications']::text[],30,true,true)
on conflict (unit_key,name) do nothing;

-- ------------------------------ AUDIT --------------------------------
-- separate triggers are used because the two tables expose different identifiers.
create or replace function public.audit_organization_unit_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_audit(
    case when tg_op='INSERT' then 'إضافة قسم' when tg_op='DELETE' then 'حذف قسم' else 'تعديل قسم' end,
    'الهيكل',
    case when tg_op='DELETE' then old.key else new.key end,
    case when tg_op='DELETE' then old.name else new.name end,
    'تغيير في الأقسام والتنظيم',
    '{}'::jsonb
  );
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;

drop trigger if exists audit_organization_units on public.organization_units;
create trigger audit_organization_units after insert or update or delete on public.organization_units
for each row execute procedure public.audit_organization_unit_change();

create or replace function public.audit_organization_title_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_audit(
    case when tg_op='INSERT' then 'إضافة مسمى' when tg_op='DELETE' then 'حذف مسمى' else 'تعديل مسمى وصلاحيات' end,
    'المسميات',
    case when tg_op='DELETE' then old.id::text else new.id::text end,
    case when tg_op='DELETE' then old.name else new.name end,
    'تغيير في مسمى تنظيمي أو صلاحياته',
    jsonb_build_object('unit_key', case when tg_op='DELETE' then old.unit_key else new.unit_key end)
  );
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;

drop trigger if exists audit_organization_titles on public.organization_titles;
create trigger audit_organization_titles after insert or update or delete on public.organization_titles
for each row execute procedure public.audit_organization_title_change();
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
