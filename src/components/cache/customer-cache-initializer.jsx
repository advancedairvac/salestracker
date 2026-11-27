"use client";

import { useEffect } from "react";
import { initializeCustomerCache } from "@/lib/cache/servicetitan/customer-cache";

export default function CustomerCacheInitializer() {
  useEffect(() => {
    initializeCustomerCache();
  }, []);

  return null;
}