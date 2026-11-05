function getMonthCount(startDate, endDate) {
  if (!startDate || !endDate) return 1;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return 1;
  }

  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1
  );
}

function formatCurrency(amount, currency) {
  return `${currency}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)}`;
}

export default function RevenueSummary({
  revenue = 0,
  monthlyGoal = 0,
  startDate,
  endDate,
  commissionRate = 5,
  currency = "$",
  className = "",
}) {
  const totalRevenue = Number(revenue) || 0;
  const monthlyTarget = Number(monthlyGoal) || 0;
  const commissionPercentage = Number(commissionRate) || 0;

  const monthCount = getMonthCount(startDate, endDate);

  const totalGoal = monthlyTarget * monthCount;

  const progress =
    totalGoal > 0 ? Math.round((totalRevenue / totalGoal) * 100) : 0;

  const commission = totalRevenue * (commissionPercentage / 100);

  const ringProgress = Math.min(Math.max(progress, 0), 100);

  const circumference = 2 * Math.PI * 35;

  const dashOffset = circumference - (ringProgress / 100) * circumference;

  return (
    <section
      className={`w-full px-4 lg:px-8 py-8 lg:py-18 bg-white ${className}`}
      aria-label="Revenue summary"
    >
      {/* Goal Progress */}
      <div className="flex items-center gap-5 sm:gap-7">
        <div
          className="relative h-[110px] w-[110px] shrink-0"
          role="img"
          aria-label={`Goal progress ${progress}%`}
        >
          <svg
            viewBox="0 0 110 110"
            className="h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="55"
              cy="55"
              r="51"
              fill="none"
              stroke="#dedede"
              strokeWidth="2"
            />

            <circle
              cx="55"
              cy="55"
              r="51"
              fill="none"
              stroke="#000000"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 51}
              strokeDashoffset={
                2 * Math.PI * 51 -
                (Math.min(Math.max(progress, 0), 100) / 100) *
                  (2 * Math.PI * 51)
              }
            />
          </svg>

          <span className="absolute inset-0 flex items-center justify-center text-[27px] font-bold text-black">
            {progress}%
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-2xl font-medium leading-tight text-black lg:text-3xl">
            {formatCurrency(totalGoal, currency)}
          </p>

          <p className="mt-1 text-sm uppercase tracking-wide text-[#555]">
            {monthCount === 1 ? "Monthly" : `${monthCount} Months`} Goal
          </p>
        </div>
      </div>

      {/* Revenue and Commission */}
      <div className="mt-7 space-y-1 pl-1">
        <h2 className="text-3xl font-bold leading-tight text-black lg:text-5xl">
          {formatCurrency(totalRevenue, currency)}
        </h2>

        <p className="text-sm font-normal uppercase tracking-wide text-[#333] sm:text-base">
          {formatCurrency(commission, currency)} Est. Commission
        </p>
      </div>
    </section>
  );
}
