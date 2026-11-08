
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
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

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ["ADMIN", "SALESPERSON"],
      },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="flex min-h-full w-full flex-col">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: "Sales Tracker", href: "/admin" },
        ]}
        currentPage="Generate Report"
      />

      {/* Generate Report Form */}
      <section className="mt-5 w-full sm:mt-6">
        <GenerateReportForm users={users} />
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
