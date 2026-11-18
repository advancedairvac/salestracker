import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import { updateSalesman } from "../../new/actions";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";
import NewEditSalesman from "@/components/dashboard/newEdit-salesman";

export const metadata = {
  title: "Edit Salesman | Sales Tracker",
};

export default async function EditSalesmanPage({ params }) {
  const user = await getAuthenticatedUser();

  // Only ADMIN can access this page
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  const { id: salesmanId } = await params;

  if (!salesmanId) {
    notFound();
  }

  // Find the SALESPERSON to edit
  const salesman = await prisma.user.findFirst({
    where: {
      id: salesmanId,
      role: {
        in: ["ADMIN", "SALESPERSON"],
      },
    },
    select: {
      id: true,
      name: true,
      title: true,
      email: true,
      monthlyGoal: true,
      quarterlyGoal: true,
      annualGoal: true,
    },
  });

  if (!salesman) {
    notFound();
  }

  // Prepare existing values
  const initialValues = {
    name: salesman.name || "",
    title: salesman.title || "",
    email: salesman.email || "",
    monthlyGoal: salesman.monthlyGoal?.toString() ?? "",
    quarterlyGoal: salesman.quarterlyGoal?.toString() ?? "",
    annualGoal: salesman.annualGoal?.toString() ?? "",
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Breadcrumb */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
          {
            label: "Salesmen",
            href: "/admin/salesmen",
          },
        ]}
        currentPage="Edit Salesman"
      />

      {/* Page Heading */}

      <div>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black">
          Edit Salesman
        </h1>

        <p className="mt-1 text-sm text-[#777777]">
          Update salesman information and sales goals.
        </p>
      </div>

      {/* Edit Salesman Form */}

      <section className="mt-5 flex w-full flex-1 flex-col sm:mt-6">
        <NewEditSalesman
          mode="edit"
          salesmanId={salesman.id}
          initialValues={initialValues}
          onSubmit={updateSalesman}
        />
      </section>

      {/* Page Tagline */}

      <PageTagline>
        Great teams are built one great person at a time.
      </PageTagline>
    </div>
  );
}
