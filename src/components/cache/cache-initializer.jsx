
"use client";

import { useEffect } from "react";

import { initializeCustomerCache } from "@/lib/cache/servicetitan/customer-cache";
import { initializeEstimatesCache } from "@/lib/cache/servicetitan/estimates-cache";

export default function CacheInitializer() {
  useEffect(() => {
    initializeCustomerCache();
    initializeEstimatesCache();
  }, []);

  return null;
}
