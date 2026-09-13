export const SITE = {
  name: "قطاع الأمن الدبلوماسي",
  short: "DSC",
  logo: "/sector-logo.png",
  version: "5.7",
};

export type Permission =
  | "manage_content"
  | "publish_content"
  | "manage_schedule"
  | "manage_announcements"
  | "manage_accounts"
  | "manage_roles"
  | "manage_organization"
  | "manage_applications"
  | "manage_application_questions"
  | "manage_personnel_tracking"
  | "manage_admin_affairs_applications"
  | "view_audit"
  | "manage_settings"
  | "manage_military_police"
  | "manage_map"
  | "edit_laws"
  | "edit_protocols"
  | "edit_promotions"
  | "edit_leaves"
  | "edit_structure";

export const PERMISSIONS: { key: Permission; label: string; group: string; description: string }[] = [
  { key: "manage_accounts", label: "اعتماد وإدارة الحسابات", group: "الحسابات", description: "قبول ورفض الحسابات وتحديد فئة الشخص وبياناته." },
  { key: "manage_roles", label: "إدارة صلاحيات الحسابات", group: "الحسابات", description: "تعديل الصلاحيات الإضافية للحسابات عند الحاجة." },
  { key: "manage_organization", label: "إدارة القيادة والأقسام والمسميات", group: "الهيكل", description: "تعديل القيادة والأقسام الأربعة وألوانها ومسمياتها وربط كل مسمى بصلاحياته." },
  { key: "manage_applications", label: "مراجعة طلبات الأقسام", group: "القبول", description: "قراءة وفرز وقبول ورفض طلبات الانضمام للأقسام." },
  { key: "manage_application_questions", label: "إدارة أسئلة كلية الضباط", group: "القبول", description: "إضافة وتعديل وترتيب أسئلة كلية الضباط الأمنية." },
  { key: "manage_personnel_tracking", label: "الرصد وتسهيلات الترقية", group: "الشؤون الإدارية", description: "تسجيل التقارير والساعات والدورات واعتماد خصم التقارير أو نصف الشروط الرقمية مع حفظ اسم ومسمى الموظف." },
  { key: "manage_admin_affairs_applications", label: "مراجعة طلبات الشؤون — قديم", group: "الشؤون الإدارية", description: "صلاحية توافقية للطلبات القديمة فقط." },
  { key: "manage_content", label: "إدارة جميع المحتوى", group: "المحتوى", description: "إنشاء مسودات لجميع مراجع البوابة." },
  { key: "publish_content", label: "اعتماد ونشر التعديلات", group: "المحتوى", description: "اعتماد المسودات ونشرها للعامة." },
  { key: "edit_laws", label: "تعديل القوانين", group: "المحتوى", description: "إنشاء مسودات القوانين فقط." },
  { key: "edit_protocols", label: "تعديل البروتوكولات", group: "المحتوى", description: "إنشاء مسودات البروتوكولات فقط." },
  { key: "edit_promotions", label: "تعديل شروط الترقيات", group: "المحتوى", description: "إنشاء مسودات شروط الترقيات." },
  { key: "edit_leaves", label: "تعديل شروط الإجازات", group: "المحتوى", description: "إنشاء مسودات شروط الإجازات." },
  { key: "edit_structure", label: "تعديل مرجع الهيكل", group: "الهيكل", description: "صلاحية توافقية لتحرير الهيكل، وتشملها إدارة الأقسام." },
  { key: "manage_schedule", label: "إدارة الأفراد والجدول", group: "التشغيل", description: "إضافة وتعديل أفراد القطاع والأكواد والرتب وأرشيف الاستقالات والفصل." },
  { key: "manage_announcements", label: "إدارة التنبيهات والإعلانات", group: "التشغيل", description: "إصدار وتعديل التنبيهات الرسمية." },
  { key: "view_audit", label: "مشاهدة سجل التغييرات", group: "الرقابة", description: "الاطلاع على العمليات والتعديلات المهمة داخل النظام." },
  { key: "manage_settings", label: "إدارة إعدادات البوابة", group: "النظام", description: "تعديل إعدادات النظام العامة والحساسة." },
  { key: "manage_military_police", label: "سجل الشرطة العسكرية", group: "الشرطة العسكرية", description: "تسجيل مخالفات عساكر القطاع وقيمتها وإجرائها وحالة التنفيذ." },
  { key: "manage_map", label: "إدارة الخريطة", group: "التشغيل", description: "رسم مناطق الخريطة وتعديل ألوانها ومسمياتها ومعلوماتها." },
];

