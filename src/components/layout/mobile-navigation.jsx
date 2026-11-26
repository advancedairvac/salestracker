
"use client";

import { useEffect } from "react";
import AppSidebar from "@/components/layout/app-sidebar";

export default function MobileNavigation({
  open,
  onClose,
  role = "salesperson",
  onLogout,
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const handleLogout = () => {
    onClose();
    onLogout?.();
  };

  return (
    <div
      className={[
        "fixed inset-0 z-50 md:hidden",
        open ? "visible" : "invisible pointer-events-none",
      ].join(" ")}
      aria-hidden={!open}
    >
      {/* OVERLAY */}

      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close navigation overlay"
        onClick={onClose}
        className={[
          "absolute inset-0 bg-black/40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      {/* RIGHT SIDE DRAWER */}

      <div
        id="mobile-navigation"
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label="Mobile navigation"
        inert={!open}
        className={[
          "absolute inset-y-0 right-0",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* CLOSE BUTTON */}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className={[
            "absolute right-5 top-5 z-50",
            "flex h-10 w-10 items-center justify-center",
            "bg-white text-black",
            "text-3xl font-light leading-none",
            "transition-colors hover:bg-neutral-100",
          ].join(" ")}
        >
          ×
        </button>

        {/* SIDEBAR */}

        <AppSidebar
          mobile
          role={role}
          onNavigate={onClose}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}
