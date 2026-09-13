import Link from "next/link";
import SectorLogo from "@/components/sector-logo";
import { SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-white/[.06] px-5 py-10 md:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SectorLogo className="h-11 w-11 rounded-[15px]" />
          <div>
            <p className="text-sm font-black text-zinc-300">{SITE.name}</p>
            <p className="mt-1 text-[10px] font-black text-zinc-700">البوابة الرسمية للقطاع</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-600">
          <Link href="/laws" className="hover:text-zinc-300">القوانين</Link>
          <Link href="/protocols" className="hover:text-zinc-300">البروتوكولات</Link>
          <Link href="/my-card" className="hover:text-zinc-300">بطاقتي</Link>
          <Link href="/map" className="hover:text-zinc-300">الخريطة</Link>
          <Link href="/structure" className="hover:text-zinc-300">الهيكل</Link>
          <Link href="/apply" className="hover:text-zinc-300">التقديم</Link>
          <Link href="/login" className="bronze-text">دخول النظام</Link>
        </div>
      </div>
    </footer>
  );
}
