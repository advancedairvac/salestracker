
import DashboardSidebar from "./dashboard-sidebar";
import DashboardHeader from "./dashboard-header";

export default function DashboardShell({
  role = "admin",
  title = "Dashboard",
  children,
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fb] md:flex">
      <div className="md:sticky md:top-0 md:h-screen">
        <DashboardSidebar role={role} />
      </div>

      <div className="min-w-0 flex-1">
        <DashboardHeader title={title} role={role} />

        <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8">
          {children}
        </main>

        <footer className="border-t border-black/5 px-5 py-5 text-center text-xs text-gray-500 sm:px-8">
          Advanced Sales Tracker · Demo Environment
        </footer>
      </div>
    </div>
  );
}
