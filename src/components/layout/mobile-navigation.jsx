
"use client";

import { useEffect } from "react";
import AppSidebar from "@/components/layout/app-sidebar";

export default function MobileNavigation({
  open,
  onClose,
  role = "salesperson",
  isAuthenticated = false,
  onLogout,
  onLoginRequired,
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
      {/* Overlay */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close navigation overlay"
        onClick={onClose}
        className={[
          "absolute inset-0 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      {/* Drawer */}
      <div
        id="mobile-navigation"
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label="Mobile navigation"
        inert={!open}
        className={[
          "absolute inset-y-0 left-0 transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <AppSidebar
          mobile
          role={role}
          isAuthenticated={isAuthenticated}
          onNavigate={onClose}
          onLogout={handleLogout}
          onLoginRequired={onLoginRequired}
        />
      </div>
    </div>
  );
}
