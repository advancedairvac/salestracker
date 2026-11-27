"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";

import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import MobileNavigation from "@/components/layout/mobile-navigation";
import AppFooter from "@/components/layout/app-footer";

import {
  PageTaglineProvider,
  PageTaglineDisplay,
} from "@/components/ui/page-tagline";

import { clearCustomerCacheOnLogout } from "@/lib/cache/servicetitan/customer-cache";

// ============================================
// MOBILE EDIT ACTION CONTEXT
// ============================================

const MobileEditActionContext = createContext({
  setMobileEditHref: () => {},
});

export function useMobileEditAction() {
  return useContext(MobileEditActionContext);
}

// ============================================
// APP SHELL
// ============================================

export default function AppShell({
  children,
  role = "salesperson",
  user = null,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [tagline, setTagline] = useState(null);
  const [mobileEditHref, setMobileEditHref] = useState(null);

  const router = useRouter();

  // ============================================
  // MOBILE MENU
  // ============================================

  const openMenu = useCallback(() => {
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    closeMenu();

    // Start cache cleanup without waiting for it.
    clearCustomerCacheOnLogout().catch((error) => {
      console.error("Customer cache cleanup failed:", error);
    });

    // Logout API starts immediately.
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  }, [closeMenu, loggingOut, router]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <MobileEditActionContext.Provider value={{ setMobileEditHref }}>
      <div className="flex min-h-screen w-full bg-white text-neutral-950">
        {/* DESKTOP SIDEBAR */}

        <AppSidebar role={role} user={user} onLogout={handleLogout} />

        {/* MAIN CONTENT */}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {/* MOBILE HEADER */}

          <AppHeader
            role={role}
            user={user}
            onMenuClick={menuOpen ? closeMenu : openMenu}
            menuOpen={menuOpen}
            editHref={mobileEditHref}
          />

          <PageTaglineProvider value={{ tagline, setTagline }}>
            <main className="flex flex-1 flex-col bg-white px-5 pt-4 lg:px-23 lg:pt-10">
              {children}
            </main>

            {/* SHARED PAGE TAGLINE */}

            <div className="px-5 lg:px-23">
              <PageTaglineDisplay />
            </div>
          </PageTaglineProvider>

          {/* COPYRIGHT FOOTER */}

          <AppFooter />
        </div>

        {/* MOBILE NAVIGATION */}

        <MobileNavigation
          open={menuOpen}
          onClose={closeMenu}
          role={role}
          user={user}
          onLogout={handleLogout}
        />
      </div>
    </MobileEditActionContext.Provider>
  );
}
