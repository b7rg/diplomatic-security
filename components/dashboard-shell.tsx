"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileClock,
  FilePenLine,
  FileQuestion,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UserRoundCog,
  Users,
  X,
  MapPinned,
  ShieldAlert,
  ClipboardList,
} from "lucide-react";

import SectorLogo from "@/components/sector-logo";
import DashboardHelp from "@/components/dashboard-help";
import { DEMO_OWNER, can, type Profile } from "@/lib/auth";
import {
  getSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(
    isSupabaseConfigured() ? null : DEMO_OWNER
  );

  const [loading, setLoading] = useState(
    isSupabaseConfigured()
  );

  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase) return;

    (async () => {
      const { data: auth } =
        await supabase.auth.getUser();

      if (!auth.user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .single();

      if (
        error ||
        !data ||
        data.status !== "approved"
      ) {
        router.replace("/pending");
        return;
      }

      setProfile(data as Profile);
      setLoading(false);
    })();
  }, [router]);

  const groups = useMemo(() => {
    if (!profile) return [];

    return [
      {
        label: "المركز",
        items: [
          {
            label: "نظرة عامة",
            href: "/dashboard",
            icon: LayoutDashboard,
            show: true,
          },
          {
            label: "بطاقتي",
            href: "/my-card",
            icon: CreditCard,
            show: true,
          },
          {
            label: "طلبات الدخول",
            href: "/dashboard/accounts",
            icon: Users,
            show:
              profile.is_owner ||
              can(profile, "manage_accounts"),
          },
          {
            label: "القيادة والأقسام والمسميات",
            href: "/dashboard/organization",
            icon: Building2,
            show:
              profile.is_owner ||
              can(profile, "manage_organization") ||
              can(profile, "edit_structure"),
          },
        ],
      },

      {
        label: "الأفراد والشؤون",
        items: [
          {
            label: "إدارة الأفراد والجدول",
            href: "/dashboard/schedule",
            icon: UserRoundCog,
            show:
              profile.is_owner ||
              can(profile, "manage_schedule") ||
              can(profile, "manage_accounts") ||
              can(
                profile,
                "manage_personnel_tracking"
              ),
          },
          {
            label: "الرصد والترقيات",
            href: "/dashboard/tracking",
            icon: ClipboardList,
            show:
              profile.is_owner ||
              can(
                profile,
                "manage_personnel_tracking"
              ),
          },
          {
            label: "الشرطة العسكرية",
            href: "/dashboard/military-police",
            icon: ShieldAlert,
            show:
              profile.is_owner ||
              can(
                profile,
                "manage_military_police"
              ) ||
              profile.department_key ===
                "military-police",
          },
        ],
      },

      {
        label: "القبول والتقديم",
        items: [
          {
            label: "طلبات جميع الأقسام",
            href: "/dashboard/applications",
            icon: Inbox,
            show:
              profile.is_owner ||
              can(profile, "manage_applications"),
          },
          {
            label: "أسئلة كلية الضباط",
            href:
              "/dashboard/officer-college-questions",
            icon: FileQuestion,
            show:
              profile.is_owner ||
              can(
                profile,
                "manage_application_questions"
              ),
          },
        ],
      },

      {
        label: "المحتوى والتشغيل",
        items: [
          {
            label: "إدارة المحتوى",
            href: "/dashboard/content",
            icon: FilePenLine,
            show:
              profile.is_owner ||
              can(profile, "manage_content") ||
              can(profile, "edit_laws") ||
              can(profile, "edit_protocols") ||
              can(profile, "edit_promotions") ||
              can(profile, "edit_leaves"),
          },
          {
            label: "طابور المراجعة",
            href: "/dashboard/review",
            icon: ClipboardCheck,
            show:
              profile.is_owner ||
              can(profile, "publish_content"),
          },
          {
            label: "الإعلانات",
            href: "/dashboard/announcements",
            icon: BellRing,
            show:
              profile.is_owner ||
              can(
                profile,
                "manage_announcements"
              ),
          },
          {
            label: "إدارة الخريطة",
            href: "/dashboard/map",
            icon: MapPinned,
            show:
              profile.is_owner ||
              can(profile, "manage_map"),
          },
        ],
      },

      {
        label: "الحوكمة",
        items: [
          {
            label: "سجل التغييرات",
            href: "/dashboard/audit",
            icon: FileClock,
            show:
              profile.is_owner ||
              can(profile, "view_audit"),
          },
          {
            label: "إعدادات البوابة",
            href: "/dashboard/settings",
            icon: Settings2,
            show:
              profile.is_owner ||
              can(profile, "manage_settings"),
          },
        ],
      },
    ]
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => item.show
        ),
      }))
      .filter((group) => group.items.length);
  }, [profile]);

  async function logout() {
    await getSupabase()?.auth.signOut();
    router.replace("/");
  }

  function SidebarContent() {
    return (
      <div
        className="flex h-full min-h-0 flex-col"
        dir="rtl"
      >
        <div className="border-b border-white/[.065] p-5">
          <div className="flex items-center gap-3">
            <SectorLogo className="h-12 w-12 rounded-[16px]" />

            <div className="min-w-0">
              <p className="truncate text-[10px] font-black text-zinc-700">
                قطاع الأمن الدبلوماسي
              </p>

              <h2 className="mt-1 truncate text-sm font-black text-zinc-200">
                مركز القيادة
              </h2>
            </div>
          </div>

          <div className="mt-5 rounded-[20px] border border-white/[.065] bg-white/[.018] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-zinc-200">
                  {loading
                    ? "جارٍ التحميل..."
                    : profile?.name}
                </p>

                <p className="mt-1 truncate text-[11px] font-bold text-zinc-600">
                  {profile?.is_owner
                    ? "مالك النظام"
                    : profile?.title}
                </p>
              </div>

              <span className="signal-dot mt-1.5 shrink-0" />
            </div>

            {!isSupabaseConfigured() && (
              <span className="bronze-text mt-3 inline-flex rounded-full border border-[rgba(213,166,116,.14)] bg-[rgba(213,166,116,.05)] px-2.5 py-1 text-[9px] font-black">
                وضع المعاينة
              </span>
            )}
          </div>
        </div>

        <nav className="slim-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div
              key={group.label}
              className="mb-5"
            >
              <p className="mb-2 px-3 text-[10px] font-black text-zinc-700">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(
                        `${item.href}/`
                      ));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() =>
                        setMobile(false)
                      }
                      className={`group flex items-center gap-3 rounded-[16px] border px-3.5 py-3 text-sm font-black transition ${
                        active
                          ? "border-[rgba(213,166,116,.16)] bg-[rgba(213,166,116,.085)] text-[#efd0ad]"
                          : "border-transparent text-zinc-600 hover:bg-white/[.03] hover:text-zinc-300"
                      }`}
                    >
                      <Icon
                        size={17}
                        className={
                          active
                            ? "text-[#d5a674]"
                            : "text-zinc-700 group-hover:text-zinc-500"
                        }
                      />

                      <span className="flex-1">
                        {item.label}
                      </span>

                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d5a674] shadow-[0_0_10px_rgba(213,166,116,.6)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[.065] p-3">
          <Link
            href="/dashboard/guide"
            className="mb-1 flex w-full items-center gap-3 rounded-[16px] px-3.5 py-3 text-sm font-bold text-zinc-600 transition hover:bg-white/[.03] hover:text-[#d5a674]"
          >
            <HelpCircle size={17} />
            دليل الاستخدام
          </Link>

          <Link
            href="/"
            className="mb-1 flex w-full items-center gap-3 rounded-[16px] px-3.5 py-3 text-sm font-bold text-zinc-600 transition hover:bg-white/[.03] hover:text-zinc-300"
          >
            <ShieldCheck size={17} />
            عرض البوابة العامة
          </Link>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-[16px] px-3.5 py-3 text-sm font-bold text-zinc-600 transition hover:bg-[rgba(183,106,91,.06)] hover:text-[#c87a6b]"
          >
            <LogOut size={17} />
            تسجيل خروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070808] text-white">
      <div className="soft-grid pointer-events-none fixed inset-0 opacity-20" />

      {/* القائمة الجانبية - كمبيوتر */}
      <aside className="glass-strong fixed bottom-4 right-4 top-4 z-40 hidden w-[286px] overflow-hidden rounded-[28px] lg:block">
        <SidebarContent />
      </aside>

      {/* هيدر الجوال */}
      <header className="glass-strong fixed left-4 right-4 top-4 z-50 flex h-16 items-center justify-between rounded-[22px] px-3 lg:hidden">
        <div className="flex items-center gap-3">
          <SectorLogo className="h-10 w-10 rounded-[14px]" />

          <div>
            <p className="text-[9px] font-black text-zinc-700">
              قطاع الأمن الدبلوماسي
            </p>
            <p className="text-sm font-black">
              مركز القيادة
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMobile((value) => !value)
          }
          className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[.08] bg-white/[.02]"
          aria-label="فتح القائمة"
        >
          {mobile ? (
            <X size={19} />
          ) : (
            <Menu size={19} />
          )}
        </button>
      </header>

      {mobile && (
        <div
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
          onClick={() => setMobile(false)}
        />
      )}

      {mobile && (
        <aside className="glass-strong fixed bottom-4 right-4 top-24 z-50 w-[calc(100%-2rem)] max-w-[320px] overflow-hidden rounded-[28px] lg:hidden">
          <SidebarContent />
        </aside>
      )}

      {/* مساحة العمل */}
      <main
        className="
          dashboard-workspace
          slim-scrollbar
          relative
          min-h-screen
          px-4
          pb-10
          pt-24

          sm:px-6

          lg:fixed
          lg:bottom-4
          lg:left-4
          lg:right-[306px]
          lg:top-4
          lg:min-h-0
          lg:overflow-y-auto
          lg:px-1
          lg:pb-6
          lg:pt-0

          xl:px-2
        "
      >
        <div className="dashboard-workspace-inner w-full pt-0">
          {children}
        </div>
      </main>

      <DashboardHelp />
    </div>
  );
}