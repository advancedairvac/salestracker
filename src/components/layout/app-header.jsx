"use client";

import Link from "next/link";
import SvgIcon from "@/components/icons/svg-icons";

export default function AppHeader({
  onMenuClick,
  menuOpen = false,
  editHref = null,
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 md:hidden">
      <Link
        href="/"
        aria-label="Sales Tracker home"
        className="flex items-center"
      >
        <SvgIcon name="logo" className="h-auto w-[66px]" />
      </Link>

      <div className="flex items-center gap-3">
        {editHref && (
          <Link
            href={editHref}
            className="inline-flex h-9 items-center justify-center rounded-sm border border-neutral-300 px-4 text-xs font-semibold tracking-wide text-neutral-900 transition-colors hover:bg-neutral-100"
          >
            EDIT
          </Link>
        )}

        <button
          type="button"
          onClick={onMenuClick}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="flex size-10 items-center justify-center rounded-sm text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
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
