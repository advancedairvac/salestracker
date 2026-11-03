
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function SalespersonLayout({ children }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "SALESPERSON") {
    redirect("/admin");
  }

  return (
    <AppShell role="salesperson" isAuthenticated={true}>
      {children}
    </AppShell>
  );
}
