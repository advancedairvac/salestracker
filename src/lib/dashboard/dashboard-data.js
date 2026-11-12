import { prisma } from "@/lib/prisma";

import { getJobs, getEstimates } from "@/lib/integrations/servicetitan";

import { getRevenueDateRanges } from "@/lib/date/date-utils";

// ============================================
// CONFIGURATION
// ============================================

const PAGE_SIZE = 500;
const PAGE_CONCURRENCY = 4;
const SERVICE_TITAN_CACHE_TTL = 5 * 60 * 1000;

// ============================================
// SERVICE TITAN CACHE
// ============================================

let serviceTitanCache = null;
let serviceTitanCacheExpiresAt = 0;
let serviceTitanFetchPromise = null;

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
// OPTIMIZE DASHBOARD ESTIMATE FIELDS
// ============================================

function optimizeDashboardEstimates(estimates = []) {
  return estimates.map((estimate) => ({
    id: estimate.id,

    status: {
      value: estimate.status?.value ?? null,
      name: estimate.status?.name || "Unknown",
    },

    subtotal: Number(estimate.subtotal) || 0,

    tax: Number(estimate.tax) || 0,

    createdOn: estimate.createdOn,
  }));
}

// ============================================
// FETCH DASHBOARD JOBS
// YTD COMPLETED JOBS ONLY
// ============================================

