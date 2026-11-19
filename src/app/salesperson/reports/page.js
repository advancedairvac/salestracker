
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";
import GenerateReportForm from "@/components/dashboard/generateReport-form";

export const metadata = {
  title: "Generate Report | Sales Tracker",
};

export default async function ReportsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "SALESPERSON") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full w-full flex-col">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[{ label: "Sales Tracker", href: "/salesperson" }]}
        currentPage="Generate Report"
      />

      {/* Generate Report Form */}
      <section className="mt-5 w-full sm:mt-6">
        <GenerateReportForm
          isSalesperson={true}
          currentUserName={user.name}
        />
      </section>

      {/* Page Tagline */}
      <div className="mt-auto pt-24">
        <PageTagline>
          Boss yourself around, so no one else has to.
        </PageTagline>
      </div>
    </div>
  );
}
