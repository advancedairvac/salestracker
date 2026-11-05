
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import OpportunityCard from "@/components/dashboard/opportunity-card";

export const metadata = {
  title: "Opportunities | Sales Tracker",
};

export default async function OpportunitiesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  const opportunities = await prisma.opportunity.findMany({
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
        <span className="font-semibold text-black">
          Sales Tracker
        </span>

        <span className="text-[#777]">/</span>

        <span className="text-[#666]">
          Opportunities
        </span>
      </div>

      {/* Page Heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black">
            Opportunities
          </h1>

          <p className="mt-1 text-sm text-[#777]">
            Manage and track all your business opportunities.
          </p>
        </div>

        <p className="text-xs font-medium text-[#777]">
          {opportunities.length} Opportunities
        </p>
      </div>

      {/* Opportunity Cards */}
      {opportunities.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-[#d5d5d5] px-5 text-center">
          <h2 className="text-lg font-bold text-black">
            No Opportunities Found
          </h2>

          <p className="mt-2 max-w-sm text-sm text-[#777]">
            Your opportunities will appear here once you create your first opportunity.
          </p>
        </div>
      )}
    </div>
  );
}
