import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import NewEditOpportunity from "@/components/dashboard/newEdit-opportunity";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Edit Opportunity | Sales Tracker",
};

function formatDateForInput(date) {
  if (!date) return "";

  const value = new Date(date);

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function EditOpportunityPage({ params }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  const { id } = await params;

  const opportunity = await prisma.opportunity.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,
    },
  });

  if (!opportunity) {
    notFound();
  }

  // Only open opportunities can be edited.
  if (opportunity.status !== "OPEN") {
    redirect(`/admin/opportunities/${opportunity.id}`);
  }

  // Get all active salespeople for the Assigned To dropdown.
  const users = await prisma.user.findMany({
    where: {
      role: "SALESPERSON",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const initialValues = {
    opportunityDate: formatDateForInput(opportunity.opportunityDate),
    businessName: opportunity.customer?.businessName || "",
    pocName: opportunity.customer?.pocName || "",
    jobType: opportunity.jobType || "",
    email: opportunity.customer?.email || "",
    textMessage: opportunity.textMessage || "",
    phone: opportunity.customer?.phone || "",
    location: opportunity.customer?.location || "",
    value: Number(opportunity.value || 0),

    // Keep the current assignee selected while editing.
    assignedToId: opportunity.assignedToId,
  };

  const today = formatDateForInput(new Date());

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* BREADCRUMB */}
      <Breadcrumbs
        items={[{ label: "Sales Tracker", href: "/admin" }]}
        currentPage="Edit Opportunity"
      />

      {/* PAGE TITLE */}
      <div>
        <h1 className="text-xl font-semibold text-black">Edit Opportunity</h1>

        <p className="mt-1 text-sm text-neutral-500">
          Update the opportunity and customer information.
        </p>
      </div>

      {/* REUSABLE FORM */}
      <NewEditOpportunity
        user={user}
        users={users}
        today={today}
        mode="edit"
        opportunityId={opportunity.id}
        initialValues={initialValues}
      />

      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
