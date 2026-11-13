"use client";

import { useRouter, useSearchParams } from "next/navigation";

import DateSelector from "@/components/ui/date-selector";

// ============================================
// REVENUE DATE FILTER
// ============================================

export default function RevenueDateFilter({
  value,
  preset = "MTD",
  basePath = "/admin/sales-revenue",
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ============================================
  // HANDLE DATE AND PRESET CHANGE
  // ============================================

  function handleDateChange(range, selectedPreset) {
    if (!range?.startDate || !range?.endDate) {
      return;
    }

    // Preserve existing query parameters.
    const params = new URLSearchParams(searchParams.toString());

    // Update date range.
    params.set("startDate", range.startDate);
    params.set("endDate", range.endDate);
    params.set("preset", selectedPreset || "Custom");

    // Reset pagination after date change.
    params.set("page", "1");

    // Keep the previously selected page size.
    // If none exists, the server defaults to 10.
    if (!params.has("pageSize")) {
      params.set("pageSize", "10");
    }

    router.push(`${basePath}?${params.toString()}`);
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <DateSelector value={value} preset={preset} onChange={handleDateChange} />
  );
}
