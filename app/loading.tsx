import SectorLogo from "@/components/sector-logo";

export default function Loading() {
  return <div className="flex min-h-screen items-center justify-center bg-[#070808] px-4 text-center"><div><SectorLogo className="mx-auto h-20 w-20 rounded-[24px]"/><div className="mx-auto mt-5 h-1 w-28 overflow-hidden rounded-full bg-white/[.05]"><span className="block h-full w-1/2 animate-pulse rounded-full bg-[#d5a674]"/></div><p className="mt-4 text-sm font-black text-zinc-400">جارٍ تحميل بوابة الأمن الدبلوماسي</p></div></div>;
}
