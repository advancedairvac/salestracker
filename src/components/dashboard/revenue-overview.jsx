
const defaultData = [
  { month: "May", amount: 4200 },
  { month: "Jun", amount: 5800 },
  { month: "Jul", amount: 4900 },
  { month: "Aug", amount: 7200 },
  { month: "Sep", amount: 6500 },
  { month: "Oct", amount: 8400 },
];

export default function RevenueOverview({ data = defaultData }) {
  const maxAmount = Math.max(...data.map((item) => item.amount), 1);

  return (
    <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#0d0d0d]">Revenue Overview</h2>
          <p className="mt-1 text-sm text-gray-500">
            Monthly revenue · Demo data
          </p>
        </div>
        <span className="rounded-full bg-[#e7f6fc] px-3 py-1.5 text-xs font-medium text-[#0675a0]">
          Last 6 months
        </span>
      </div>

      <div className="mt-8 flex h-52 items-end gap-3 sm:gap-5">
        {data.map((item) => {
          const height = Math.max((item.amount / maxAmount) * 100, 4);

          return (
            <div
              key={item.month}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <div className="flex w-full flex-1 items-end">
                <div
                  title={`${item.month}: $${item.amount.toLocaleString()}`}
                  className="w-full rounded-t-md bg-[#0690c8] transition-opacity hover:opacity-75"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{item.month}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 border-t border-black/[0.06] pt-4 text-xs text-gray-500">
        Illustrative figures only. Connect real sales records before using for reporting.
      </p>
    </section>
  );
}
