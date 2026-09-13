import type { MemberType } from "@/lib/site";

export type PersonnelState = "active" | "resigned" | "dismissed";

export type PublicRosterEntry = {
  id: string;
  name: string;
  job_code: string | null;
  copy_id: string | null;
  title: string | null;
  member_type: MemberType;
  military_rank: string | null;
  department_key: string | null;
  personnel_state?: PersonnelState | null;
  profile_id?: string | null;
  discord_id?: string | null;
  hired_at?: string | null;
  appointment_rank?: string | null;
  created_at?: string | null;
};

export type DepartureType = "resignation" | "dismissal";

export type DepartureRecord = {
  id?: string;
  profile_id?: string | null;
  roster_id?: string | null;
  person_name: string;
  copy_id: string;
  job_code?: string | null;
  military_rank?: string | null;
  departure_type: DepartureType;
  reason: string;
  effective_date: string;
  ban_required?: boolean | null;
  ban_until?: string | null;
  ban_reason?: string | null;
  created_at?: string;
};

export type RankRule = {
  rank: string;
  min: number;
  max: number;
  color: string;
  soft: string;
  border: string;
  order: number;
};

// أكواد الأمن الدبلوماسي. الأرقام الأقل = رتبة أعلى.
// ملاحظة: «F-0175» التي وردت بين F-020 و F-016 اعتُبرت F-017 حتى يبقى التسلسل متصلًا.
export const RANK_RULES: RankRule[] = [
  { rank: "فريق أول ركن", min: 11, max: 13, color: "#ffe0a3", soft: "rgba(255,224,163,.13)", border: "rgba(255,224,163,.36)", order: 1 },
  { rank: "فريق ركن", min: 14, max: 16, color: "#f3c578", soft: "rgba(243,197,120,.12)", border: "rgba(243,197,120,.34)", order: 2 },
  { rank: "لواء ركن", min: 17, max: 20, color: "#e7b268", soft: "rgba(231,178,104,.115)", border: "rgba(231,178,104,.32)", order: 3 },
  { rank: "عميد ركن", min: 21, max: 25, color: "#d79a59", soft: "rgba(215,154,89,.11)", border: "rgba(215,154,89,.30)", order: 4 },
  { rank: "عقيد ركن", min: 26, max: 28, color: "#c88952", soft: "rgba(200,137,82,.105)", border: "rgba(200,137,82,.29)", order: 5 },
  { rank: "مقدم ركن", min: 29, max: 34, color: "#ba7948", soft: "rgba(186,121,72,.10)", border: "rgba(186,121,72,.28)", order: 6 },
  { rank: "رائد", min: 35, max: 39, color: "#ad6e42", soft: "rgba(173,110,66,.10)", border: "rgba(173,110,66,.27)", order: 7 },
  { rank: "نقيب", min: 40, max: 59, color: "#a5643d", soft: "rgba(165,100,61,.095)", border: "rgba(165,100,61,.26)", order: 8 },
  { rank: "ملازم أول", min: 60, max: 79, color: "#9b5c3a", soft: "rgba(155,92,58,.09)", border: "rgba(155,92,58,.25)", order: 9 },
  { rank: "ملازم", min: 80, max: 99, color: "#925638", soft: "rgba(146,86,56,.09)", border: "rgba(146,86,56,.24)", order: 10 },
  { rank: "رئيس رقباء", min: 100, max: 199, color: "#b88455", soft: "rgba(184,132,85,.095)", border: "rgba(184,132,85,.26)", order: 11 },
  { rank: "رقيب أول", min: 200, max: 299, color: "#a9784e", soft: "rgba(169,120,78,.09)", border: "rgba(169,120,78,.25)", order: 12 },
  { rank: "رقيب", min: 300, max: 399, color: "#9d6f49", soft: "rgba(157,111,73,.09)", border: "rgba(157,111,73,.24)", order: 13 },
  { rank: "وكيل رقيب", min: 400, max: 499, color: "#916744", soft: "rgba(145,103,68,.085)", border: "rgba(145,103,68,.23)", order: 14 },
  { rank: "عريف", min: 500, max: 599, color: "#865f40", soft: "rgba(134,95,64,.085)", border: "rgba(134,95,64,.22)", order: 15 },
  { rank: "جندي أول", min: 600, max: 699, color: "#7b583d", soft: "rgba(123,88,61,.08)", border: "rgba(123,88,61,.21)", order: 16 },
  { rank: "جندي", min: 700, max: 9999, color: "#70513a", soft: "rgba(112,81,58,.08)", border: "rgba(112,81,58,.20)", order: 17 },
];

