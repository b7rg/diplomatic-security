export type PromotionRequirement = {
  currentRank: string;
  targetRank: string;
  minimumDays: number;
  minimumHours: number;
  operationsReports?: number;
  areaOfficerReports?: number;
  officerReports?: number;
  dutyOfficerReports?: number;
  requiredCourses: string[];
  specialCondition?: string;
};

export const PROMOTION_REQUIREMENTS: PromotionRequirement[] = [
  { currentRank: "جندي", targetRank: "جندي أول", minimumDays: 5, minimumHours: 24, operationsReports: 7, requiredCourses: ["دورة العمليات"] },
  { currentRank: "جندي أول", targetRank: "عريف", minimumDays: 7, minimumHours: 36, operationsReports: 14, requiredCourses: ["دورة المساندة والمهام"] },
  { currentRank: "عريف", targetRank: "وكيل رقيب", minimumDays: 10, minimumHours: 48, operationsReports: 18, requiredCourses: ["دورة الدعم الجوي"] },
  { currentRank: "وكيل رقيب", targetRank: "رقيب", minimumDays: 14, minimumHours: 60, operationsReports: 23, requiredCourses: ["دورة ضابط منطقة"] },
  { currentRank: "رقيب", targetRank: "رقيب أول", minimumDays: 19, minimumHours: 72, areaOfficerReports: 30, requiredCourses: ["ضابط منطقة 1", "مكافحة السواحل"] },
  { currentRank: "رقيب أول", targetRank: "رئيس رقباء", minimumDays: 24, minimumHours: 90, areaOfficerReports: 55, requiredCourses: ["دورة بحث وتحري"] },
  { currentRank: "رئيس رقباء", targetRank: "ملازم", minimumDays: 30, minimumHours: 110, areaOfficerReports: 60, requiredCourses: ["اجتياز جميع الدورات", "كلية الضباط الأمنية"], specialCondition: "ترشيح قيادة واجتياز كلية الضباط" },
  { currentRank: "ملازم", targetRank: "ملازم أول", minimumDays: 35, minimumHours: 120, officerReports: 55, dutyOfficerReports: 10, requiredCourses: ["جميع الدورات"], specialCondition: "اعتماد قائد الأمن الدبلوماسي + موافقة القيادة" },
  { currentRank: "ملازم أول", targetRank: "نقيب", minimumDays: 40, minimumHours: 140, officerReports: 65, dutyOfficerReports: 15, requiredCourses: ["جميع الدورات"], specialCondition: "اعتماد قائد الأمن الدبلوماسي + موافقة القيادة" },
  { currentRank: "نقيب", targetRank: "رائد", minimumDays: 45, minimumHours: 160, officerReports: 75, dutyOfficerReports: 20, requiredCourses: ["جميع الدورات"], specialCondition: "اعتماد قائد الأمن الدبلوماسي + موافقة القيادة" },
  { currentRank: "رائد", targetRank: "مقدم ركن", minimumDays: 60, minimumHours: 190, officerReports: 120, dutyOfficerReports: 25, requiredCourses: ["جميع الدورات"], specialCondition: "اعتماد قائد الأمن الدبلوماسي + موافقة القيادة" },
  { currentRank: "مقدم ركن", targetRank: "عقيد ركن", minimumDays: 90, minimumHours: 220, officerReports: 160, dutyOfficerReports: 30, requiredCourses: ["جميع الدورات"], specialCondition: "اعتماد قائد الأمن الدبلوماسي + موافقة القيادة" },
  { currentRank: "عقيد ركن", targetRank: "عميد ركن", minimumDays: 120, minimumHours: 260, officerReports: 220, dutyOfficerReports: 35, requiredCourses: ["جميع الدورات"], specialCondition: "اعتماد قائد الأمن الدبلوماسي + موافقة القيادة" },
  { currentRank: "عميد ركن", targetRank: "لواء ركن", minimumDays: 180, minimumHours: 320, officerReports: 300, dutyOfficerReports: 40, requiredCourses: ["جميع الدورات"], specialCondition: "اعتماد قائد الأمن الدبلوماسي + موافقة القيادة" },
];

export const REPORT_TYPES = [
  { key: "operations", label: "تقارير عمليات" },
  { key: "area_officer", label: "تقارير ضابط منطقة" },
  { key: "officer", label: "تقارير ضباط" },
  { key: "duty_officer", label: "تقارير ضابط خفر" },
] as const;

export type ReportTypeKey = typeof REPORT_TYPES[number]["key"];

export function getPromotionRequirement(rank?: string | null) {
  return PROMOTION_REQUIREMENTS.find((item) => item.currentRank === rank) ?? null;
}

export function daysBetween(start?: string | null, end = new Date()) {
  if (!start) return 0;
  const parsed = new Date(start);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - parsed.getTime()) / 86400000));
}

export type PromotionAdjustmentSummary = {
  halfRequirements?: boolean | null;
  operationsDiscount?: number | null;
  areaOfficerDiscount?: number | null;
  officerDiscount?: number | null;
  dutyOfficerDiscount?: number | null;
};

export type EffectivePromotionRequirement = PromotionRequirement & {
  original: PromotionRequirement;
  adjustmentLabels: string[];
};

function discountedNumber(value: number | undefined, half: boolean, discount = 0) {
  if (value == null) return undefined;
  const base = half ? Math.ceil(value / 2) : value;
  return Math.max(0, base - Math.max(0, Number(discount || 0)));
}

/**
 * يطبق التسهيلات المعتمدة على المتطلبات الرقمية فقط.
 * نصف الشروط لا يلغي الدورات أو موافقة القيادة، وخصم التقارير يخص نوع التقرير المحدد.
 */
export function getEffectivePromotionRequirement(
  requirement: PromotionRequirement | null,
  adjustments: PromotionAdjustmentSummary = {},
): EffectivePromotionRequirement | null {
  if (!requirement) return null;
  const half = Boolean(adjustments.halfRequirements);
  const labels: string[] = [];
  if (half) labels.push("نصف الشروط الرقمية");
  const reportDiscounts = [
    ["تقارير عمليات", Number(adjustments.operationsDiscount || 0)],
    ["تقارير ضابط منطقة", Number(adjustments.areaOfficerDiscount || 0)],
    ["تقارير ضباط", Number(adjustments.officerDiscount || 0)],
    ["تقارير ضابط خفر", Number(adjustments.dutyOfficerDiscount || 0)],
  ] as const;
  reportDiscounts.forEach(([label, value]) => { if (value > 0) labels.push(`خصم ${value} ${label}`); });

  return {
    ...requirement,
    original: requirement,
    adjustmentLabels: labels,
    minimumDays: discountedNumber(requirement.minimumDays, half) ?? requirement.minimumDays,
    minimumHours: discountedNumber(requirement.minimumHours, half) ?? requirement.minimumHours,
    operationsReports: discountedNumber(requirement.operationsReports, half, adjustments.operationsDiscount || 0),
    areaOfficerReports: discountedNumber(requirement.areaOfficerReports, half, adjustments.areaOfficerDiscount || 0),
    officerReports: discountedNumber(requirement.officerReports, half, adjustments.officerDiscount || 0),
    dutyOfficerReports: discountedNumber(requirement.dutyOfficerReports, half, adjustments.dutyOfficerDiscount || 0),
  };
}
