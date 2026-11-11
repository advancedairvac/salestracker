import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { getRevenueDateRanges } from "@/lib/date/date-utils";

import { getGoalConfiguration } from "@/lib/date/goal-utils";

import { resolveSelectedDateRange } from "@/lib/dashboard/date-range-helpers";

import { getSalespersonDashboardData } from "@/lib/dashboard/dashboard-data";

import {
  getRevenueMetrics,
  getEstimateMetrics,
  getPipelineMetrics,
  getSalespersonMetrics,
} from "@/lib/dashboard/dashboard-metrics";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

import RevenueCard from "@/components/dashboard/revenue-card";
import PipelineCard from "@/components/dashboard/pipeline-card";
import SalesmanCard from "@/components/dashboard/salesman-card";

export const metadata = {
  title: "Salesperson Dashboard",
};

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
  // REVENUE CARD DATE RANGES
  // Independent of DateSelector
  // ============================================

  const revenueDateRanges = getRevenueDateRanges();

  // ============================================
  // GOAL CONFIGURATION
  // ============================================

  const goalConfiguration = getGoalConfiguration(
    selectedPreset,
    selectedStartDate,
    selectedEndDate,
  );

  // ============================================
  // FETCH DASHBOARD DATA
  // ============================================

  const { jobs, estimates, opportunities, ownOpportunities, revenueSales } =
    await getSalespersonDashboardData({
      start,
      endExclusive,
      salesmanId: user.id,
    });

  // ============================================
  // REVENUE METRICS
  // Company-wide ServiceTitan Jobs API
  // ============================================

  const { todayRevenue, monthRevenue, yearRevenue } = getRevenueMetrics({
    jobs,
    dateRanges: revenueDateRanges,
  });

  // ============================================
  // ESTIMATE METRICS
  // Company-wide Estimates
  // ============================================

  const { totalEstimates } = getEstimateMetrics({
    estimates,
    start,
    endExclusive,
  });

  // ============================================
  // PIPELINE METRICS
  // Company-wide Opportunities
  // ============================================

  const { totalOpportunities, pipelineValue } =
    getPipelineMetrics(opportunities);

  // ============================================
  // SALESPERSON PERFORMANCE
  // Individual Revenue & Opportunities
  // ============================================

  const salespersonData = getSalespersonMetrics({
    user,
    revenueSales,
    opportunities: ownOpportunities,
    goalType: goalConfiguration.goalType,
  });

  // ============================================
  // RENDER DASHBOARD
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-5">
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
        <RevenueCard
          today={todayRevenue}
          mtd={monthRevenue}
          ytd={yearRevenue}
          currency="$"
        />

        <PipelineCard
          opportunities={totalOpportunities}
          estimates={totalEstimates}
          pipelineValue={pipelineValue}
        />
      </section>

      {/* MY PERFORMANCE */}

      <section className="mt-12 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
            My Performance
          </h2>

          <span className="shrink-0 text-xs text-[#777]">
            My Sales Overview
          </span>
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
              href="/salesperson/profile"
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

      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