const OFFICER_RANKS = new Set([
  "ملازم", "ملازم أول", "نقيب", "رائد", "مقدم ركن", "عقيد ركن", "عميد ركن", "لواء ركن", "فريق ركن", "فريق أول ركن",
]);


export const NON_MILITARY_CODE_FAMILIES = [
  { code: "C", label: "لاعب معتمد", group: "approved_player" as const },
  { code: "CA", label: "قيادة معتمدة", group: "approved_player" as const },
  { code: "AM", label: "مسؤول معتمد", group: "management" as const },
  { code: "S", label: "دعم ومساعدة", group: "management" as const },
  { code: "M", label: "مشرف متدرب / مشرف / مشرف+", group: "management" as const },
  { code: "F", label: "مشرف عام (إداري)", group: "management" as const },
  { code: "A", label: "أدمن", group: "management" as const },
  { code: "A+", label: "الإدارة العليا", group: "management" as const },
] as const;

export const ROSTER_GROUPS: { key: MemberType; label: string; short: string; description: string }[] = [
  { key: "sector_member", label: "عساكر وقيادات القطاع", short: "القطاع الأساسي", description: "القوة الأساسية والقيادات العسكرية التابعة للأمن الدبلوماسي." },
  { key: "approved_player", label: "القيادات واللاعبون المعتمدون", short: "المعتمد", description: "اللاعبون والقيادات المعتمدة ضمن نظام السيرفر." },
  { key: "management", label: "الإدارة والمسؤولون", short: "الإدارة", description: "الإدارة والمسؤولون وأصحاب الصلاحيات التنظيمية." },
];


export function formatFCode(value: number) {
  return `F-${String(value).padStart(3, "0")}`;
}

/**
 * الأكواد المقترحة عند الإضافة من مركز القيادة.
 * رتبة الجندي مفتوحة نظريًا من F-700 وفوق؛ في قائمة الاختيار نعرض F-700..F-999
 * حتى تبقى القائمة عملية، مع بقاء الاشتقاق داعمًا لأي رقم أعلى عند التعديل اليدوي/البيانات القديمة.
 */
export function getCodesForRank(rank: string) {
  const rule = RANK_RULES.find((item) => item.rank === rank);
  if (!rule) return [] as string[];
  const max = rule.rank === "جندي" ? 999 : rule.max;
  const result: string[] = [];
  for (let value = rule.min; value <= max; value += 1) result.push(formatFCode(value));
  return result;
}

export function getAvailableCodesForRank(
  rank: string,
  rows: Array<Pick<PublicRosterEntry, "id" | "member_type" | "job_code">>,
  editingId?: string | null,
) {
  const used = new Set(
    rows
      .filter((row) => row.member_type === "sector_member" && row.id !== editingId)
      .map((row) => normalizeFCode(row.job_code))
      .filter(Boolean) as string[],
  );
  return getCodesForRank(rank).filter((code) => !used.has(code));
}

