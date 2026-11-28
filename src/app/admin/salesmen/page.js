
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getAuthenticatedUser } from "@/lib/auth";

import { getInitialRange } from "@/lib/date/date-utils";
import { getGoalConfiguration } from "@/lib/date/goal-utils";

import {
  getSalesmenPageTeamMembers,
  getDashboardOpportunities,
  getDashboardRevenueSales,
} from "@/lib/dashboard/dashboard-data";

import { getTeamMetrics } from "@/lib/dashboard/dashboard-metrics";
import { getOpportunityCloseRateStats } from "@/lib/dashboard/opportunity-close-rate";

import Tabs from "@/components/ui/tabs";
import SalesmanCard from "@/components/dashboard/salesman-card";
import TeamCardSkeleton from "@/components/ui/skeleton/team-card-skeleton";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Sales Team | Sales Tracker",
};

// ============================================
// SALESMEN PERFORMANCE SECTION
// ============================================

async function SalesmenPerformanceSection({
  start,
  endExclusive,
  goalType,
}) {
  // ============================================
  // FETCH DATA
  // ============================================

  const [teamMembers, revenueSales, opportunities] =
    await Promise.all([
      getSalesmenPageTeamMembers(),

      getDashboardRevenueSales({
        start,
        endExclusive,
      }),

      getDashboardOpportunities({
        start,
        endExclusive,
      }),
    ]);

  // ============================================
  // SORT TEAM MEMBERS
  // Admins first, then alphabetical
  // ============================================

  const sortedTeamMembers = [...teamMembers].sort((a, b) => {
    if (a.role === "ADMIN" && b.role !== "ADMIN") {
      return -1;
    }

    if (a.role !== "ADMIN" && b.role === "ADMIN") {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });

  // ============================================
  // TEAM PERFORMANCE METRICS
  // ============================================

  const performanceData = getTeamMetrics({
    teamMembers: sortedTeamMembers,
    goalType,
    revenueSales,
    opportunities,
    closeRateByMember: await getOpportunityCloseRateStats({
      memberIds: sortedTeamMembers.map((member) => member.id),
      start,
      endExclusive,
    }),
  });

  // ============================================
  // PRESERVE STATUS
  // ============================================

  const statusByMemberId = new Map(
    sortedTeamMembers.map((member) => [
      member.id,
      member.status,
    ])
  );

  const salesmanPerformance = performanceData.map(
    (salesman) => ({
      ...salesman,
      status: statusByMemberId.get(salesman.id),
    })
  );

  // ============================================
  // FILTER SALESMEN
  // ============================================

  const activeSalesmen = salesmanPerformance.filter(
    (salesman) => salesman.status === "ACTIVE"
  );

  const invitedSalesmen = salesmanPerformance.filter(
    (salesman) => salesman.status === "INVITED"
  );

  const terminatedSalesmen = salesmanPerformance.filter(
    (salesman) => salesman.status === "TERMINATED"
  );

  // ============================================
  // TAB CONFIGURATION
  // ============================================

  const tabs = [
    {
      id: "ACTIVE",
      label: "Active",
      count: activeSalesmen.length,
    },
    {
      id: "INVITED",
      label: "Invited",
      count: invitedSalesmen.length,
    },
    {
      id: "TERMINATED",
      label: "Terminated",
      count: terminatedSalesmen.length,
    },
    {
      id: "ALL",
      label: "All",
      count: salesmanPerformance.length,
    },
  ];

  // ============================================
  // SALESMEN CARD RENDERER
  // ============================================

  const renderSalesmen = (salesmen) => {
    if (!salesmen.length) {
      return (
        <div className="border border-[#d5d5d5] bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-[#555]">
            No salesmen found.
          </p>

          <p className="mt-1 text-xs text-[#888]">
            There are no members in this category yet.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {salesmen.map((salesman) => (
          <SalesmanCard
            key={salesman.id}
            id={salesman.id}
            name={salesman.name}
            title={salesman.title}
            revenue={salesman.revenue}
            commission={salesman.commission}
            monthlyGoal={salesman.monthlyGoal}
            opportunities={salesman.opportunities}
            closeRate={salesman.closeRate}
            href={`/admin/salesmen/${salesman.id}`}
          />
        ))}
      </div>
    );
  };

  // ============================================
  // TAB CONTENT
  // ============================================

  const panels = {
    ACTIVE: renderSalesmen(activeSalesmen),

    INVITED: renderSalesmen(invitedSalesmen),

    TERMINATED: renderSalesmen(terminatedSalesmen),

    ALL: renderSalesmen(salesmanPerformance),
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <Tabs
      tabs={tabs}
      defaultTab="ACTIVE"
      countLabel="Members"
      panels={panels}
    />
  );
}

// ============================================
// SALESMEN PAGE
// ============================================

export default async function SalesmenPage() {
  // ============================================
  // AUTHENTICATION
  // ============================================

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/salesperson");
  }

  // ============================================
  // DEFAULT DATE RANGE (MTD)
  // ============================================

  const defaultRange = getInitialRange();

  const [startYear, startMonth, startDay] =
    defaultRange.startDate.split("-").map(Number);

  const [endYear, endMonth, endDay] =
    defaultRange.endDate.split("-").map(Number);

  const start = new Date(
    startYear,
    startMonth - 1,
    startDay
  );

  const endExclusive = new Date(
    endYear,
    endMonth - 1,
    endDay + 1
  );

  // ============================================
  // GOAL CONFIGURATION
  // ============================================

  const goalConfiguration = getGoalConfiguration(
    "MTD",
    defaultRange.startDate,
    defaultRange.endDate
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex min-h-full w-full flex-col space-y-4 sm:space-y-5">
      {/* BREADCRUMB */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
        ]}
        currentPage="Salesmen"
      />

      {/* SALESMEN PERFORMANCE */}

      <Suspense fallback={<TeamCardSkeleton count={3} />}>
        <SalesmenPerformanceSection
          start={start}
          endExclusive={endExclusive}
          goalType={goalConfiguration.goalType}
        />
      </Suspense>

      {/* PAGE TAGLINE */}

      <div className="mt-auto pt-16">
        <PageTagline>
          Iron sharpens iron, as one man sharpens another.
        </PageTagline>
      </div>
    </div>
  );
}
