"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import MetricSkeleton from "@/components/ui/skeleton/metric-skeleton";
import {
  getRevenueSummaryCache,
  refreshRevenueSummary,
  subscribeToRevenueSummaryCache,
} from "@/lib/cache/servicetitan/revenue-summary-cache";

const CACHE_TTL_MS = 60 * 1000;

export default function RevenueCard({
  currency = "$",
  href = "/admin/sales-revenue",
  className = "",
}) {
  const year = new Date().getFullYear();
  const [revenueValues, setRevenueValues] = useState({
    today: 0,
    mtd: 0,
    ytd: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    function applyCache(entry) {
      const value = entry?.value || entry;

      if (
        !value ||
        typeof value.todayRevenue !== "number" ||
        typeof value.monthRevenue !== "number" ||
        typeof value.yearRevenue !== "number"
      ) {
        return false;
      }

      setRevenueValues({
        today: value.todayRevenue,
        mtd: value.monthRevenue,
        ytd: value.yearRevenue,
      });
      setLoading(false);

      return true;
    }

    async function refreshIfStale() {
      const entry = await getRevenueSummaryCache(year);

      if (!active) return;

      const hasCache = applyCache(entry);
      const isStale =
        !entry || !entry.updatedAt || Date.now() - entry.updatedAt >= CACHE_TTL_MS;

      if (!isStale) return;

      try {
        const value = await refreshRevenueSummary(year);

        if (!active) return;

        setRevenueValues({
          today: value.todayRevenue,
          mtd: value.monthRevenue,
          ytd: value.yearRevenue,
        });
      } catch (error) {
        console.error("Revenue summary refresh failed:", error);

        if (!hasCache && active) {
          setRevenueValues({ today: 0, mtd: 0, ytd: 0 });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    const unsubscribe = subscribeToRevenueSummaryCache(year, (entry) => {
      if (active) applyCache(entry);
    });

    const handleFocus = () => {
      refreshIfStale().catch((error) => {
        console.error("Revenue summary cache check failed:", error);
      });
    };

    refreshIfStale().catch((error) => {
      console.error("Revenue summary cache check failed:", error);
      if (active) setLoading(false);
    });

    const refreshTimer = window.setInterval(handleFocus, CACHE_TTL_MS);
    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [year]);

  const formatAmount = (amount) => {
    const value = Number(amount) || 0;

    return `${currency}${new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)}`;
  };

  const metricItems = [
    { label: "Today", value: revenueValues.today },
    { label: "MTD", value: revenueValues.mtd },
    { label: "YTD", value: revenueValues.ytd },
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
        {metricItems.map((metric) => (
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
