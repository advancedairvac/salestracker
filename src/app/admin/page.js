
import { prisma } from "@/lib/prisma";

import {
  getAllJobs,
  getAllEstimates,
  getAllAppointmentAssignments,
} from "@/lib/integrations/servicetitan";

import { PRESETS, getInitialRange } from "@/lib/date/date-utils";

import {
  getGoalConfiguration,
  calculateTeamGoal,
} from "@/lib/date/goal-utils";

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
  const [startYear, startMonth, startDay] = startDate
    .split("-")
    .map(Number);

  const [endYear, endMonth, endDay] = endDate
    .split("-")
    .map(Number);

  return {
    start: new Date(startYear, startMonth - 1, startDay),
    endExclusive: new Date(
      endYear,
      endMonth - 1,
      endDay + 1,
    ),
  };
}

function isWithinRange(dateValue, start, endExclusive) {
  if (!dateValue) return false;

  const date = new Date(dateValue);

  return (
    !Number.isNaN(date.getTime()) &&
    date >= start &&
    date < endExclusive
  );
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function calculateRevenue(jobs) {
  return jobs.reduce(
    (total, job) => total + Number(job.total || 0),
    0,
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

  const defaultRange = getInitialRange();

  const requestedStartDate =
    typeof params?.startDate === "string"
      ? params.startDate
      : defaultRange.startDate;

  const requestedEndDate =
    typeof params?.endDate === "string"
      ? params.endDate
      : defaultRange.endDate;

  const validRange =
    isValidDateString(requestedStartDate) &&
    isValidDateString(requestedEndDate) &&
    requestedStartDate <= requestedEndDate;

  const selectedStartDate = validRange
    ? requestedStartDate
    : defaultRange.startDate;

  const selectedEndDate = validRange
    ? requestedEndDate
    : defaultRange.endDate;

  const requestedPreset =
    typeof params?.preset === "string"
      ? params.preset
      : "MTD";

  const selectedPreset = PRESETS.includes(requestedPreset)
    ? requestedPreset
    : "MTD";

  const { start, endExclusive } = getDateRange(
    selectedStartDate,
    selectedEndDate,
  );

  // ============================================
  // REVENUE CARD DATE RANGES
  // These are independent of DateSelector.
  // ============================================

  const now = new Date();

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  const yearStart = new Date(
    now.getFullYear(),
    0,
    1,
  );

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

  const [
    allJobs,
    allEstimates,
    allAssignments,
    opportunities,
    teamMembers,
  ] = await Promise.all([
    // ServiceTitan Jobs
    getAllJobs({
      pageSize: 100,
      maxPages: 10,
    }),

    // ServiceTitan Estimates
    getAllEstimates({
      pageSize: 100,
      maxPages: 10,
    }),

    // ServiceTitan Appointment Assignments
    getAllAppointmentAssignments({
      pageSize: 100,
      maxPages: 100,
    }),

    // CRM Opportunities within selected date range
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
  // SALES REVENUE CARD
  // Independent of selected DateSelector range.
  // ============================================

  const completedJobs = allJobs.filter(
    (job) => job.jobStatus === "Completed",
  );

  const todayJobs = completedJobs.filter((job) =>
    isWithinRange(job.completedOn, todayStart, new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    )),
  );

  const monthJobs = completedJobs.filter((job) =>
    isWithinRange(job.completedOn, monthStart, new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    )),
  );

  const yearJobs = completedJobs.filter((job) =>
    isWithinRange(job.completedOn, yearStart, new Date(
      now.getFullYear() + 1,
      0,
      1,
    )),
  );

  const todayRevenue = calculateRevenue(todayJobs);
  const monthRevenue = calculateRevenue(monthJobs);
  const yearRevenue = calculateRevenue(yearJobs);

  // ============================================
  // FILTER JOBS FOR SALES TEAM PERFORMANCE
  // ============================================

  const selectedPeriodJobs = completedJobs
    .filter((job) =>
      isWithinRange(job.completedOn, start, endExclusive),
    )
    .sort(
      (a, b) =>
        new Date(b.completedOn).getTime() -
        new Date(a.completedOn).getTime(),
    );

  // ============================================
  // FILTER ESTIMATES BY CREATED DATE
  // ============================================

  const selectedPeriodEstimates = allEstimates.filter(
    (estimate) =>
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
    (total, opportunity) =>
      total + Number(opportunity.value || 0),
    0,
  );

  // ============================================
  // ASSIGNMENTS BY JOB
  // ============================================

  const assignmentsByJob = new Map();

  for (const assignment of allAssignments) {
    if (
      assignment.status !== "Done" ||
      assignment.active === false ||
      !assignment.jobId ||
      !assignment.technicianName
    ) {
      continue;
    }

    const jobId = String(assignment.jobId);

    if (!assignmentsByJob.has(jobId)) {
      assignmentsByJob.set(jobId, []);
    }

    const technicianNames = assignmentsByJob.get(jobId);

    if (!technicianNames.includes(assignment.technicianName)) {
      technicianNames.push(assignment.technicianName);
    }
  }

  // ============================================
  // TEAM LOOKUPS
  // ============================================

  const teamMemberByName = new Map(
    teamMembers.map((member) => [
      normalizeName(member.name),
      member,
    ]),
  );

  const revenueByMember = new Map();
  const opportunityCountByMember = new Map();

  // ============================================
  // SALES TEAM REVENUE
  // ============================================

  for (const job of selectedPeriodJobs) {
    const technicianNames =
      assignmentsByJob.get(String(job.id)) || [];

    const matchedMembers = [
      ...new Map(
        technicianNames
          .map((name) =>
            teamMemberByName.get(normalizeName(name)),
          )
          .filter(Boolean)
          .map((member) => [member.id, member]),
      ).values(),
    ];

    if (matchedMembers.length === 0) {
      continue;
    }

    // Split revenue between matched team members
    // to prevent duplicate counting.
    const revenuePerMember =
      Number(job.total || 0) / matchedMembers.length;

    for (const member of matchedMembers) {
      const currentRevenue =
        revenueByMember.get(member.id) || 0;

      revenueByMember.set(
        member.id,
        currentRevenue + revenuePerMember,
      );
    }
  }

  // ============================================
  // OPPORTUNITY COUNT BY TEAM MEMBER
  // ============================================

  for (const opportunity of opportunities) {
    const memberId = opportunity.assignedToId;

    const currentCount =
      opportunityCountByMember.get(memberId) || 0;

    opportunityCountByMember.set(
      memberId,
      currentCount + 1,
    );
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
    const memberGoal = calculateTeamGoal(
      [member],
      goalConfiguration.goalType,
    );

    return {
      id: member.id,
      name: member.name,
      title: member.title || "",
      role: member.role,

      // Goal for selected period
      monthlyGoal: memberGoal,

      // Revenue for selected period
      revenue: revenueByMember.get(member.id) || 0,

      commission: 0,

      // Opportunities for selected period
      opportunities:
        opportunityCountByMember.get(member.id) || 0,

      // Close Rate will be handled separately.
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
