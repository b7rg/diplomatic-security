import {
  Boxes, BriefcaseBusiness, Crown, GraduationCap, Plane, Scale, SearchCheck,
  ShieldAlert, UserPlus, UsersRound,
} from "lucide-react";
import type { DepartmentAccent, DepartmentIconKey } from "@/lib/site";

export const DEPARTMENT_TONES: Record<DepartmentAccent, { border: string; bg: string; text: string; dot: string; soft: string }> = {
  bronze: { border: "border-[rgba(213,166,116,.24)]", bg: "bg-[rgba(213,166,116,.07)]", text: "text-[#dfb681]", dot: "bg-[#d5a674]", soft: "from-[rgba(213,166,116,.12)]" },
  wine: { border: "border-[rgba(150,83,77,.24)]", bg: "bg-[rgba(150,83,77,.07)]", text: "text-[#c98f87]", dot: "bg-[#b97870]", soft: "from-[rgba(150,83,77,.12)]" },
  steel: { border: "border-[rgba(112,134,151,.24)]", bg: "bg-[rgba(112,134,151,.07)]", text: "text-[#94abba]", dot: "bg-[#8fa5b6]", soft: "from-[rgba(112,134,151,.12)]" },
  green: { border: "border-[rgba(112,145,126,.24)]", bg: "bg-[rgba(112,145,126,.07)]", text: "text-[#96b2a1]", dot: "bg-[#8eaa99]", soft: "from-[rgba(112,145,126,.12)]" },
  violet: { border: "border-[rgba(134,105,163,.24)]", bg: "bg-[rgba(134,105,163,.07)]", text: "text-[#b19bc6]", dot: "bg-[#9e83b8]", soft: "from-[rgba(134,105,163,.12)]" },
  amber: { border: "border-[rgba(190,143,71,.24)]", bg: "bg-[rgba(190,143,71,.07)]", text: "text-[#d2ab70]", dot: "bg-[#c7964f]", soft: "from-[rgba(190,143,71,.12)]" },
  blue: { border: "border-[rgba(81,123,161,.24)]", bg: "bg-[rgba(81,123,161,.07)]", text: "text-[#8fb5d3]", dot: "bg-[#6f9fc3]", soft: "from-[rgba(81,123,161,.12)]" },
  teal: { border: "border-[rgba(70,141,137,.24)]", bg: "bg-[rgba(70,141,137,.07)]", text: "text-[#82bdb8]", dot: "bg-[#61a7a3]", soft: "from-[rgba(70,141,137,.12)]" },
  red: { border: "border-[rgba(170,73,68,.24)]", bg: "bg-[rgba(170,73,68,.07)]", text: "text-[#cf8179]", dot: "bg-[#bd625b]", soft: "from-[rgba(170,73,68,.12)]" },
  sand: { border: "border-[rgba(166,145,112,.24)]", bg: "bg-[rgba(166,145,112,.07)]", text: "text-[#c2aa84]", dot: "bg-[#ad9168]", soft: "from-[rgba(166,145,112,.12)]" },
};

export const DEPARTMENT_ACCENT_OPTIONS: { key: DepartmentAccent; label: string }[] = [
  ["bronze","برونزي"], ["steel","فولاذي"], ["green","أخضر"], ["red","أحمر"], ["violet","بنفسجي"],
  ["amber","ذهبي هادئ"], ["blue","أزرق"], ["teal","تركوازي"], ["wine","عنابي"], ["sand","رملي"],
].map(([key,label]) => ({ key: key as DepartmentAccent, label }));

export const DEPARTMENT_ICON_OPTIONS: { key: DepartmentIconKey; label: string }[] = [
  ["crown","قيادة"], ["briefcase","إدارة"], ["graduation","تدريب"], ["user-plus","تجنيد"], ["shield-alert","شرطة عسكرية"],
  ["scale","قضاء"], ["boxes","مساندة"], ["search","تحريات"], ["plane","دعم جوي"], ["users","أفراد"],
].map(([key,label]) => ({ key: key as DepartmentIconKey, label }));

export function DepartmentIcon({ iconKey, size = 18, className }: { iconKey: DepartmentIconKey; size?: number; className?: string }) {
  const map = {
    crown: Crown,
    briefcase: BriefcaseBusiness,
    graduation: GraduationCap,
    "user-plus": UserPlus,
    "shield-alert": ShieldAlert,
    scale: Scale,
    boxes: Boxes,
    search: SearchCheck,
    plane: Plane,
    users: UsersRound,
  } satisfies Record<DepartmentIconKey, typeof Crown>;
  const Icon = map[iconKey] ?? BriefcaseBusiness;
  return <Icon size={size} className={className} />;
}
