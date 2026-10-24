
import DashboardShell from "@/components/layout/dashboard-shell";

export default function DeveloperLayout({ children }) {
  return (
    <DashboardShell role="developer" title="Developer Dashboard">
      {children}
    </DashboardShell>
  );
}
