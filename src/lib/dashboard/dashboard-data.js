import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getCachedYtdRevenueJobs } from "@/lib/dashboard/servicetitan-jobs";
import { getDashboardEstimateSummary } from "@/lib/dashboard/servicetitan-estimates";
import { getRevenueDateRanges } from "@/lib/date/date-utils";

// ============================================
// PERFORMANCE MEASUREMENT
// All durations displayed in seconds
// ============================================

async function measureTime(label, callback) {
  const start = performance.now();

  try {
    const result = await callback();

    const duration = (performance.now() - start) / 1000;

    console.log(`[Dashboard Performance] ${label}: ${duration.toFixed(2)} sec`);

    return result;
  } catch (error) {
    const duration = (performance.now() - start) / 1000;

    console.error(
      `[Dashboard Performance] ${label} FAILED: ${duration.toFixed(2)} sec`,
      error,
    );

    throw error;
  }
}

// ============================================
// VALIDATE DASHBOARD DATE RANGE
// ============================================

function validateDateRange({ start, endExclusive } = {}) {
  if (
    !(start instanceof Date) ||
    !(endExclusive instanceof Date) ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(endExclusive.getTime()) ||
    start >= endExclusive
  ) {
    throw new Error("A valid date range is required.");
  }
}

// ============================================
// OPTIMIZE DASHBOARD JOB FIELDS
// ============================================

function optimizeDashboardJobs(jobs = []) {
  return jobs.map((job) => ({
    id: job.id,
    jobStatus: job.jobStatus,
    completedOn: job.completedOn,
    total: job.total,
  }));
}

// ============================================
// FETCH DASHBOARD JOBS
// ============================================

async function fetchDashboardJobs() {
  return measureTime("ServiceTitan Jobs Data", async () => {
    const jobs = await getCachedYtdRevenueJobs();

    return optimizeDashboardJobs(jobs);
  });
}

// ============================================
// FETCH DASHBOARD ESTIMATE SUMMARY
//
// Estimate Value = subtotal + tax
// Estimate Count = totalCount
// Date Filter = createdOn
// ============================================

async function fetchDashboardEstimates({ start, endExclusive }) {
  validateDateRange({ start, endExclusive });

  return measureTime("Dashboard Estimate Summary", () =>
    getDashboardEstimateSummary({
      start,
      endExclusive,
    }),
  );
}

// ============================================
// FETCH ACTIVE TEAM MEMBERS
// ============================================

export async function getDashboardTeamMembers() {
  return measureTime("Prisma Team Members Query", () =>
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
  );
}

// ============================================
// FETCH OPPORTUNITIES
// ============================================

export async function getDashboardOpportunities({
  start,
  endExclusive,
  salesmanId,
} = {}) {
  validateDateRange({ start, endExclusive });

  const where = {
    opportunityDate: {
      gte: start,
      lt: endExclusive,
    },
  };

  if (salesmanId) {
    where.assignedToId = salesmanId;
  }

  return measureTime("Prisma Opportunities Query", () =>
    prisma.opportunity.findMany({
      where,

      select: {
        id: true,
        assignedToId: true,
        value: true,
        status: true,
      },
    }),
  );
}

// ============================================
// REQUEST-LEVEL JOBS CACHE
//
// Reuse Jobs during the same server render.
// Not a persistent database/API cache.
// ============================================

const getCachedDashboardJobsForRender = cache(async () => fetchDashboardJobs());

// ============================================
// REQUEST-LEVEL OPPORTUNITIES CACHE
//
// Same date range + same salesperson filter
// will reuse the same Prisma query.
// ============================================

const getCachedOpportunitiesForRender = cache(
  async (startTime, endTime, salesmanId = null) => {
    return getDashboardOpportunities({
      start: new Date(startTime),
      endExclusive: new Date(endTime),
      salesmanId,
    });
  },
);

// ============================================
// BUILD DASHBOARD REVENUE SALES
// ============================================

async function buildDashboardRevenueSales({
  jobs = [],
  start,
  endExclusive,
  salesmanId,
} = {}) {
  validateDateRange({ start, endExclusive });

  return measureTime("Build Dashboard Revenue Sales", async () => {
    const filteredJobs = jobs.filter((job) => {
      const completedDate = new Date(job.completedOn);

      return (
        completedDate >= start &&
        completedDate < endExclusive &&
        Number(job.total) > 0
      );
    });

    if (!filteredJobs.length) {
      return [];
    }

    const jobIds = filteredJobs.map((job) => String(job.id));

    const assignments = await measureTime(
      "Prisma Sales Assignments Query",
      () =>
        prisma.sale.findMany({
          where: {
            serviceTitanJobId: {
              in: jobIds,
            },

            salesmanId: salesmanId
              ? salesmanId
              : {
                  not: null,
                },
          },

          select: {
            serviceTitanJobId: true,
            salesmanId: true,
          },
        }),
    );

    const assignmentsByJobId = new Map(
      assignments.map((assignment) => [
        String(assignment.serviceTitanJobId),
        assignment,
      ]),
    );

    return filteredJobs
      .filter((job) => assignmentsByJobId.has(String(job.id)))
      .map((job) => {
        const assignment = assignmentsByJobId.get(String(job.id));

        return {
          id: String(job.id),
          saleValue: Number(job.total) || 0,
          completedAt: new Date(job.completedOn),
          salesmanId: assignment.salesmanId,
        };
      });
  });
}

