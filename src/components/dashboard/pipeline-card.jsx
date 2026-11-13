"use client";

import Link from "next/link";

import MetricSkeleton from "@/components/ui/skeleton/metric-skeleton";

export default function PipelineCard({
  opportunities = 0,
  estimateCount = 0,
  estimateValue = 0,
  currency = "$",
  href = "/admin/pipeline",
  className = "",
  loading = false,
}) {
  const formatAmount = (amount) => {
    return `${currency}${new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(amount) || 0)}`;
  };

  const metrics = [
    {
      value: opportunities,
      label: "Opps",
      width: "24px",
    },
    {
      value: estimateCount,
      label: "Estimates",
      width: "35px",
    },
    {
      value: formatAmount(estimateValue),
      label: null,
      width: "55px",
    },
  ];

  return (
    <Link
      href={href}
      className={`block w-full border border-[#d5d5d5] bg-white p-4 transition-colors hover:border-[#777] sm:p-[18px] ${className}`}
      aria-busy={loading}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[19px] font-extrabold uppercase leading-tight tracking-[-0.4px] text-black sm:text-xl">
          In The Pipeline
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
        className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm text-black sm:gap-x-6"
        aria-live="polite"
      >
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="flex min-w-0 flex-wrap items-baseline gap-x-1.5"
          >
            {loading ? (
              <MetricSkeleton width={metric.width} />
            ) : (
              <strong className="font-extrabold">{metric.value}</strong>
            )}

            {metric.label && (
              <span className="font-medium uppercase">{metric.label}</span>
            )}
          </div>
        ))}
      </div>
    </Link>
  );
}
