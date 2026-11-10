"use client";

import { useRouter } from "next/navigation";
import DateSelector from "@/components/ui/date-selector";

export default function RevenueDateFilter({
  value,
  preset = "MTD",
  basePath = "/admin/sales-revenue",
}) {
  const router = useRouter();

  // ============================================
  // HANDLE DATE AND PRESET CHANGE
  // ============================================

  function handleDateChange(range, selectedPreset) {
    if (!range?.startDate || !range?.endDate) {
      return;
    }

    const params = new URLSearchParams({
      startDate: range.startDate,
      endDate: range.endDate,
      preset: selectedPreset || "Custom",
    });

    router.push(`${basePath}?${params.toString()}`);
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <DateSelector value={value} preset={preset} onChange={handleDateChange} />
  );
}
