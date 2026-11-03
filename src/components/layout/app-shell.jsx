"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import MobileNavigation from "@/components/layout/mobile-navigation";
import AppFooter from "@/components/layout/app-footer";
import Modal from "@/components/ui/modal";

import {
  PageTaglineProvider,
  PageTaglineDisplay,
} from "@/components/ui/page-tagline";

export default function AppShell({
  children,
  role = "salesperson",
  isAuthenticated = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [tagline, setTagline] = useState(null);

  const router = useRouter();

  const openMenu = useCallback(() => {
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const openLoginModal = useCallback(() => {
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    closeMenu();

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  }, [closeMenu, loggingOut, router]);

  return (
    <div className="flex min-h-screen w-full bg-white text-neutral-950">
      {/* Desktop sidebar */}
      <AppSidebar
        role={role}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        onLoginRequired={openLoginModal}
      />

      {/* Main content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppHeader
          onMenuClick={menuOpen ? closeMenu : openMenu}
          menuOpen={menuOpen}
        />

        <PageTaglineProvider value={{ tagline, setTagline }}>
          <main className="flex flex-1 flex-col bg-white px-5 pt-4 lg:px-23 lg:pt-10">
            {children}
          </main>

          {/* Shared page tagline position */}
          <div className="px-5 lg:px-23">
            <PageTaglineDisplay />
          </div>
        </PageTaglineProvider>

        {/* Copyright footer */}
        <AppFooter />
      </div>

      {/* Mobile navigation drawer */}
      <MobileNavigation
        open={menuOpen}
        onClose={closeMenu}
        role={role}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        onLoginRequired={openLoginModal}
      />

      {/* Shared login-required modal */}
      <Modal
        open={loginModalOpen}
        onClose={closeLoginModal}
        title="Login Required"
        description="Please log in to access this feature."
        size="sm"
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={closeLoginModal}
            className="border border-black bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
