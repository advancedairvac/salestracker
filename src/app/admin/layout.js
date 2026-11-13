import { redirect } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function AdminLayout({ children }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/salesperson");
  }

  return (
    <AppShell role="admin" isAuthenticated={true}>
      {children}
    </AppShell>
  );
}