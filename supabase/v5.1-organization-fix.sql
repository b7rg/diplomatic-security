-- =====================================================================
-- V5.1 ORGANIZATION FIX
-- Correct model: leadership + exactly four official departments.
-- Former default units are courses/tracks, not organization departments.
-- Run once AFTER v5-upgrade.sql when upgrading an existing V5 database.
-- =====================================================================

-- Remove stale department assignments that point to old default units.
update public.profiles
set department_key = null
where department_key is not null
  and department_key not in ('command','admin-affairs','training','military-police','recruitment');

-- Remove the units that were incorrectly modeled as departments/units.
-- organization_titles for them are removed automatically by ON DELETE CASCADE.
delete from public.organization_units
where key not in ('command','admin-affairs','training','military-police','recruitment');

-- Normalize the five official structure records: one leadership record + four departments.
update public.organization_units
set name='قيادة قوات الأمن الدبلوماسي', kind='command', sort_order=10, application_enabled=false, active=true
where key='command';

update public.organization_units
set name='الشؤون الإدارية', kind='department', sort_order=20, application_enabled=true, active=true
where key='admin-affairs';

update public.organization_units
set name='كلية التدريب الأمنية', kind='department', sort_order=30, application_enabled=true, active=true
where key='training';

update public.organization_units
set name='الشرطة العسكرية', kind='department', sort_order=40, application_enabled=true, active=true
where key='military-police';

update public.organization_units
set name='شؤون القبول والتجنيد', kind='department', sort_order=50, application_enabled=true, active=true
where key='recruitment';

-- Rename the recruitment leadership titles cleanly.
delete from public.organization_titles
where unit_key='recruitment'
  and name in ('رئيس شؤون التجنيد','نائب رئيس شؤون التجنيد','مساعد رئيس شؤون التجنيد');

insert into public.organization_titles(unit_key,name,permission_keys,sort_order,active,application_assignable)
values
('recruitment','رئيس شؤون القبول والتجنيد',array['manage_applications','manage_accounts']::text[],10,true,true),
('recruitment','نائب رئيس شؤون القبول والتجنيد',array['manage_applications','manage_accounts']::text[],20,true,true),
('recruitment','مساعد رئيس شؤون القبول والتجنيد',array['manage_applications']::text[],30,true,true)
on conflict (unit_key,name) do update set
  permission_keys=excluded.permission_keys,
  sort_order=excluded.sort_order,
  active=excluded.active,
  application_assignable=excluded.application_assignable,
  updated_at=now();