export const MEMBER_TYPES = [
  { key: "management", label: "الإدارة والمسؤولون", short: "إداري", description: "الإدارة والمسؤولون وأصحاب الصلاحيات التنظيمية، بشكل مستقل عن قيادات القطاع العسكرية." },
  { key: "approved_player", label: "اللاعبون المعتمدون", short: "معتمد", description: "لاعبون معتمدون ضمن النظام دون احتسابهم كعساكر أساسيين." },
  { key: "sector_member", label: "عساكر القطاع الأساسيون", short: "عسكري", description: "القوة الأساسية للقطاع ومسار الرتب والترقيات." },
] as const;
export type MemberType = typeof MEMBER_TYPES[number]["key"];

export const MILITARY_RANKS = [
  "فريق أول ركن", "فريق ركن", "لواء ركن", "عميد ركن", "عقيد ركن", "مقدم ركن",
  "رائد", "نقيب", "ملازم أول", "ملازم", "ضابط", "رئيس رقباء", "رقيب أول", "رقيب",
  "وكيل رقيب", "عريف", "جندي أول", "جندي",
] as const;

export const SERVER_ROLES = [
  "قائد الأمن الدبلوماسي", "نائب قائد الأمن الدبلوماسي", "مساعد قائد الأمن الدبلوماسي", "نائب مساعد قائد الأمن الدبلوماسي",
  "مجلس قيادة قوات الأمن الدبلوماسي", "كبار الضباط", "ضابط منطقة", "مسؤول الضباط", "مسؤول الأفراد",
  "رئاسة الأقسام العسكرية", "رئاسة الشرطة العسكرية", "رئاسة الشؤون الإدارية", "رئاسة القبول والتجنيد",
  "رئاسة كلية التدريب", "مجلس القضاء العسكري", "الشرطة العسكرية", "الشؤون الإدارية", "شؤون القبول والتجنيد",
  "كلية التدريب الأمنية", "المساندة والمهام", "البحث والتحري", "الدعم الجوي", "قوات الأمن الدبلوماسي",
] as const;

export type DepartmentAccent = "bronze" | "wine" | "steel" | "green" | "violet" | "amber" | "blue" | "teal" | "red" | "sand";
export type DepartmentKind = "command" | "council" | "department" | "unit";
export type DepartmentIconKey = "crown" | "briefcase" | "graduation" | "user-plus" | "shield-alert" | "scale" | "boxes" | "search" | "plane" | "users";

export type Department = {
  key: string;
  name: string;
  kind: DepartmentKind;
  description: string;
  roles: string[];
  accent: DepartmentAccent;
  icon: DepartmentIconKey;
  applicationEnabled?: boolean;
};

export const DEPARTMENTS: Department[] = [
  { key: "command", name: "قيادة قوات الأمن الدبلوماسي", kind: "command", description: "القيادة العليا للقطاع ومركز القرار والتوجيه واعتماد التغييرات الجوهرية.", roles: ["قائد الأمن الدبلوماسي", "نائب قائد الأمن الدبلوماسي", "مساعد قائد الأمن الدبلوماسي", "نائب مساعد قائد الأمن الدبلوماسي", "مجلس قيادة قوات الأمن الدبلوماسي"], accent: "bronze", icon: "crown", applicationEnabled: false },
  { key: "admin-affairs", name: "الشؤون الإدارية", kind: "department", description: "الحضور والإجازات والتقارير والمتابعة والجدول والقرارات الإدارية.", roles: ["رئيس الشؤون الإدارية", "نائب رئيس الشؤون الإدارية", "مساعد رئيس الشؤون الإدارية", "مسؤول الحضور", "مدقق الحضور", "مسؤول الإجازات", "مسؤول التقارير", "مسؤول المتابعة", "مسؤول الجدول", "طاقم الشؤون الإدارية"], accent: "steel", icon: "briefcase", applicationEnabled: true },
  { key: "training", name: "كلية التدريب الأمنية", kind: "department", description: "التدريب والتأهيل والاختبارات والبرامج المعتمدة للقطاع.", roles: ["رئيس كلية التدريب", "نائب رئيس كلية التدريب", "مساعد رئيس كلية التدريب"], accent: "amber", icon: "graduation", applicationEnabled: true },
  { key: "military-police", name: "الشرطة العسكرية", kind: "department", description: "الانضباط العسكري والمحاسبات وتنفيذ الإجراءات النظامية داخل القطاع. الانضمام بالترشيح فقط ولا يوجد تقديم مباشر.", roles: ["رئيس الشرطة العسكرية", "نائب رئيس الشرطة العسكرية", "مساعد رئيس الشرطة العسكرية"], accent: "red", icon: "shield-alert", applicationEnabled: false },
  { key: "recruitment", name: "شؤون القبول والتجنيد", kind: "department", description: "استقبال المتقدمين وفرزهم ومتابعة إجراءات القبول والتعيين.", roles: ["رئيس شؤون القبول والتجنيد", "نائب رئيس شؤون القبول والتجنيد", "مساعد رئيس شؤون القبول والتجنيد"], accent: "green", icon: "user-plus", applicationEnabled: true },
];