async function fetchDashboardJobs() {
  const { yearStart, nextYearStart } = getRevenueDateRanges();

  const jobFilters = {
    pageSize: PAGE_SIZE,
    jobStatus: "Completed",
    completedOnOrAfter: yearStart.toISOString(),
    completedBefore: nextYearStart.toISOString(),
  };

  const firstPage = await getJobs({
    ...jobFilters,
    page: 1,
    includeTotal: true,
  });

  if (!firstPage || !Array.isArray(firstPage.data)) {
    throw new Error("Unable to fetch ServiceTitan dashboard jobs.");
  }

  const jobs = [...firstPage.data];

  const totalCount = Number(firstPage.totalCount);

  if (!Number.isFinite(totalCount) || totalCount < 0) {
    throw new Error("Invalid ServiceTitan jobs totalCount.");
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Fetch remaining pages with controlled concurrency.
  for (
    let startPage = 2;
    startPage <= totalPages;
    startPage += PAGE_CONCURRENCY
  ) {
    const pageNumbers = Array.from(
      {
        length: Math.min(PAGE_CONCURRENCY, totalPages - startPage + 1),
      },
      (_, index) => startPage + index,
    );

    const pageResults = await Promise.all(
      pageNumbers.map((page) =>
        getJobs({
          ...jobFilters,
          page,
          includeTotal: false,
        }),
      ),
    );

    for (const result of pageResults) {
      if (!result || !Array.isArray(result.data)) {
        throw new Error("Unable to fetch ServiceTitan dashboard jobs page.");
      }

      jobs.push(...result.data);
    }
  }

  // Prevent incomplete revenue calculations.
  if (jobs.length !== totalCount) {
    throw new Error(
      `Incomplete ServiceTitan jobs data. Expected ${totalCount}, received ${jobs.length}.`,
    );
  }

  return optimizeDashboardJobs(jobs);
}

// ============================================
// FETCH DASHBOARD ESTIMATES
// ALL ESTIMATES WITH CONTROLLED PAGINATION
// ============================================

async function fetchDashboardEstimates() {
  const firstPage = await getEstimates({
    page: 1,
    pageSize: PAGE_SIZE,
    includeTotal: true,
  });

  if (!firstPage || !Array.isArray(firstPage.data)) {
    throw new Error("Unable to fetch ServiceTitan dashboard estimates.");
  }

  const totalCount = Number(firstPage.totalCount);

  if (!Number.isFinite(totalCount) || totalCount < 0) {
    throw new Error("Invalid ServiceTitan estimates totalCount.");
  }

  const estimates = optimizeDashboardEstimates(firstPage.data);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Fetch remaining pages with controlled concurrency.
  for (
    let startPage = 2;
    startPage <= totalPages;
    startPage += PAGE_CONCURRENCY
  ) {
    const pageNumbers = Array.from(
      {
        length: Math.min(PAGE_CONCURRENCY, totalPages - startPage + 1),
      },
      (_, index) => startPage + index,
    );

    const pageResults = await Promise.all(
      pageNumbers.map((page) =>
        getEstimates({
          page,
          pageSize: PAGE_SIZE,
          includeTotal: false,
        }),
      ),
    );

    for (const result of pageResults) {
      if (!result || !Array.isArray(result.data)) {
        throw new Error(
          "Unable to fetch ServiceTitan dashboard estimates page.",
        );
      }

      estimates.push(...optimizeDashboardEstimates(result.data));
    }
  }

  // Prevent incomplete estimate calculations.
  if (estimates.length !== totalCount) {
    throw new Error(
      `Incomplete ServiceTitan estimates data. Expected ${totalCount}, received ${estimates.length}.`,
    );
  }

  return estimates;
}

// ============================================
// FETCH DASHBOARD SERVICETITAN DATA
// ============================================

async function fetchServiceTitanDashboardData() {
  const [jobs, estimates] = await Promise.all([
    fetchDashboardJobs(),
    fetchDashboardEstimates(),
  ]);

  return {
    jobs,
    estimates,
  };
}

// ============================================
// GET CACHED SERVICETITAN DASHBOARD DATA
// ============================================

export async function getDashboardServiceTitanData() {
  const now = Date.now();

  // Return cached data.
  if (serviceTitanCache && now < serviceTitanCacheExpiresAt) {
    return serviceTitanCache;
  }

  // Reuse ongoing fetch.
  if (serviceTitanFetchPromise) {
    return serviceTitanFetchPromise;
  }

  serviceTitanFetchPromise = fetchServiceTitanDashboardData();

  try {
    const data = await serviceTitanFetchPromise;

    serviceTitanCache = data;

    serviceTitanCacheExpiresAt = Date.now() + SERVICE_TITAN_CACHE_TTL;

    return data;
  } catch (error) {
    serviceTitanCache = null;
    serviceTitanCacheExpiresAt = 0;

    throw error;
  } finally {
    serviceTitanFetchPromise = null;
  }
}

// ============================================
// FETCH OPPORTUNITIES
// ============================================

export async function getDashboardOpportunities({
  start,
  endExclusive,
  salesmanId,
} = {}) {
  if (!start || !endExclusive) {
    throw new Error("A valid date range is required.");
  }

  const where = {
    opportunityDate: {
      gte: start,
      lt: endExclusive,
    },
  };

  if (salesmanId) {
    where.assignedToId = salesmanId;
  }

  return prisma.opportunity.findMany({
    where,

    select: {
      id: true,
      assignedToId: true,
      value: true,
      status: true,
    },
  });
}

// ============================================
// BUILD DASHBOARD REVENUE SALES
// Uses already-fetched ServiceTitan jobs.
// ============================================

async function buildDashboardRevenueSales({
  jobs = [],
  start,
  endExclusive,
  salesmanId,
} = {}) {
  if (!start || !endExclusive) {
    throw new Error("A valid date range is required.");
  }

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

  const assignments = await prisma.sale.findMany({
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
  });

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
}

// ============================================
// FETCH SALES REVENUE
// PUBLIC HELPER
// ============================================

export async function getDashboardRevenueSales({
  start,
  endExclusive,
  salesmanId,
} = {}) {
  const { jobs } = await getDashboardServiceTitanData();

  return buildDashboardRevenueSales({
    jobs,
    start,
    endExclusive,
    salesmanId,
  });
}

// ============================================
// FETCH ACTIVE TEAM MEMBERS
// ============================================

export async function getDashboardTeamMembers() {
  return prisma.user.findMany({
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
  });
}

// ============================================
// FETCH ADMIN DASHBOARD DATA
// ============================================

export async function getAdminDashboardData({ start, endExclusive } = {}) {
  // Fetch ServiceTitan data only once.
  const [serviceTitanData, opportunities, teamMembers] = await Promise.all([
    getDashboardServiceTitanData(),

    getDashboardOpportunities({
      start,
      endExclusive,
    }),

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

  // Fetch ServiceTitan data only once.
  const [serviceTitanData, companyOpportunities, ownOpportunities] =
    await Promise.all([
      getDashboardServiceTitanData(),

      getDashboardOpportunities({
        start,
        endExclusive,
      }),

      getDashboardOpportunities({
        start,
        endExclusive,
        salesmanId,
      }),
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
}
