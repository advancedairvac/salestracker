
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menus = {
  admin: [
    { label: "Overview", href: "/admin" },
    { label: "Users", href: "/admin/users" },
    { label: "Team", href: "/admin/team" },
    { label: "Finance", href: "/admin/finance" },
    { label: "Reports", href: "/admin/reports" },
    { label: "Settings", href: "/admin/settings" },
  ],
  salesperson: [
    { label: "Overview", href: "/salesperson" },
    { label: "Leads", href: "/salesperson/leads" },
    { label: "Customers", href: "/salesperson/customers" },
    { label: "Pipeline", href: "/salesperson/pipeline" },
    { label: "Quotes & Estimates", href: "/salesperson/quotes" },
    { label: "Sales", href: "/salesperson/sales" },
    { label: "Activities", href: "/salesperson/activities" },
  ],
  developer: [
    { label: "Overview", href: "/developer" },
    { label: "System Health", href: "/developer/health" },
    { label: "Integrations", href: "/developer/integrations" },
    { label: "System Logs", href: "/developer/logs" },
    { label: "Project Issues", href: "/developer/issues" },
  ],
};

export default function DashboardSidebar({ role = "admin" }) {
  const pathname = usePathname();
  const items = menus[role] || menus.admin;

  const roleLabels = {
    admin: "Administrator",
    salesperson: "Salesperson",
    developer: "Developer",
  };

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-[#0d0d0d] px-4 py-6 text-white">
      <Link href={`/${role}`} className="mb-8 px-3">
        <span className="text-xl font-bold tracking-tight">
          Advanced<span className="text-[#0690c8]">.</span>
        </span>
        <span className="mt-1 block text-xs text-white/50">
          SALES TRACKER
        </span>
      </Link>

      <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        {roleLabels[role] || "Dashboard"}
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== `/${role}` &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-[#0690c8] font-medium text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4">
        {role === "developer" && (
          <a
            href="https://github.com/advancedairvac/salestracker/issues"
            target="_blank"
            rel="noreferrer"
            className="mb-3 block rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            GitHub Issues ↗
          </a>
        )}

        <Link
          href="/login"
          className="block rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white"
        >
          Sign out
        </Link>
      </div>
    </aside>
  );
}
