
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import Tabs from "@/components/ui/tabs";

import OpportunityCard from "@/components/dashboard/opportunity-card";
import OpportunityCardSkeleton from "@/components/ui/skeleton/opportunity-card-skeleton";

export const metadata = {
  title: "Opportunities | Sales Tracker",
};

// ============================================
// OPPORTUNITIES CONTENT
// ============================================

async function OpportunitiesContent() {
  // ============================================
  // FETCH OPPORTUNITIES
  // ============================================

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

  // ============================================
  // FILTER OPPORTUNITIES
  // ============================================

  const openOpportunities = opportunities.filter(
    (opportunity) => opportunity.status === "OPEN"
  );

  const wonOpportunities = opportunities.filter(
    (opportunity) => opportunity.status === "WON"
  );

  const lostOpportunities = opportunities.filter(
    (opportunity) => opportunity.status === "LOST"
  );

  const reopenOpportunities = opportunities.filter(
    (opportunity) =>
      opportunity.status === "SCHEDULED_TO_REOPEN"
  );

  // ============================================
  // TABS
  // ============================================

  const tabs = [
    {
      id: "OPEN",
      label: "Open",
      count: openOpportunities.length,
    },
    {
      id: "WON",
      label: "Won",
      count: wonOpportunities.length,
    },
    {
      id: "LOST",
      label: "Lost",
      count: lostOpportunities.length,
    },
    {
      id: "REOPEN",
      label: "Reopen",
      count: reopenOpportunities.length,
    },
    {
      id: "ALL",
      label: "All",
      count: opportunities.length,
    },
  ];

  // ============================================
  // OPPORTUNITY CARDS
  // ============================================

  const renderOpportunities = (items) => {
    if (items.length === 0) {
      return (
        <div className="border border-[#d5d5d5] bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-[#555]">
            No opportunities found.
          </p>

          <p className="mt-1 text-xs text-[#888]">
            There are no opportunities in this category yet.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {items.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            role="ADMIN"
          />
        ))}
      </div>
    );
  };

  // ============================================
  // TAB PANELS
  // ============================================

  const panels = {
    OPEN: renderOpportunities(openOpportunities),
    WON: renderOpportunities(wonOpportunities),
    LOST: renderOpportunities(lostOpportunities),
    REOPEN: renderOpportunities(reopenOpportunities),
    ALL: renderOpportunities(opportunities),
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <Tabs
      tabs={tabs}
      defaultTab="OPEN"
      countLabel="Opportunities"
      panels={panels}
    />
  );
}

// ============================================
// OPPORTUNITIES PAGE
// ============================================

export default async function OpportunitiesPage() {
  // ============================================
  // AUTHENTICATION
  // ============================================

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* BREADCRUMBS */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
        ]}
        currentPage="Opportunities"
      />

      {/* PAGE HEADER */}

      {/* OPPORTUNITIES */}

      <Suspense
        fallback={<OpportunityCardSkeleton count={6} />}
      >
        <OpportunitiesContent />
      </Suspense>
    </div>
  );
}
