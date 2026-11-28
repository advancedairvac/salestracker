import { Suspense } from "react";

import { getGoalConfiguration } from "@/lib/date/goal-utils";
import { resolveSelectedDateRange } from "@/lib/dashboard/date-range-helpers";

import {
  getAdminPipelineSectionData,
  getAdminTeamSectionData,
} from "@/lib/dashboard/dashboard-data";

import {
  getPipelineMetrics,
  getTeamMetrics,
} from "@/lib/dashboard/dashboard-metrics";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

import RevenueCard from "@/components/dashboard/revenue-card";
import PipelineCard from "@/components/dashboard/pipeline-card";
import SalesmanCard from "@/components/dashboard/salesman-card";

import TeamCardSkeleton from "@/components/ui/skeleton/team-card-skeleton";

// ============================================
// REVENUE SECTION
// Client cache + summary-only API
// ============================================

function AdminRevenueSection() {
  return (
    <RevenueCard currency="$" />
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

  const sortedTeamData = [...teamData].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "en", {
      sensitivity: "base",
    }),
  );

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
          {sortedTeamData.map((member) => (
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
      {/* BREADCRUMBS */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
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
        basePath="/admin"
      />

      {/* REVENUE AND PIPELINE CARDS */}

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* REVENUE */}

        <Suspense fallback={<RevenueCard />}>
          <AdminRevenueSection start={start} endExclusive={endExclusive} />
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
        fallback={<TeamCardSkeleton />}
      >
        <AdminTeamSection
          start={start}
          endExclusive={endExclusive}
          selectedPreset={selectedPreset}
          selectedStartDate={selectedStartDate}
          selectedEndDate={selectedEndDate}
        />
      </Suspense>

      {/* PAGE TAGLINE */}

      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
