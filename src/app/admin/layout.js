
import DashboardShell from "@/components/layout/dashboard-shell";

export default function AdminLayout({ children }) {
  return (
    <DashboardShell role="admin" title="Admin Dashboard">
      {children}
    </DashboardShell>
  );
}
