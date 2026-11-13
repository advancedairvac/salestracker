import { Suspense } from "react";

import { getGoalConfiguration } from "@/lib/date/goal-utils";

import { resolveSelectedDateRange } from "@/lib/dashboard/date-range-helpers";

import {
  getAdminRevenueSectionData,
  getAdminPipelineSectionData,
  getAdminTeamSectionData,
} from "@/lib/dashboard/dashboard-data";

import {
  getRevenueMetrics,
  getPipelineMetrics,
  getTeamMetrics,
} from "@/lib/dashboard/dashboard-metrics";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

import RevenueCard from "@/components/dashboard/revenue-card";
import PipelineCard from "@/components/dashboard/pipeline-card";
import SalesmanCard from "@/components/dashboard/salesman-card";

import Skeleton from "@/components/ui/skeleton/skeleton";

// ============================================
// REVENUE SECTION
// ServiceTitan Jobs API
// ============================================

async function AdminRevenueSection() {
  const { jobs, revenueDateRanges } = await getAdminRevenueSectionData();

  const { todayRevenue, monthRevenue, yearRevenue } = getRevenueMetrics({
    jobs,
    dateRanges: revenueDateRanges,
  });

  return (
    <RevenueCard
      today={todayRevenue}
      mtd={monthRevenue}
      ytd={yearRevenue}
      currency="$"
    />
  );
}

// ============================================
// PIPELINE SECTION
// ServiceTitan Estimates API + Prisma
// ============================================

async function AdminPipelineSection({ start, endExclusive }) {
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
    />
  );
}

// ============================================
// TEAM SECTION
// Prisma + ServiceTitan Jobs
// ============================================

async function AdminTeamSection({
  start,
  endExclusive,
  selectedPreset,
  selectedStartDate,
  selectedEndDate,
}) {
  const { teamMembers, revenueSales, opportunities } =
    await getAdminTeamSectionData({
      start,
      endExclusive,
    });

  const goalConfiguration = getGoalConfiguration(
    selectedPreset,
    selectedStartDate,
    selectedEndDate,
  );

  const teamData = getTeamMetrics({
    teamMembers,
    goalType: goalConfiguration.goalType,
    revenueSales,
    opportunities,
  });

  return (
    <section className="mt-12 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
          Sales Team Performance
        </h2>

        <span className="shrink-0 text-xs text-[#777]">
          {teamData.length} Team Members
        </span>
      </div>

      {teamData.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {teamData.map((member) => (
            <SalesmanCard
              key={member.id}
              id={member.id}
              name={member.name}
              title={member.title}
              revenue={member.revenue}
              commission={member.commission}
              monthlyGoal={member.monthlyGoal}
              opportunities={member.opportunities}
              closeRate={member.closeRate}
              href={`/admin/salesmen/${member.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="border border-[#d5d5d5] bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-[#555]">
            No active team members found.
          </p>
        </div>
      )}
    </section>
  );
}

// ============================================
// SALES TEAM SKELETON
// Preserve Card Structure
// ============================================

function SalesTeamSkeleton() {
  return (
    <section
      className="mt-12 space-y-3"
      aria-label="Loading sales team"
      aria-busy="true"
      role="status"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
          Sales Team Performance
        </h2>

        <Skeleton width="85px" height="12px" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="border border-[#d5d5d5] bg-white p-4 sm:p-[18px]"
          >
            {/* NAME AND TITLE */}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton width="150px" height="18px" />
                <Skeleton width="110px" height="12px" />
              </div>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6 shrink-0 text-[#555]"
                aria-hidden="true"
              >
                <path
                  d="M9 5L16 12L9 19"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* PERFORMANCE METRICS */}

            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton width="55px" height="15px" />
                <Skeleton width="45px" height="15px" />
                <Skeleton width="40px" height="15px" />
              </div>

              <Skeleton width="36px" height="36px" circle />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// ADMIN DASHBOARD
// ============================================

export default async function AdminDashboardPage({ searchParams }) {
  const params = await searchParams;

  // ============================================
  // SELECTED DATE RANGE
  // ============================================

  const {
    selectedStartDate,
    selectedEndDate,
    selectedPreset,
    start,
    endExclusive,
  } = resolveSelectedDateRange(params);

  // ============================================
  // RENDER DASHBOARD
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* STATIC BREADCRUMBS */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
        ]}
        currentPage="Dashboard"
      />

      {/* STATIC DATE FILTER */}

      <RevenueDateFilter
        value={{
          startDate: selectedStartDate,
          endDate: selectedEndDate,
        }}
        preset={selectedPreset}
        basePath="/admin"
      />

      {/* REVENUE AND PIPELINE CARDS */}



      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* REVENUE */}

<Suspense fallback={<RevenueCard loading />}>
  <AdminRevenueSection
    start={start}
    endExclusive={endExclusive}
  />
</Suspense>

        {/* PIPELINE */}

        <Suspense
          key={`pipeline-${selectedStartDate}-${selectedEndDate}`}
          fallback={<PipelineCard loading />}
        >
          <AdminPipelineSection start={start} endExclusive={endExclusive} />
        </Suspense>
      </section>

      {/* SALES TEAM PERFORMANCE */}

      <Suspense
        key={`team-${selectedStartDate}-${selectedEndDate}`}
        fallback={<SalesTeamSkeleton />}
      >
        <AdminTeamSection
          start={start}
          endExclusive={endExclusive}
          selectedPreset={selectedPreset}
          selectedStartDate={selectedStartDate}
          selectedEndDate={selectedEndDate}
        />
      </Suspense>

      {/* STATIC PAGE TAGLINE */}

      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
