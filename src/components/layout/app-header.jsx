"use client";

import Link from "next/link";
import SvgIcon from "@/components/icons/svg-icons";

export default function AppHeader({
  role = "salesperson",
  user = null,
  onMenuClick,
  menuOpen = false,
  editHref = null,
}) {
  const logoHref =
    String(role).toLowerCase() === "admin" ? "/admin" : "/salesperson";

  // ============================================
  // USER INITIALS
  // ============================================

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "U";

    const words = name.trim().split(/\s+/).filter(Boolean);

    if (!words.length) return "U";

    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    return (
      words[0].charAt(0) + words[words.length - 1].charAt(0)
    ).toUpperCase();
  };

  const initials = getInitials(user?.name);

  // ============================================
  // HEADER
  // ============================================

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 md:hidden">
      {/* LOGO */}

      <Link
        href={logoHref}
        aria-label="Sales Tracker home"
        className="flex shrink-0 items-center"
      >
        <SvgIcon name="logo" className="h-auto w-[66px]" />
      </Link>

      {/* RIGHT ACTIONS */}

      <div className="flex items-center gap-3">
        {/* EDIT */}

        {editHref && (
          <Link
            href={editHref}
            className="inline-flex h-9 items-center justify-center border-0 bg-transparent px-2 text-xs font-semibold tracking-wide text-neutral-900 transition-colors hover:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            EDIT
          </Link>
        )}

        {/* USER BADGE */}

        <span
          aria-label={`${user?.name || "User"} account`}
          title={user?.name || "User"}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-medium uppercase text-white"
        >
          {initials}
        </span>

        {/* HAMBURGER - FAR RIGHT */}

        <button
          type="button"
          onClick={onMenuClick}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="flex size-10 shrink-0 items-center justify-center text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {menuOpen ? (
            <span aria-hidden="true" className="text-2xl leading-none">
              ×
            </span>
          ) : (
            <SvgIcon name="hamburger" className="size-5" />
          )}
        </button>
      </div>
    </header>
  );
}