function formatCurrency(amount, currency) {
  return `${currency}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)}`;
}

export default function RevenueSummary({
  revenue = 0,
  goal = 0,
  goalLabel = "MONTHLY GOAL",
  commissionRate = 5,
  commissionAmount = null,
  currency = "$",
  className = "",
}) {
  const totalRevenue = Number(revenue) || 0;
  const totalGoal = Number(goal) || 0;

  const calculatedProgress =
    totalGoal > 0 ? Math.round((totalRevenue / totalGoal) * 100) : 0;

  const progress = Math.min(Math.max(calculatedProgress, 0), 100);

  const commission =
    commissionAmount !== null
      ? Number(commissionAmount) || 0
      : totalRevenue * ((Number(commissionRate) || 0) / 100);

  const circumference = 2 * Math.PI * 51;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <section
      className={`w-full bg-white px-4 py-8 lg:px-8 lg:py-18 ${className}`}
      aria-label="Revenue summary"
    >
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
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
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
            {goalLabel}
          </p>
        </div>
      </div>

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
