"use client";

import { useEffect } from "react";
import { useMobileEditAction } from "@/components/layout/app-shell";

export default function MobileEditAction({ href }) {
  const { setMobileEditHref } = useMobileEditAction();

  useEffect(() => {
    setMobileEditHref(href);

    return () => {
      setMobileEditHref(null);
    };
  }, [href, setMobileEditHref]);

  return null;
}