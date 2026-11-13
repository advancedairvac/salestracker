"use client";

import Link from "next/link";

import MetricSkeleton from "@/components/ui/skeleton/metric-skeleton";

export default function RevenueCard({
  today = 0,
  mtd = 0,
  ytd = 0,
  currency = "$",
  href = "/admin/sales-revenue",
  className = "",
  loading = false,
}) {
  const formatAmount = (amount) => {
    const value = Number(amount) || 0;

    return `${currency}${new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)}`;
  };

  const metrics = [
    { label: "Today", value: today },
    { label: "MTD", value: mtd },
    { label: "YTD", value: ytd },
  ];

  return (
    <Link
      href={href}
      className={`block w-full border border-[#d5d5d5] bg-white p-4 transition-colors hover:border-[#777] sm:p-[18px] ${className}`}
      aria-busy={loading}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[19px] font-extrabold uppercase leading-tight tracking-[-0.4px] text-black sm:text-xl">
          Sales Revenue
        </h2>

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

      <div
        className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-5"
        aria-live="polite"
      >
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-baseline gap-2 whitespace-nowrap"
          >
            {loading ? (
              <MetricSkeleton width="48px" />
            ) : (
              <strong className="text-sm font-extrabold text-black sm:text-[15px]">
                {formatAmount(metric.value)}
              </strong>
            )}

            <span className="text-xs font-medium uppercase text-[#333] sm:text-sm">
              {metric.label}
            </span>
          </div>
        ))}
      </div>
    </Link>
  );
}