// ============================================
// ADMIN REVENUE SECTION DATA
//
// Independent of Dashboard Date Filter.
// Uses persistent cached Jobs data.
// ============================================

export async function getAdminRevenueSectionData() {
  const jobs = await getCachedDashboardJobsForRender();

  return {
    jobs,
    revenueDateRanges: getRevenueDateRanges(),
  };
}

// ============================================
// ADMIN PIPELINE SECTION DATA
//
// Estimates API + Opportunities Prisma.
// ============================================

export async function getAdminPipelineSectionData({ start, endExclusive }) {
  validateDateRange({ start, endExclusive });

  const startTime = start.getTime();
  const endTime = endExclusive.getTime();

  const [estimateSummary, opportunities] = await Promise.all([
    fetchDashboardEstimates({
      start,
      endExclusive,
    }),

    getCachedOpportunitiesForRender(startTime, endTime),
  ]);

  return {
    estimateSummary,
    opportunities,
  };
}

// ============================================
// ADMIN TEAM SECTION DATA
//
// Jobs + Opportunities + Team Members.
// ============================================

export async function getAdminTeamSectionData({ start, endExclusive }) {
  validateDateRange({ start, endExclusive });

  const startTime = start.getTime();
  const endTime = endExclusive.getTime();

  const [jobs, opportunities, teamMembers] = await Promise.all([
    getCachedDashboardJobsForRender(),

    getCachedOpportunitiesForRender(startTime, endTime),

    getDashboardTeamMembers(),
  ]);

  const revenueSales = await buildDashboardRevenueSales({
    jobs,
    start,
    endExclusive,
  });

  return {
    teamMembers,
    revenueSales,
    opportunities,
  };
}

// ============================================
// FETCH SALES REVENUE
//
// Jobs only.
// No unnecessary Estimates API request.
// ============================================

export async function getDashboardRevenueSales({
  start,
  endExclusive,
  salesmanId,
} = {}) {
  validateDateRange({ start, endExclusive });

  const jobs = await getCachedDashboardJobsForRender();

  return buildDashboardRevenueSales({
    jobs,
    start,
    endExclusive,
    salesmanId,
  });
}

// ============================================
// FETCH SERVICETITAN DASHBOARD DATA
// ============================================

async function fetchServiceTitanDashboardData({ start, endExclusive }) {
  validateDateRange({ start, endExclusive });

  const [jobs, estimateSummary] = await Promise.all([
    getCachedDashboardJobsForRender(),

    fetchDashboardEstimates({
      start,
      endExclusive,
    }),
  ]);

  return {
    jobs,
    estimateSummary,
  };
}

// ============================================
// GET SERVICETITAN DASHBOARD DATA
// ============================================

export async function getDashboardServiceTitanData({
  start,
  endExclusive,
} = {}) {
  validateDateRange({ start, endExclusive });

  return measureTime("Total ServiceTitan Dashboard Data", () =>
    fetchServiceTitanDashboardData({
      start,
      endExclusive,
    }),
  );
}

// ============================================
// FETCH ADMIN DASHBOARD DATA
//
// Backward compatibility for existing pages.
// ============================================

export async function getAdminDashboardData({ start, endExclusive } = {}) {
  validateDateRange({ start, endExclusive });

  return measureTime("Total Admin Dashboard Data", async () => {
    const startTime = start.getTime();
    const endTime = endExclusive.getTime();

    const [serviceTitanData, opportunities, teamMembers] = await Promise.all([
      getDashboardServiceTitanData({
        start,
        endExclusive,
      }),

      getCachedOpportunitiesForRender(startTime, endTime),

      getDashboardTeamMembers(),
    ]);

    const revenueSales = await buildDashboardRevenueSales({
      jobs: serviceTitanData.jobs,
      start,
      endExclusive,
    });

    return {
      ...serviceTitanData,
      opportunities,
      revenueSales,
      teamMembers,
    };
  });
}

// ============================================
// FETCH SALESPERSON DASHBOARD DATA
// ============================================

export async function getSalespersonDashboardData({
  start,
  endExclusive,
  salesmanId,
} = {}) {
  if (!salesmanId) {
    throw new Error("Authenticated salesperson ID is required.");
  }

  validateDateRange({ start, endExclusive });

  return measureTime("Total Salesperson Dashboard Data", async () => {
    const startTime = start.getTime();
    const endTime = endExclusive.getTime();

    const [serviceTitanData, companyOpportunities, ownOpportunities] =
      await Promise.all([
        getDashboardServiceTitanData({
          start,
          endExclusive,
        }),

        getCachedOpportunitiesForRender(startTime, endTime),

        getCachedOpportunitiesForRender(startTime, endTime, salesmanId),
      ]);

    const ownRevenueSales = await buildDashboardRevenueSales({
      jobs: serviceTitanData.jobs,
      start,
      endExclusive,
      salesmanId,
    });

    return {
      ...serviceTitanData,
      opportunities: companyOpportunities,
      ownOpportunities,
      revenueSales: ownRevenueSales,
    };
  });
}
