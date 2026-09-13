import { DEPARTMENTS, type DepartmentAccent, type DepartmentIconKey, type DepartmentKind, type Permission } from "@/lib/site";

export type OrgUnit = {
  id?: string;
  key: string;
  name: string;
  kind: DepartmentKind;
  description: string;
  accent: DepartmentAccent;
  icon_key: DepartmentIconKey;
  sort_order: number;
  active: boolean;
  application_enabled: boolean;
};

export type OrgTitle = {
  id: string;
  unit_key: string;
  name: string;
  permission_keys: Permission[];
  sort_order: number;
  active: boolean;
  application_assignable: boolean;
};

export const DEFAULT_ORG_UNITS: OrgUnit[] = DEPARTMENTS.map((d, index) => ({
  key: d.key,
  name: d.name,
  kind: d.kind,
  description: d.description,
  accent: d.accent,
  icon_key: d.icon,
  sort_order: (index + 1) * 10,
  active: true,
  application_enabled: Boolean(d.applicationEnabled),
}));

const titlePermissions: Record<string, Permission[]> = {
  "قائد الأمن الدبلوماسي": ["manage_accounts","manage_roles","manage_organization","manage_applications","manage_application_questions","manage_personnel_tracking","manage_content","publish_content","manage_schedule","manage_announcements","view_audit","manage_settings","edit_laws","edit_protocols","edit_promotions","edit_leaves","edit_structure","manage_military_police","manage_map"],
  "نائب قائد الأمن الدبلوماسي": ["manage_accounts","manage_roles","manage_organization","manage_applications","manage_personnel_tracking","manage_content","publish_content","manage_schedule","manage_announcements","view_audit","edit_structure","manage_military_police","manage_map"],
  "مساعد قائد الأمن الدبلوماسي": ["manage_accounts","manage_applications","manage_personnel_tracking","publish_content","manage_schedule","manage_announcements","view_audit"],
  "نائب مساعد قائد الأمن الدبلوماسي": ["manage_applications","manage_personnel_tracking","manage_schedule","view_audit"],
  "مجلس قيادة قوات الأمن الدبلوماسي": ["view_audit"],

  "رئيس الشؤون الإدارية": ["manage_personnel_tracking","manage_schedule","edit_promotions","edit_leaves","manage_applications","view_audit"],
  "نائب رئيس الشؤون الإدارية": ["manage_personnel_tracking","manage_schedule","edit_promotions","edit_leaves","manage_applications"],
  "مساعد رئيس الشؤون الإدارية": ["manage_personnel_tracking","manage_schedule","edit_leaves"],
  "مسؤول الحضور": ["manage_personnel_tracking"],
  "مدقق الحضور": ["manage_personnel_tracking"],
  "مسؤول الإجازات": ["edit_leaves"],
  "مسؤول التقارير": ["manage_personnel_tracking"],
  "مسؤول المتابعة": ["manage_personnel_tracking","view_audit"],
  "مسؤول الجدول": ["manage_schedule"],
  "طاقم الشؤون الإدارية": ["manage_personnel_tracking"],

  "رئيس كلية التدريب": ["manage_application_questions","manage_applications","manage_announcements"],
  "نائب رئيس كلية التدريب": ["manage_application_questions","manage_applications"],
  "مساعد رئيس كلية التدريب": ["manage_applications"],

  "رئيس شؤون القبول والتجنيد": ["manage_applications","manage_accounts"],
  "نائب رئيس شؤون القبول والتجنيد": ["manage_applications","manage_accounts"],
  "مساعد رئيس شؤون القبول والتجنيد": ["manage_applications"],

  "رئيس الشرطة العسكرية": ["view_audit","manage_announcements","manage_military_police"],
  "نائب رئيس الشرطة العسكرية": ["view_audit","manage_military_police"],
  "مساعد رئيس الشرطة العسكرية": ["view_audit","manage_military_police"],

};

let titleCounter = 0;
export const DEFAULT_ORG_TITLES: OrgTitle[] = DEPARTMENTS.flatMap((department) =>
  department.roles.map((name, index) => ({
    id: `preview-title-${++titleCounter}`,
    unit_key: department.key,
    name,
    permission_keys: titlePermissions[name] ?? [],
    sort_order: (index + 1) * 10,
    active: true,
    application_assignable: department.key !== "command",
  }))
);

export function groupTitlesByUnit(titles: OrgTitle[]) {
  const map = new Map<string, OrgTitle[]>();
  titles.forEach((title) => {
    const list = map.get(title.unit_key) ?? [];
    list.push(title);
    map.set(title.unit_key, list);
  });
  map.forEach((list) => list.sort((a,b) => a.sort_order - b.sort_order));
  return map;
}
