import type { MemberType, Permission } from "@/lib/site";

export type Profile = {
  id: string;
  name: string;
  job_code: string | null;
  copy_id: string | null;
  status: "pending" | "approved" | "rejected";
  title: string;
  permissions: Permission[];
  is_owner: boolean;
  member_type: MemberType;
  military_rank: string | null;
  department_key: string | null;
  server_roles: string[];
  personnel_state?: "active" | "resigned" | "dismissed";
  created_at?: string;
};

export const DEMO_OWNER: Profile = {
  id: "demo-owner",
  name: "رئيس النظام — وضع المعاينة",
  job_code: "F-700",
  copy_id: "PREVIEW",
  status: "approved",
  title: "المالك التنفيذي للبوابة",
  permissions: [
    "manage_content", "publish_content", "manage_schedule", "manage_announcements", "manage_accounts",
    "manage_roles", "manage_organization", "manage_applications", "manage_application_questions", "manage_personnel_tracking",
    "manage_admin_affairs_applications", "view_audit", "manage_settings", "edit_laws", "edit_protocols",
    "edit_promotions", "edit_leaves", "edit_structure", "manage_military_police", "manage_map",
  ],
  is_owner: true,
  member_type: "management",
  military_rank: "عقيد ركن",
  department_key: "command",
  server_roles: ["مجلس قيادة قوات الأمن الدبلوماسي"],
};

export function can(profile: Profile | null, permission: Permission) {
  if (!profile) return false;
  return profile.is_owner || profile.permissions?.includes(permission);
}
