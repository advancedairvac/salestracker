import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { getGoalConfiguration } from "@/lib/date/goal-utils";
import { resolveSelectedDateRange } from "@/lib/dashboard/date-range-helpers";

import {
  getAdminPipelineSectionData,
  getDashboardRevenueSales,
  getDashboardOpportunities,
} from "@/lib/dashboard/dashboard-data";

import {
  getPipelineMetrics,
  getSalespersonMetrics,
} from "@/lib/dashboard/dashboard-metrics";
import { getOpportunityCloseRateStats } from "@/lib/dashboard/opportunity-close-rate";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

import RevenueCard from "@/components/dashboard/revenue-card";
import PipelineCard from "@/components/dashboard/pipeline-card";
import SalesmanCard from "@/components/dashboard/salesman-card";

import TeamCardSkeleton from "@/components/ui/skeleton/team-card-skeleton";

export const metadata = {
  title: "Salesperson Dashboard",
};

// ============================================
// REVENUE SECTION
// Client cache + summary-only API
// ============================================

function SalespersonRevenueSection() {
  return (
    <RevenueCard
      currency="$"
      href="/salesperson/sales-revenue"
    />
  );
}

// ============================================
// PIPELINE SECTION
// Company-wide Estimates + Opportunities
// ============================================

async function SalespersonPipelineSection({ start, endExclusive }) {
  const { estimateSummary, opportunities } = await getAdminPipelineSectionData({
    start,
    endExclusive,
  });

  const { totalOpportunities } = getPipelineMetrics(opportunities);

  return (
    <PipelineCard
      opportunities={totalOpportunities}
      estimateCount={estimateSummary?.totalCount ?? 0}
      estimateValue={estimateSummary?.totalValue ?? 0}
      currency="$"
      href="/salesperson/pipeline"
    />
  );
}

// ============================================
// MY PERFORMANCE SECTION
// Individual Revenue + Opportunities
// ============================================

async function SalespersonPerformanceSection({
  user,
  start,
  endExclusive,
  goalType,
}) {
  const [revenueSales, opportunities, closeRateByMember] = await Promise.all([
    getDashboardRevenueSales({
      start,
      endExclusive,
      salesmanId: user.id,
    }),

    getDashboardOpportunities({
      start,
      endExclusive,
      salesmanId: user.id,
    }),

    getOpportunityCloseRateStats({
      memberIds: [user.id],
      start,
      endExclusive,
    }),
  ]);

  const salespersonData = getSalespersonMetrics({
    user,
    revenueSales,
    opportunities,
    goalType,
    closeRateStats: closeRateByMember.get(user.id),
  });

  return (
    <section className="mt-12 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
          My Performance
        </h2>

        <span className="shrink-0 text-xs text-[#777]">My Sales Overview</span>
      </div>

      {salespersonData ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          <SalesmanCard
            id={salespersonData.id}
            name={salespersonData.name}
            title={salespersonData.title}
            revenue={salespersonData.revenue}
            commission={salespersonData.commission}
            monthlyGoal={salespersonData.monthlyGoal}
            opportunities={salespersonData.opportunities}
            closeRate={salespersonData.closeRate}
            href={`/salesperson/salesmen/${salespersonData.id}`}
          />
        </div>
      ) : (
        <div className="border border-[#d5d5d5] bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-[#555]">
            Unable to load your performance data.
          </p>
        </div>
      )}
    </section>
  );
}

// ============================================
// SALESPERSON DASHBOARD
// ============================================

export default async function SalespersonDashboardPage({ searchParams }) {
  // ============================================
  // AUTHENTICATION & ROLE VALIDATION
  // ============================================

  const authenticatedUser = await getAuthenticatedUser();

  if (!authenticatedUser) {
    redirect("/login");
  }

  if (authenticatedUser.role === "ADMIN") {
    redirect("/admin");
  }

  if (authenticatedUser.role !== "SALESPERSON") {
    redirect("/login");
  }

  // ============================================
  // FETCH SALESPERSON PROFILE
  // ============================================

  const user = await prisma.user.findUnique({
    where: {
      id: authenticatedUser.id,
    },

    select: {
      id: true,
      name: true,
      title: true,
      role: true,
      monthlyGoal: true,
      quarterlyGoal: true,
      annualGoal: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  // ============================================
  // SELECTED DATE RANGE
  // ============================================

  const params = await searchParams;

  const {
    selectedStartDate,
    selectedEndDate,
    selectedPreset,
    start,
    endExclusive,
  } = resolveSelectedDateRange(params);

  // ============================================
  // GOAL CONFIGURATION
  // ============================================

  const goalConfiguration = getGoalConfiguration(
    selectedPreset,
    selectedStartDate,
    selectedEndDate,
  );

  // ============================================
  // RENDER DASHBOARD
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* BREADCRUMBS */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/salesperson",
          },
        ]}
        currentPage="Dashboard"
      />

      {/* DATE FILTER */}

      <RevenueDateFilter
        value={{
          startDate: selectedStartDate,
          endDate: selectedEndDate,
        }}
        preset={selectedPreset}
        basePath="/salesperson"
      />

      {/* REVENUE AND PIPELINE CARDS */}

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* REVENUE */}

        <Suspense fallback={<RevenueCard href="/salesperson/sales-revenue" />}>
          <SalespersonRevenueSection />
        </Suspense>

        {/* PIPELINE */}

        <Suspense
          key={`pipeline-${selectedStartDate}-${selectedEndDate}`}
          fallback={<PipelineCard loading />}
        >
          <SalespersonPipelineSection
            start={start}
            endExclusive={endExclusive}
          />
        </Suspense>
      </section>

      {/* MY PERFORMANCE */}

      <Suspense
        key={`performance-${selectedStartDate}-${selectedEndDate}`}
        fallback={<TeamCardSkeleton count={1} />}
      >
        <SalespersonPerformanceSection
          user={user}
          start={start}
          endExclusive={endExclusive}
          goalType={goalConfiguration.goalType}
        />
      </Suspense>

      {/* PAGE TAGLINE */}

      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
