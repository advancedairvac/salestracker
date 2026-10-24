
"use client";

export default function DashboardHeader({ title = "Dashboard", role = "admin" }) {
  const roleLabels = {
    admin: "Administrator",
    salesperson: "Salesperson",
    developer: "Developer",
  };

  return (
    <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-white px-5 py-4 sm:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#0d0d0d]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Advanced Sales Tracker
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden rounded-full bg-[#f2f2f2] px-3 py-2 text-xs font-medium text-gray-600 sm:inline-flex">
          Demo Mode
        </span>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0d0d0d] text-sm font-semibold text-white">
          {(roleLabels[role] || "User").slice(0, 1)}
        </div>

        <div>
          <p className="text-sm font-medium text-[#0d0d0d]">
            {roleLabels[role] || "User"}
          </p>
          <p className="text-xs text-gray-500">Demo Account</p>
        </div>
      </div>
    </header>
  );
}
