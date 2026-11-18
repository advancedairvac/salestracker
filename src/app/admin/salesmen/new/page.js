import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";

import { createSalesman, resendSalesmanInvitation } from "./actions";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";
import NewEditSalesman from "@/components/dashboard/newEdit-salesman";

export const metadata = {
  title: "New Salesman | Sales Tracker",
};

export default async function NewSalesmanPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
        ]}
        currentPage="New Salesman"
      />

      <div>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black">
          New Salesman
        </h1>

        <p className="mt-1 text-sm text-[#777777]">
          Add a new salesman, set their sales goals, and send an invitation to
          complete account registration.
        </p>
      </div>

      <section className="mt-5 flex w-full flex-1 flex-col sm:mt-6">
        <NewEditSalesman
          onSubmit={createSalesman}
          onResendInvitation={resendSalesmanInvitation}
        />
      </section>

      <PageTagline>
        Great teams are built one great person at a time.
      </PageTagline>
    </div>
  );
}
