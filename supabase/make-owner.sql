-- غيّري البريد إلى بريد حسابك ثم شغّلي الملف مرة واحدة في Supabase SQL Editor.
update public.profiles
set
  status = 'approved',
  is_owner = true,
  member_type = 'management',
  title = 'المالك التنفيذي للبوابة',
  permissions = array[
    'manage_content','publish_content','manage_schedule','manage_announcements',
    'manage_accounts','manage_roles','manage_organization','manage_applications','manage_application_questions',
    'manage_personnel_tracking','manage_admin_affairs_applications','view_audit','manage_settings',
    'edit_laws','edit_protocols','edit_promotions','edit_leaves','edit_structure'
  ]::text[],
  approved_at = now()
where id = (
  select id from auth.users where email = 'gaydaalamry9@gmail.com' limit 1
);
