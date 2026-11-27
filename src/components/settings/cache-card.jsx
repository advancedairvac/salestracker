
"use client";

import { useState } from "react";

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(duration) {
  if (typeof duration !== "number") return "—";

  if (duration < 1000) {
    return `${Math.round(duration)} ms`;
  }

  return `${(duration / 1000).toFixed(2)} sec`;
}

export default function CacheCard({
  title,
  description,
  status = "idle",
  updatedAt,
  totalCount,
  syncDurationMs,
  storage = "IndexedDB",
  onRefresh,
  placeholder = false,
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isSyncing = status === "refreshing" || isRefreshing;

  const statusLabels = {
    available: "Available",
    refreshing: "Syncing",
    idle: "Not initialized",
    error: "Sync failed",
  };

  const handleRefresh = async () => {
    if (!onRefresh || placeholder || isSyncing) return;

    try {
      setIsRefreshing(true);
      await onRefresh();
    } catch (error) {
      console.error(`${title} cache refresh failed:`, error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="border border-[#e5e5e5] bg-white p-5">
      {/* CARD HEADER */}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wide text-black">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-relaxed text-[#777]">
            {description}
          </p>
        </div>

        <span className="shrink-0 text-xs text-[#777]">
          {statusLabels[status] || "Unknown"}
        </span>
      </div>

      {/* CACHE INFORMATION */}

      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 border-y border-[#e5e5e5] py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#777]">
            Last Updated
          </p>

          <p className="mt-1.5 text-sm font-medium text-black">
            {formatDate(updatedAt)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#777]">
            Sync Duration
          </p>

          <p className="mt-1.5 text-sm font-medium text-black">
            {formatDuration(syncDurationMs)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#777]">
            Total Records
          </p>

          <p className="mt-1.5 text-sm font-medium text-black">
            {typeof totalCount === "number"
              ? totalCount.toLocaleString()
              : "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#777]">
            Storage
          </p>

          <p className="mt-1.5 text-sm font-medium text-black">
            {storage}
          </p>
        </div>
      </div>

      {/* ACTION */}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={!onRefresh || placeholder || isSyncing}
          className="w-full border border-[#e5e5e5 bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSyncing
            ? "Refreshing Cache..."
            : placeholder
              ? "Coming Soon"
              : "Reset & Refresh Cache"}
        </button>
      </div>

      {/* PLACEHOLDER */}

      {placeholder && (
        <p className="mt-3 text-xs leading-relaxed text-[#777]">
          Cache management will be available in a future update.
        </p>
      )}
    </div>
  );
}