export const OFFICIAL_ORG_KEYS = ["command", "admin-affairs", "training", "military-police", "recruitment"] as const;




export const APPLICATION_TARGETS = [
  ...DEPARTMENTS.filter(d => d.applicationEnabled).map(d => ({ key: d.key, name: d.name, description: d.description, roles: d.roles, accent: d.accent, special: false })),
  { key: "officer-college", name: "كلية الضباط الأمنية", description: "مسار مستقل للمتقدمين لكلية الضباط مع اختبار وأسئلة قبول قابلة للتعديل.", roles: ["طالب كلية الضباط الأمنية"], accent: "bronze" as DepartmentAccent, special: true },
] as const;
export type ApplicationTargetKey = typeof APPLICATION_TARGETS[number]["key"];

export const ADMIN_AFFAIRS_TITLES = [
  "رئيس الشؤون الإدارية", "نائب رئيس الشؤون الإدارية", "مساعد رئيس الشؤون الإدارية",
  "مسؤول الحضور", "مدقق الحضور", "طاقم الحضور", "مسؤول الإجازات", "طاقم الإجازات",
  "مسؤول التقارير", "مدقق التقارير", "طاقم التقارير", "مسؤول المتابعة", "مدقق عام",
  "مسؤول الجدول", "طاقم الشؤون الإدارية",
] as const;

export const PUBLIC_LINKS = [
  { title: "الرئيسية", href: "/" },
  { title: "القوانين", href: "/laws" },
  { title: "البروتوكولات", href: "/protocols" },
  { title: "الترقيات", href: "/promotions" },
  { title: "الهيكل", href: "/structure" },
  { title: "الخريطة", href: "/map" },
  { title: "التقديم", href: "/apply" },
  { title: "بطاقتي", href: "/my-card" },
  { title: "الإجازات", href: "/leaves" },
  { title: "الإعلانات", href: "/announcements" },
];

export const COMMAND_LINKS = [
  { title: "القوانين والتعليمات", description: "ابحث داخل المرجع النظامي", href: "/laws", keywords: "قانون مخالفة تعليمات" },
  { title: "البروتوكولات", description: "خطوات الاستجابة والقضايا", href: "/protocols", keywords: "بلاغ قضية دعم بروتوكول استجابة تحقيق" },
  { title: "بطاقتي في القطاع", description: "ابحث بمعرّف الديسكورد أو الكوبي آي دي لعرض البطاقة فقط", href: "/my-card", keywords: "بطاقة عسكري كوبي ايدي ديسكورد ترقية" },
  { title: "شروط الترقيات", description: "الاستحقاق حسب الرتبة والتقارير وساعات التواجد", href: "/promotions", keywords: "ترقية رتبة استحقاق" },
  { title: "شروط الإجازات", description: "الداخلية والخارجية والاعتماد", href: "/leaves", keywords: "اجازة غياب طلب" },
  { title: "الهيكل التنظيمي", description: "القيادة والأقسام الأربعة والرتب", href: "/structure", keywords: "قيادة هيكل مسؤول رتب قائد أقسام" },
  { title: "الخريطة الميدانية", description: "المناطق المرسومة والمسميات", href: "/map", keywords: "خريطة منطقة رسم" },
  { title: "مركز التقديم", description: "التقديم على الأقسام المفتوحة وكلية الضباط", href: "/apply", keywords: "تقديم قسم كلية ضباط شؤون تدريب تجنيد" },
  { title: "الإعلانات الرسمية", description: "آخر التنبيهات والتحديثات", href: "/announcements", keywords: "اعلان تنبيه تحديث" },
];
