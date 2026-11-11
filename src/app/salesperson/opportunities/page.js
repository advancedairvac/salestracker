
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import OpportunityCard from "@/components/dashboard/opportunity-card";

export const metadata = {
  title: "My Opportunities | Sales Tracker",
};

// ============================================
// SALESPERSON OPPORTUNITIES
// ============================================

export default async function OpportunitiesPage() {
  // ============================================
  // AUTHENTICATION & ROLE VALIDATION
  // ============================================

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    redirect("/admin/opportunities");
  }

  if (user.role !== "SALESPERSON") {
    redirect("/login");
  }

  // ============================================
  // FETCH OWN OPPORTUNITIES ONLY
  // ============================================

  const opportunities = await prisma.opportunity.findMany({
    where: {
      assignedToId: user.id,
    },

    include: {
      customer: {
        select: {
          businessName: true,
          pocName: true,
        },
      },

      assignedTo: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },

    orderBy: {
      opportunityDate: "desc",
    },
  });

  // ============================================
  // RENDER PAGE
  // ============================================

  return (
    <div className="space-y-6">
      {/* BREADCRUMB */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/salesperson",
          },
        ]}
        currentPage="My Opportunities"
      />

      {/* PAGE HEADING */}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black">
            My Opportunities
          </h1>

          <p className="mt-1 text-sm text-[#777]">
            View and manage your assigned business opportunities.
          </p>
        </div>

        <p className="text-xs font-medium text-[#777]">
          {opportunities.length} Opportunities
        </p>
      </div>

      {/* OPPORTUNITY CARDS */}

      {opportunities.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              role="SALESPERSON"
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-[#d5d5d5] px-5 text-center">
          <h2 className="text-lg font-bold text-black">
            No Opportunities Found
          </h2>

          <p className="mt-2 max-w-sm text-sm text-[#777]">
            Your assigned opportunities will appear here once they are available.
          </p>
        </div>
      )}
    </div>
  );
}
