import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import { updateOpportunity } from "../actions";

import NewEditOpportunity from "@/components/dashboard/newEdit-opportunity";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Edit Opportunity | Sales Tracker",
};

// ============================================
// DATE HELPER
// ============================================

function formatDateForInput(date) {
  if (!date) return "";

  const value = new Date(date);

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ============================================
// SALESPERSON EDIT OPPORTUNITY PAGE
// ============================================

export default async function EditOpportunityPage({ params }) {
  // ============================================
  // AUTHENTICATION & ROLE VALIDATION
  // ============================================

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "SALESPERSON") {
    if (user.role === "ADMIN") {
      redirect("/admin");
    }

    redirect("/login");
  }

  const { id } = await params;

  // ============================================
  // FETCH OWN OPPORTUNITY ONLY
  // ============================================

  const opportunity = await prisma.opportunity.findFirst({
    where: {
      id,
      assignedToId: user.id,
    },
    include: {
      customer: true,
    },
  });

  if (!opportunity) {
    notFound();
  }

  // ============================================
  // ONLY OPEN OPPORTUNITIES CAN BE EDITED
  // ============================================

  if (opportunity.status !== "OPEN") {
    redirect(`/salesperson/opportunities/${opportunity.id}`);
  }

  // ============================================
  // PREPARE INITIAL FORM VALUES
  // ============================================

  const initialValues = {
    opportunityDate: formatDateForInput(opportunity.opportunityDate),

    stCustomerId: opportunity.customer?.stCustomerId || "",

    businessName: opportunity.customer?.businessName || "",
    pocName: opportunity.customer?.pocName || "",

    jobType: opportunity.jobType || "",

    email: opportunity.customer?.email || "",
    textMessage: opportunity.textMessage || "",
    phone: opportunity.customer?.phone || "",
    location: opportunity.customer?.location || "",

    value: Number(opportunity.value || 0),

    // Salesperson can only keep their own assignment.
    assignedToId: user.id,
  };

  const today = formatDateForInput(new Date());

  // ============================================
  // RENDER PAGE
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* BREADCRUMB */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/salesperson",
          },
          {
            label: "My Opportunities",
            href: "/salesperson/opportunities",
          },
        ]}
        currentPage="Edit Opportunity"
      />

      {/* PAGE TITLE */}

      <div>
        <h1 className="text-xl font-semibold text-black">Edit Opportunity</h1>

        <p className="mt-1 text-sm text-neutral-500">
          Update the opportunity and customer information.
        </p>
      </div>

      {/* SHARED EDIT FORM */}

      <NewEditOpportunity
        user={user}
        today={today}
        mode="edit"
        opportunityId={opportunity.id}
        initialValues={initialValues}
        updateAction={updateOpportunity}
      />

      {/* PAGE TAGLINE */}

      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
