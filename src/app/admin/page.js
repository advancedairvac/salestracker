
import {
  getRevenueDateRanges,
} from "@/lib/date/date-utils";

import {
  getGoalConfiguration,
} from "@/lib/date/goal-utils";

import {
  resolveSelectedDateRange,
} from "@/lib/dashboard/date-range-helpers";

import {
  getAdminDashboardData,
} from "@/lib/dashboard/dashboard-data";

import {
  getRevenueMetrics,
  getEstimateMetrics,
  getPipelineMetrics,
  getTeamMetrics,
} from "@/lib/dashboard/dashboard-metrics";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

import RevenueCard from "@/components/dashboard/revenue-card";
import PipelineCard from "@/components/dashboard/pipeline-card";
import SalesmanCard from "@/components/dashboard/salesman-card";

export const metadata = {
  title: "Admin Dashboard",
};

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
  // FETCH DATA
  // ============================================

  const {
    jobs,
    estimates,
    opportunities,
    revenueSales,
    teamMembers,
  } = await getAdminDashboardData({
    start,
    endExclusive,
  });

  // ============================================
  // SALES REVENUE METRICS
  // ServiceTitan Jobs API
  // ============================================

  const {
    todayRevenue,
    monthRevenue,
    yearRevenue,
  } = getRevenueMetrics({
    jobs,
    dateRanges: revenueDateRanges,
  });

  // ============================================
  // ESTIMATE METRICS
  // ============================================

  const {
    totalEstimates,
  } = getEstimateMetrics({
    estimates,
    start,
    endExclusive,
  });

  // ============================================
  // PIPELINE METRICS
  // ============================================

  const {
    totalOpportunities,
    pipelineValue,
  } = getPipelineMetrics(opportunities);

  // ============================================
  // TEAM PERFORMANCE METRICS
  // ============================================

  const teamData = getTeamMetrics({
    teamMembers,
    goalType: goalConfiguration.goalType,
    revenueSales,
    opportunities,
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

      {/* SALES TEAM PERFORMANCE */}

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

      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
