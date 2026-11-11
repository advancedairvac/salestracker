"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import SvgIcon from "@/components/icons/svg-icons";
import { getNavigation } from "@/config/navigation";

export default function AppSidebar({
  role = "salesperson",
  isAuthenticated = false,
  mobile = false,
  onNavigate,
  onLogout,
  onLoginRequired,
}) {
  const pathname = usePathname();

  const normalizedRole = String(role).toLowerCase();
  const isAdmin = normalizedRole === "admin";

  const items = getNavigation(role, isAuthenticated);

  const primaryItems = items.filter((item) => item.type === "primary");
  const secondaryItems = items.filter((item) => item.type === "secondary");

  // ============================================
  // ROLE-BASED LOGO DESTINATION
  // ============================================

  const logoHref = !isAuthenticated ? "/" : isAdmin ? "/admin" : "/salesperson";

  // ============================================
  // ACTIVE NAVIGATION
  // ============================================

  const isActive = (href) => {
    if (!href) return false;

    // Dashboard must only be active on its exact route.
    if (href === "/admin" || href === "/salesperson") {
      return pathname === href;
    }

    // Other navigation items support nested routes.
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // ============================================
  // LINK STYLES
  // ============================================

  const linkBaseClasses = [
    "group relative block w-fit max-w-full",
    "text-left transition-colors duration-200",
    "after:absolute after:bottom-0 after:left-0",
    "after:h-px after:w-full",
    "after:origin-left after:scale-x-0",
    "after:bg-current",
    "after:transition-transform after:duration-300",
    "after:ease-out",
    "hover:after:scale-x-100",
    "focus-visible:outline-none",
    "focus-visible:after:scale-x-100",
  ].join(" ");

  const primaryClasses = (active) =>
    [
      linkBaseClasses,
      "text-[23px] font-bold uppercase leading-[1.4]",
      active
        ? "text-[#005cb9] after:scale-x-100"
        : "text-black hover:text-[#005cb9]",
    ].join(" ");

  const secondaryClasses = (active) =>
    [
      linkBaseClasses,
      "text-[15px] font-medium leading-[1.9]",
      active
        ? "text-[#005cb9] after:scale-x-100"
        : "text-black hover:text-[#005cb9]",
    ].join(" ");

  // ============================================
  // RENDER NAVIGATION ITEM
  // ============================================

  const renderItem = (item, index) => {
    const active = isActive(item.href);

    const classes =
      item.type === "primary"
        ? primaryClasses(active)
        : secondaryClasses(active);

    // LOGOUT
    if (item.action === "logout") {
      return (
        <li key={`${item.label}-${index}`}>
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              onLogout?.();
            }}
            className={`${classes} cursor-pointer hover:text-red-600`}
          >
            {item.label}
          </button>
        </li>
      );
    }

    // EXTERNAL LINK
    if (item.external) {
      return (
        <li key={`${item.label}-${index}`}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            className={classes}
          >
            {item.label}
          </a>
        </li>
      );
    }

    // UNAUTHENTICATED USER
    if (!isAuthenticated) {
      return (
        <li key={`${item.label}-${index}`}>
          <button
            type="button"
            onClick={() => onLoginRequired?.()}
            className={`${classes} cursor-pointer`}
          >
            {item.label}
          </button>
        </li>
      );
    }

    // ITEM WITHOUT HREF
    if (!item.href) {
      return (
        <li key={`${item.label}-${index}`}>
          <button
            type="button"
            onClick={() => onLoginRequired?.()}
            className={`${classes} cursor-pointer`}
          >
            {item.label}
          </button>
        </li>
      );
    }

    // INTERNAL LINK
    return (
      <li key={`${item.label}-${index}`}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={classes}
        >
          {item.label}
        </Link>
      </li>
    );
  };

  // ============================================
  // SIDEBAR
  // ============================================

  return (
    <aside
      className={[
        "flex h-full flex-col bg-white text-black",
        mobile
          ? "relative w-[min(82vw,320px)]"
          : [
              "sticky top-0 hidden h-screen shrink-0",
              "w-[clamp(240px,21.2vw,360px)]",
              "border-r border-neutral-200 md:flex",
            ].join(" "),
      ].join(" ")}
    >
      {/* ACCOUNT BADGE / LOGIN LOCK */}

      <div className="absolute right-8 top-8 z-10 flex h-7 w-7 items-center justify-center">
        {isAuthenticated ? (
          <span
            aria-label={isAdmin ? "Admin account" : "Salesperson account"}
            title={isAdmin ? "Admin" : "Salesperson"}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[11px] font-medium text-white"
          >
            {isAdmin ? "AD" : "DH"}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onLoginRequired?.()}
            aria-label="Login required"
            title="Login"
            className="flex h-7 w-7 items-center justify-center text-black"
          >
            <SvgIcon name="lock" className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* COMPANY LOGO */}

      <div className="pb-10 pt-16">
        <Link
          href={logoHref}
          aria-label={
            isAdmin
              ? "Admin Dashboard"
              : isAuthenticated
                ? "Salesperson Dashboard"
                : "Home"
          }
          onClick={onNavigate}
          className="flex w-full items-center justify-center"
        >
          <SvgIcon
            name="logo"
            className="h-auto w-[222px] max-w-full text-black"
          />
        </Link>
      </div>

      {/* NAVIGATION */}

      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto px-5 pb-5 pt-8 sm:px-7"
      >
        <ul className="space-y-3">{primaryItems.map(renderItem)}</ul>

        {secondaryItems.length > 0 && (
          <div className="mt-10 pt-5">
            <ul className="space-y-1">{secondaryItems.map(renderItem)}</ul>
          </div>
        )}
      </nav>

      {/* SEARCH */}

      <div className="shrink-0 bg-white px-5 pb-7 pt-3 sm:px-7">
        <label
          htmlFor={mobile ? "mobile-sidebar-search" : "sidebar-search"}
          className="sr-only"
        >
          Search navigation
        </label>

        <div className="flex items-center border-b border-neutral-500">
          <input
            id={mobile ? "mobile-sidebar-search" : "sidebar-search"}
            type="search"
            placeholder="Search..."
            className={[
              "min-w-0 flex-1 bg-transparent py-3",
              "text-xs text-black outline-none",
              "placeholder:text-neutral-500",
              "focus-visible:ring-1 focus-visible:ring-black",
            ].join(" ")}
          />

          <SvgIcon name="search" className="size-4 shrink-0 text-neutral-700" />
        </div>
      </div>
    </aside>
  );
}
