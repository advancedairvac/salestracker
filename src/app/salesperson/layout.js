
import DashboardShell from "@/components/layout/dashboard-shell";

export default function SalespersonLayout({ children }) {
  return (
    <DashboardShell role="salesperson" title="Sales Dashboard">
      {children}
    </DashboardShell>
  );
}