export function parseFCode(code?: string | null) {
  if (!code) return null;
  const match = code.trim().toUpperCase().match(/^F\s*-?\s*(\d{1,4})$/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}


export function normalizeFCode(code?: string | null) {
  const value = parseFCode(code);
  if (value == null) return code?.trim().toUpperCase() || null;
  return `F-${String(value).padStart(3, "0")}`;
}

export function deriveMilitaryRank(code?: string | null) {
  const value = parseFCode(code);
  if (value == null) return null;
  return RANK_RULES.find((rule) => value >= rule.min && value <= rule.max)?.rank ?? null;
}

export function getRankRule(rank?: string | null, code?: string | null) {
  const derived = deriveMilitaryRank(code);
  const resolved = derived || rank || "";
  return RANK_RULES.find((rule) => rule.rank === resolved) ?? null;
}

export function getResolvedRank(entry: Pick<PublicRosterEntry, "member_type" | "military_rank" | "job_code">) {
  // أكواد الإدارة العامة قد تستخدم F أيضًا، لذلك الاشتقاق العسكري يطبق على أفراد القطاع فقط.
  if (entry.member_type === "sector_member") return deriveMilitaryRank(entry.job_code) || entry.military_rank || null;
  return entry.military_rank || null;
}

export function definiteRank(rank: string) {
  return rank.startsWith("ال") ? rank : `ال${rank}`;
}

export function getFormalDisplayName(entry: Pick<PublicRosterEntry, "name" | "title" | "member_type" | "military_rank" | "job_code">) {
  const rank = getResolvedRank(entry as PublicRosterEntry);
  if (rank && OFFICER_RANKS.has(rank)) return `سعادة ${definiteRank(rank)} ${entry.name}`;
  if (rank) return `العسكري ${definiteRank(rank)} ${entry.name}`;
  if (entry.member_type === "approved_player") return `المعتمد ${entry.name}`;
  if (entry.member_type === "management" && entry.title) return `${entry.title} — ${entry.name}`;
  return entry.name;
}

export function getCodeTheme(memberType: MemberType, code?: string | null) {
  if (memberType === "sector_member") {
    const rule = getRankRule(null, code);
    if (rule) return { color: rule.color, soft: rule.soft, border: rule.border };
  }
  const prefix = String(code ?? "").trim().toUpperCase().split("-")[0];
  const tones: Record<string, { color: string; soft: string; border: string }> = {
    CA: { color: "#79b8dc", soft: "rgba(121,184,220,.10)", border: "rgba(121,184,220,.26)" },
    C: { color: "#79b994", soft: "rgba(121,185,148,.10)", border: "rgba(121,185,148,.26)" },
    AM: { color: "#d5a674", soft: "rgba(213,166,116,.10)", border: "rgba(213,166,116,.28)" },
    A: { color: "#c97c72", soft: "rgba(201,124,114,.10)", border: "rgba(201,124,114,.26)" },
    "A+": { color: "#d8a06f", soft: "rgba(216,160,111,.10)", border: "rgba(216,160,111,.26)" },
    M: { color: "#a487c5", soft: "rgba(164,135,197,.10)", border: "rgba(164,135,197,.26)" },
    S: { color: "#6faeb8", soft: "rgba(111,174,184,.10)", border: "rgba(111,174,184,.26)" },
    F: { color: "#d5a674", soft: "rgba(213,166,116,.10)", border: "rgba(213,166,116,.28)" },
  };
  return tones[prefix] ?? { color: "#9a948d", soft: "rgba(154,148,141,.08)", border: "rgba(154,148,141,.20)" };
}

export function rankRangeLabel(rule: RankRule) {
  if (rule.rank === "جندي") return "F-700 وفوق";
  if (rule.min === rule.max) return `F-${String(rule.min).padStart(3, "0")}`;
  return `F-${String(rule.min).padStart(3, "0")} — F-${String(rule.max).padStart(3, "0")}`;
}

export function rankOrder(rank?: string | null, code?: string | null) {
  return getRankRule(rank, code)?.order ?? 999;
}

export const DEMO_ROSTER: PublicRosterEntry[] = [
  { id: "r1", name: "مثال قيادي", job_code: "F-016", copy_id: "101", title: "قائد الأمن الدبلوماسي", member_type: "sector_member", military_rank: "فريق ركن", department_key: "command", personnel_state: "active", discord_id: "741060063740821594", hired_at: "2026-07-20", appointment_rank: "فريق ركن" },
  { id: "r2", name: "مثال ضابط", job_code: "F-034", copy_id: "126", title: "ضابط", member_type: "sector_member", military_rank: "مقدم ركن", department_key: null, personnel_state: "active" },
  { id: "r3", name: "مثال عسكري", job_code: "F-312", copy_id: "220", title: "فرد", member_type: "sector_member", military_rank: "رقيب", department_key: null, personnel_state: "active" },
  { id: "r4", name: "مثال معتمد", job_code: "C-044", copy_id: "318", title: "لاعب معتمد", member_type: "approved_player", military_rank: null, department_key: null, personnel_state: "active" },
  { id: "r5", name: "مثال قيادة معتمدة", job_code: "CA-004", copy_id: "402", title: "قيادة معتمدة", member_type: "approved_player", military_rank: null, department_key: null, personnel_state: "active" },
  { id: "r6", name: "مثال إداري", job_code: "A-021", copy_id: "511", title: "أدمن", member_type: "management", military_rank: null, department_key: null, personnel_state: "active" },
];

export const DEMO_DEPARTURES: DepartureRecord[] = [
  { id: "d1", person_name: "مثال مستقيل", copy_id: "740", job_code: "F-522", military_rank: "عريف", departure_type: "resignation", reason: "طلب استقالة", effective_date: "2026-09-01" },
  { id: "d2", person_name: "مثال مفصول", copy_id: "803", job_code: "F-688", military_rank: "جندي أول", departure_type: "dismissal", reason: "قرار إداري تجريبي", effective_date: "2026-09-03" },
];
