
"use client";

import Link from "next/link";

export default function PipelineCard({
  opportunities = 0,
  estimates = 0,
  pipelineValue = 0,
  currency = "$",
  href = "/admin/pipeline",
  className = "",
}) {
  const formatAmount = (amount) => {
    return `${currency}${new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(amount) || 0)}`;
  };

  return (
    <Link
      href={href}
      className={`block w-full border border-[#d5d5d5] bg-white p-4 transition-colors hover:border-[#777] sm:p-[18px] ${className}`}
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

      <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm text-black sm:gap-x-6">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <strong className="font-extrabold">
            {opportunities}
          </strong>
          <span className="font-medium uppercase">
            Opps
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <strong className="font-extrabold">
            {estimates}
          </strong>

          <span className="font-medium uppercase">
            Estimates
          </span>

          <span className="font-medium">
            / {formatAmount(pipelineValue)}
          </span>
        </div>
      </div>
    </Link>
  );
}
