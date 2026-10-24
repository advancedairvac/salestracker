
export default function StatCard({
  title,
  value,
  detail,
  trend,
  symbol = "•",
}) {
  return (
    <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f2f2] text-lg text-[#0690c8]">
          {symbol}
        </span>
      </div>

      <p className="mt-4 text-2xl font-semibold tracking-tight text-[#0d0d0d]">
        {value}
      </p>

      {(detail || trend) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {trend && (
            <span className="font-semibold text-emerald-700">{trend}</span>
          )}
          {detail && <span className="text-gray-500">{detail}</span>}
        </div>
      )}
    </section>
  );
}
