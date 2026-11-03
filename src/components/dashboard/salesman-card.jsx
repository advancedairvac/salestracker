"use client";

import Link from "next/link";

export default function SalesmanCard({
  id,
  name,
  title,
  revenue = 0,
  commission = 0,
  monthlyGoal = 0,
  opportunities = 0,
  closeRate = 0,
  currency = "$",
  href,
  className = "",
}) {
  const safeRevenue = Number(revenue) || 0;
  const safeCommission = Number(commission) || 0;
  const safeMonthlyGoal = Number(monthlyGoal) || 0;

  const progress =
    safeMonthlyGoal > 0
      ? Math.min(Math.round((safeRevenue / safeMonthlyGoal) * 100), 100)
      : 0;

  const safeCloseRate = Math.max(0, Math.min(Number(closeRate) || 0, 100));

  const formatAmount = (amount) => {
    return `${currency}${new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(amount) || 0)}`;
  };

  const cardClass = `
    block w-full border border-[#d5d5d5] bg-white
    p-4 text-left transition-colors hover:border-[#777]
    sm:p-[18px]
    ${className}
  `;

  const CardContent = (
    <>
      {/* Name and Title */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[19px] font-extrabold uppercase leading-tight tracking-[-0.4px] text-black sm:text-xl">
            {name}
          </h3>

          {title && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#666] sm:text-[13px]">
              {title}
            </p>
          )}
        </div>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-6 w-6 shrink-0 text-[#555]"
          aria-hidden="true"
        >
          <path
            d="M9 5L16 12L9 19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Performance Metrics */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          {/* Revenue / Commission */}
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <strong className="text-sm font-extrabold text-black sm:text-[15px]">
              {formatAmount(safeRevenue)}
            </strong>

            <span className="text-xs text-[#333] sm:text-sm">
              / {formatAmount(safeCommission)}
            </span>
          </div>

          {/* Opportunities */}
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <strong className="text-sm font-extrabold text-black sm:text-[15px]">
              {opportunities}
            </strong>

            <span className="text-xs uppercase text-[#333] sm:text-sm">
              Opps
            </span>
          </div>

          {/* Close Rate */}
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <strong className="text-sm font-extrabold text-black sm:text-[15px]">
              {safeCloseRate}%
            </strong>

            <span className="text-xs uppercase text-[#333] sm:text-sm">CR</span>
          </div>
        </div>

        {/* Goal Progress Circle */}
        <div
          className="relative h-10 w-10 shrink-0"
          role="img"
          aria-label={`Monthly goal achievement ${progress}%`}
        >
          <svg
            viewBox="0 0 40 40"
            className="h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="20"
              cy="20"
              r="16.5"
              fill="none"
              stroke="#dedede"
              strokeWidth="3.5"
            />

            <circle
              cx="20"
              cy="20"
              r="16.5"
              fill="none"
              stroke="#000000"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 103.67} 103.67`}
            />
          </svg>

          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-black">
            {progress}%
          </span>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClass} data-salesman-id={id}>
        {CardContent}
      </Link>
    );
  }

  return (
    <div className={cardClass} data-salesman-id={id}>
      {CardContent}
    </div>
  );
}
