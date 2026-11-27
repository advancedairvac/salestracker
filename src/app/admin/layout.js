import { redirect } from "next/navigation";

import AppShell from "@/components/layout/app-shell";
import CustomerCacheInitializer from "@/components/cache/customer-cache-initializer";
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
    <>
      <CustomerCacheInitializer />
      <AppShell role="admin" user={user}>
        {children}
      </AppShell>
    </>
  );
}