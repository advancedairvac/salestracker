import { redirect } from "next/navigation";

import AppShell from "@/components/layout/app-shell";
import CustomerCacheInitializer from "@/components/cache/customer-cache-initializer";
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
    <>
      <CustomerCacheInitializer />
      <AppShell role="salesperson" user={user}>
        {children}
      </AppShell>
    </>
  );
}