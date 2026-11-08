"use client";

import { useRouter } from "next/navigation";
import DateSelector from "@/components/ui/date-selector";

export default function RevenueDateFilter({
  value,
  basePath = "/admin/sales-revenue",
}) {
  const router = useRouter();

  function handleDateChange(range) {
    const params = new URLSearchParams({
      startDate: range.startDate,
      endDate: range.endDate,
    });

    router.push(`${basePath}?${params.toString()}`);
  }

  return <DateSelector value={value} onChange={handleDateChange} />;
}
