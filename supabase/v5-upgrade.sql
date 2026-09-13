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
