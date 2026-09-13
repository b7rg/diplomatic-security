export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse space-y-4">
      <div className="h-40 rounded-[30px] border border-white/[.05] bg-white/[.018]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-[24px] border border-white/[.05] bg-white/[.014]" />)}
      </div>
      <div className="h-80 rounded-[30px] border border-white/[.05] bg-white/[.014]" />
    </div>
  );
}
