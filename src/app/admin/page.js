import { prisma } from "@/lib/prisma";

import { getAllJobs, getAllEstimates } from "@/lib/integrations/servicetitan";

import { PRESETS, getInitialRange } from "@/lib/date/date-utils";

import { getGoalConfiguration, calculateTeamGoal } from "@/lib/date/goal-utils";

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
// DATE HELPERS
// ============================================

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getDateRange(startDate, endDate) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  return {
    start: new Date(startYear, startMonth - 1, startDay),
    endExclusive: new Date(endYear, endMonth - 1, endDay + 1),
  };
}

function isWithinRange(dateValue, start, endExclusive) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);

  return !Number.isNaN(date.getTime()) && date >= start && date < endExclusive;
}

// ============================================
// SERVICETITAN JOB HELPERS
// ============================================

function getJobValue(job) {
  const value = Number(job.total);

  return Number.isFinite(value) ? value : 0;
}

function isCompletedJob(job) {
  return (
    String(job.jobStatus || "").toLowerCase() === "completed" &&
    Boolean(job.completedOn)
  );
}

function calculateJobRevenue(jobs) {
  return jobs.reduce((total, job) => total + getJobValue(job), 0);
}

// ============================================
// DATABASE SALE HELPERS
// ============================================

function getSaleValue(sale) {
  const value = Number(sale.saleValue || 0);

  return Number.isFinite(value) ? value : 0;
}

// ============================================
// ADMIN DASHBOARD
// ============================================

export default async function AdminDashboardPage({ searchParams }) {
  const params = await searchParams;

  // ============================================
  // SELECTED DATE RANGE
  // ============================================

  const defaultRange = getInitialRange();

  const requestedStartDate =
    typeof params?.startDate === "string"
      ? params.startDate
      : defaultRange.startDate;

  const requestedEndDate =
    typeof params?.endDate === "string" ? params.endDate : defaultRange.endDate;

  const validRange =
    isValidDateString(requestedStartDate) &&
    isValidDateString(requestedEndDate) &&
    requestedStartDate <= requestedEndDate;

  const selectedStartDate = validRange
    ? requestedStartDate
    : defaultRange.startDate;

  const selectedEndDate = validRange ? requestedEndDate : defaultRange.endDate;

  const requestedPreset =
    typeof params?.preset === "string" ? params.preset : "MTD";

  const selectedPreset = PRESETS.includes(requestedPreset)
    ? requestedPreset
    : "MTD";

  const { start, endExclusive } = getDateRange(
    selectedStartDate,
    selectedEndDate,
  );

  // ============================================
  // REVENUE CARD DATE RANGES
  // Independent of DateSelector
  // ============================================

  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tomorrowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const yearStart = new Date(now.getFullYear(), 0, 1);

  const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);

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

  const [allJobs, allEstimates, opportunities, revenueSales, teamMembers] =
    await Promise.all([
      // Company Revenue from ServiceTitan Jobs API
      getAllJobs({
        pageSize: 100,
        maxPages: 100,
      }),

      // ServiceTitan Estimates
      getAllEstimates({
        pageSize: 100,
        maxPages: 10,
      }),

      // CRM Opportunities
      prisma.opportunity.findMany({
        where: {
          opportunityDate: {
            gte: start,
            lt: endExclusive,
          },
        },

        select: {
          id: true,
          assignedToId: true,
          value: true,
          status: true,
        },
      }),

      // Assigned Sales Revenue from PostgreSQL
      // Used only for individual team performance
      prisma.sale.findMany({
        where: {
          saleValue: {
            gt: 0,
          },

          completedAt: {
            gte: start,
            lt: endExclusive,
          },

          salesmanId: {
            not: null,
          },
        },

        select: {
          id: true,
          saleValue: true,
          completedAt: true,
          salesmanId: true,
        },
      }),

      // Active Admins and Salespersons
      prisma.user.findMany({
        where: {
          role: {
            in: ["ADMIN", "SALESPERSON"],
          },

          isActive: true,
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

        orderBy: {
          name: "asc",
        },
      }),
    ]);

  // ============================================
  // FILTER COMPLETED SERVICETITAN JOBS
  // ============================================

  const completedJobs = allJobs.filter((job) => {
    return isCompletedJob(job) && getJobValue(job) > 0;
  });

  // ============================================
  // SALES REVENUE CARD
  // Data from ServiceTitan Jobs API
  // ============================================

  const todayJobs = completedJobs.filter((job) =>
    isWithinRange(job.completedOn, todayStart, tomorrowStart),
  );

  const monthJobs = completedJobs.filter((job) =>
    isWithinRange(job.completedOn, monthStart, nextMonthStart),
  );

  const yearJobs = completedJobs.filter((job) =>
    isWithinRange(job.completedOn, yearStart, nextYearStart),
  );

  const todayRevenue = calculateJobRevenue(todayJobs);
  const monthRevenue = calculateJobRevenue(monthJobs);
  const yearRevenue = calculateJobRevenue(yearJobs);

  // ============================================
  // FILTER ESTIMATES BY CREATED DATE
  // ============================================

  const selectedPeriodEstimates = allEstimates.filter((estimate) =>
    isWithinRange(estimate.createdOn, start, endExclusive),
  );

  const totalEstimates = selectedPeriodEstimates.length;

  // ============================================
  // PIPELINE CALCULATIONS
  // ============================================

  const openOpportunities = opportunities.filter(
    (opportunity) => opportunity.status === "OPEN",
  );

  const totalOpportunities = opportunities.length;

  const pipelineValue = openOpportunities.reduce(
    (total, opportunity) => total + Number(opportunity.value || 0),
    0,
  );

  // ============================================
  // SALES REVENUE BY SALESPERSON
  // Data from PostgreSQL Sale Model
  // ============================================

  const revenueByMember = new Map();

  for (const sale of revenueSales) {
    if (!sale.salesmanId) {
      continue;
    }

    const currentRevenue = revenueByMember.get(sale.salesmanId) || 0;

    revenueByMember.set(sale.salesmanId, currentRevenue + getSaleValue(sale));
  }

  // ============================================
  // OPPORTUNITY COUNT BY TEAM MEMBER
  // ============================================

  const opportunityCountByMember = new Map();

  for (const opportunity of opportunities) {
    if (!opportunity.assignedToId) {
      continue;
    }

    const memberId = opportunity.assignedToId;

    const currentCount = opportunityCountByMember.get(memberId) || 0;

    opportunityCountByMember.set(memberId, currentCount + 1);
  }

  // ============================================
  // SORT TEAM MEMBERS
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
  // TEAM PERFORMANCE DATA
  // ============================================

  const teamData = sortedTeamMembers.map((member) => {
    const memberGoal = calculateTeamGoal([member], goalConfiguration.goalType);

    return {
      id: member.id,
      name: member.name,
      title: member.title || "",
      role: member.role,

      monthlyGoal: memberGoal,

      revenue: revenueByMember.get(member.id) || 0,

      commission: 0,

      opportunities: opportunityCountByMember.get(member.id) || 0,

      closeRate: 0,
    };
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
