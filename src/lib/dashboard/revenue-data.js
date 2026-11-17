import { prisma } from "@/lib/prisma";

import { getRevenueJobs } from "@/lib/integrations/servicetitan";

import {
  getServiceTitanCustomersByIds,
  getCustomerName,
} from "@/lib/dashboard/customer-sync";

import { resolveSelectedDateRange } from "@/lib/dashboard/date-range-helpers";

import { getRevenueDateRanges, isWithinRange } from "@/lib/date/date-utils";

import { getGoalConfiguration, calculateTeamGoal } from "@/lib/date/goal-utils";

import {
  isCompletedJob,
  getCompletedJobs,
  calculateJobRevenue,
} from "@/lib/dashboard/servicetitan-helpers";

import { getCachedYtdRevenueJobs } from "@/lib/dashboard/servicetitan-jobs";

import { getDashboardTeamMembers } from "@/lib/dashboard/dashboard-data";

// ============================================
// CONFIGURATION
// ============================================

const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

const SERVICE_TITAN_PAGE_SIZE = 500;
const MAX_SERVICE_TITAN_PAGES = 1000;

const REVENUE_RANGE_CACHE_TTL = 5 * 60 * 1000;
const REVENUE_PAGE_CONCURRENCY = 4;

// ============================================
// DATE RANGE CACHE
// ============================================

const revenueRangeCache = new Map();
const revenueRangeFetchPromises = new Map();

// ============================================
// QUERY HELPERS
// ============================================

function getQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function getPageSize(value) {
  const parsed = getPositiveInteger(value, 10);

  return ALLOWED_PAGE_SIZES.includes(parsed) ? parsed : 10;
}

// ============================================
// DATE RANGE
// ============================================

export function getSalesRevenueDateRange(searchParams = {}) {
  const dateRange = resolveSelectedDateRange({
    preset: getQueryValue(searchParams.preset),
    startDate: getQueryValue(searchParams.startDate),
    endDate: getQueryValue(searchParams.endDate),
  });

  return {
    preset: dateRange.selectedPreset,
    startDate: dateRange.selectedStartDate,
    endDate: dateRange.selectedEndDate,
    start: dateRange.start,
    endExclusive: dateRange.endExclusive,
  };
}

// ============================================
// CHECK WHETHER RANGE IS WITHIN CURRENT YEAR
// ============================================

function isRangeWithinCurrentYear({ start, endExclusive }) {
  const { yearStart, nextYearStart } = getRevenueDateRanges();

  return start >= yearStart && endExclusive <= nextYearStart;
}

// ============================================
// REVENUE PAGINATION PARAMETERS
// ============================================

function getRevenuePagination(searchParams = {}) {
  return {
    requestedPage: getPositiveInteger(getQueryValue(searchParams.page), 1),
    pageSize: getPageSize(getQueryValue(searchParams.pageSize)),
  };
}

// ============================================
// FETCH ALL MATCHING SERVICE TITAN JOBS
// CONTROLLED PARALLEL PAGINATION
// ============================================

async function fetchAllRevenueJobs({ start, endExclusive } = {}) {
  const completedOnOrAfter = start.toISOString();
  const completedBefore = endExclusive.toISOString();

  const filters = {
    pageSize: SERVICE_TITAN_PAGE_SIZE,
    jobStatus: "Completed",
    completedOnOrAfter,
    completedBefore,
  };

  const firstPage = await getRevenueJobs({
    ...filters,
    page: 1,
    includeTotal: true,
  });

  if (!firstPage || !Array.isArray(firstPage.data)) {
    throw new Error("Unable to fetch ServiceTitan revenue jobs.");
  }

  const totalCount = Number(firstPage.totalCount);

  if (!Number.isFinite(totalCount) || totalCount < 0) {
    throw new Error("Invalid ServiceTitan revenue jobs totalCount.");
  }

  const totalPages = Math.ceil(totalCount / SERVICE_TITAN_PAGE_SIZE);

  if (totalPages > MAX_SERVICE_TITAN_PAGES) {
    throw new Error(
      "ServiceTitan revenue pagination exceeded the maximum allowed pages.",
    );
  }

  const allJobs = [...firstPage.data];

  for (
    let startPage = 2;
    startPage <= totalPages;
    startPage += REVENUE_PAGE_CONCURRENCY
  ) {
    const pageNumbers = Array.from(
      {
        length: Math.min(REVENUE_PAGE_CONCURRENCY, totalPages - startPage + 1),
      },
      (_, index) => startPage + index,
    );

    const pageResults = await Promise.all(
      pageNumbers.map((page) =>
        getRevenueJobs({
          ...filters,
          page,
          includeTotal: false,
        }),
      ),
    );

    for (const result of pageResults) {
      if (!result || !Array.isArray(result.data)) {
        throw new Error("Unable to fetch ServiceTitan revenue jobs page.");
      }

      allJobs.push(...result.data);
    }
  }

  if (allJobs.length !== totalCount) {
    throw new Error(
      `Incomplete ServiceTitan revenue data. Expected ${totalCount}, received ${allJobs.length}.`,
    );
  }

  const uniqueJobs = [];
  const seenJobIds = new Set();

  for (const job of allJobs) {
    if (!job?.id) continue;

    const jobId = String(job.id);

    if (seenJobIds.has(jobId)) continue;

    seenJobIds.add(jobId);
    uniqueJobs.push(job);
  }

  if (uniqueJobs.length !== totalCount) {
    throw new Error(
      `Duplicate or missing ServiceTitan jobs. Expected ${totalCount}, received ${uniqueJobs.length}.`,
    );
  }

  return uniqueJobs;
}

// ============================================
// GET CACHED REVENUE JOBS FOR DATE RANGE
// ============================================

async function getCachedRevenueJobsForRange({ start, endExclusive }) {
  const cacheKey = [start.toISOString(), endExclusive.toISOString()].join("_");

  const now = Date.now();
  const cached = revenueRangeCache.get(cacheKey);

  if (cached && now < cached.expiresAt) {
    return cached.jobs;
  }

  if (cached) {
    revenueRangeCache.delete(cacheKey);
  }

  const existingPromise = revenueRangeFetchPromises.get(cacheKey);

  if (existingPromise) {
    return existingPromise;
  }

  const fetchPromise = fetchAllRevenueJobs({
    start,
    endExclusive,
  });

  revenueRangeFetchPromises.set(cacheKey, fetchPromise);

  try {
    const jobs = await fetchPromise;

    revenueRangeCache.set(cacheKey, {
      jobs,
      expiresAt: Date.now() + REVENUE_RANGE_CACHE_TTL,
    });

    return jobs;
  } finally {
    revenueRangeFetchPromises.delete(cacheKey);
  }
}

// ============================================
// GET REVENUE JOBS FOR SELECTED DATE RANGE
// ============================================

async function getRevenueJobsForRange({ start, endExclusive }) {
  if (isRangeWithinCurrentYear({ start, endExclusive })) {
    const cachedJobs = await getCachedYtdRevenueJobs();

    return cachedJobs.filter((job) =>
      isWithinRange(job.completedOn, start, endExclusive),
    );
  }

  return getCachedRevenueJobsForRange({
    start,
    endExclusive,
  });
}

// ============================================
// SORT JOBS: NEWEST FIRST
// ============================================

function sortRevenueJobs(jobs = []) {
  return [...jobs].sort((a, b) => {
    const dateA = new Date(a.completedOn).getTime();
    const dateB = new Date(b.completedOn).getTime();

    const validDateA = Number.isFinite(dateA) ? dateA : 0;
    const validDateB = Number.isFinite(dateB) ? dateB : 0;

    return validDateB - validDateA;
  });
}

// ============================================
// SOURCE LABEL
// ============================================

function getSourceLabel(source) {
  switch (source) {
    case "SELF_GENERATED":
      return "Self Generated";

    case "COMPANY":
      return "Company";

    default:
      return "—";
  }
}

// ============================================
// FETCH CRM SALE ASSIGNMENTS
// ============================================

async function getRevenueSaleAssignments(
  serviceTitanJobIds = [],
  salesmanId = null,
) {
  if (!serviceTitanJobIds.length) {
    return [];
  }

  return prisma.sale.findMany({
    where: {
      serviceTitanJobId: {
        in: serviceTitanJobIds,
      },

      ...(salesmanId ? { salesmanId } : {}),
    },

    select: {
      serviceTitanJobId: true,
      source: true,
      salesmanId: true,
      commissionEstimate: true,

      salesman: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

// ============================================
// BUILD REVENUE TABLE DATA
// ============================================

function buildRevenueTableData({
  jobs = [],
  customerLookup = {},
  saleAssignments = [],
} = {}) {
  const salesByJobId = new Map();

  for (const sale of saleAssignments) {
    if (sale.serviceTitanJobId) {
      salesByJobId.set(String(sale.serviceTitanJobId), sale);
    }
  }

  return jobs.map((job) => {
    const savedSale = salesByJobId.get(String(job.id));
    const customer = customerLookup[String(job.customerId)];

    return {
      id: job.id,
      serviceTitanJobId: job.jobNumber || job.id,
      customerName: getCustomerName(customer),
      saleValue: Number(job.total) || 0,
      completedOn: job.completedOn || null,
      source: getSourceLabel(savedSale?.source),
      salesmanName: savedSale?.salesman?.name || "—",
      commissionEstimate: Number(savedSale?.commissionEstimate ?? 0),
    };
  });
}

// ============================================
// BUILD PAGINATION
// ============================================

function buildPagination({ requestedPage, pageSize, totalItems }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const currentPage = Math.min(requestedPage, totalPages);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

// ============================================
// GET COMPLETED JOBS MATCHING DATE RANGE
// ============================================

async function getMatchingCompletedRevenueJobs({ start, endExclusive }) {
  const revenueJobs = await getRevenueJobsForRange({
    start,
    endExclusive,
  });

  return sortRevenueJobs(
    revenueJobs.filter(
      (job) =>
        isCompletedJob(job) &&
        isWithinRange(job.completedOn, start, endExclusive),
    ),
  );
}

// ============================================
// REVENUE SUMMARY DATA
// Supports optional salesperson filtering
// ============================================

// ============================================
// REVENUE SUMMARY DATA
// ============================================

export async function getSalesRevenueSummaryData({
  dateRange,
  salesmanId = null,
} = {}) {
  if (!dateRange?.start || !dateRange?.endExclusive) {
    throw new Error("A valid revenue date range is required.");
  }

  const { preset, startDate, endDate, start, endExclusive } = dateRange;

  const [revenueJobs, teamMembers] = await Promise.all([
    getRevenueJobsForRange({
      start,
      endExclusive,
    }),

    getDashboardTeamMembers(),
  ]);

  const matchingJobs = revenueJobs.filter(
    (job) =>
      isCompletedJob(job) &&
      isWithinRange(job.completedOn, start, endExclusive),
  );

  const sortedJobs = sortRevenueJobs(matchingJobs);

  // ------------------------------------------
  // SALESPERSON ASSIGNMENT FILTER
  // ------------------------------------------

  let filteredJobs = sortedJobs;

  if (salesmanId) {
    const assignments = await getRevenueSaleAssignments(
      sortedJobs.map((job) => String(job.id)),
      salesmanId,
    );

    const assignedJobIds = new Set(
      assignments.map((sale) => String(sale.serviceTitanJobId)),
    );

    filteredJobs = sortedJobs.filter((job) =>
      assignedJobIds.has(String(job.id)),
    );
  }

  // ------------------------------------------
  // REVENUE
  // ------------------------------------------

  const summaryJobs = getCompletedJobs(filteredJobs);

  const totalRevenue = calculateJobRevenue(summaryJobs);

  // ------------------------------------------
  // COMMISSION
  // ------------------------------------------

  const assignments = await getRevenueSaleAssignments(
    filteredJobs.map((job) => String(job.id)),
    salesmanId,
  );

  const totalCommission = assignments.reduce(
    (total, sale) => total + Number(sale.commissionEstimate || 0),
    0,
  );

  // ------------------------------------------
  // GOAL
  // ------------------------------------------

  const goalConfiguration = getGoalConfiguration(preset, startDate, endDate);

  const selectedTeamMembers = salesmanId
    ? teamMembers.filter((member) => member.id === salesmanId)
    : teamMembers;

  const teamGoal = calculateTeamGoal(
    selectedTeamMembers,
    goalConfiguration.goalType,
  );

  return {
    totalRevenue,
    totalCommission,
    teamGoal,
    goalConfiguration,
    teamMembers: selectedTeamMembers,
  };
}

// ============================================
// REVENUE TABLE DATA
// Supports optional salesperson filtering
// ============================================

export async function getSalesRevenueTableData({
  dateRange,
  searchParams = {},
  salesmanId = null,
} = {}) {
  if (!dateRange?.start || !dateRange?.endExclusive) {
    throw new Error("A valid revenue date range is required.");
  }

  const { start, endExclusive } = dateRange;

  const { requestedPage, pageSize } = getRevenuePagination(searchParams);

  const sortedJobs = await getMatchingCompletedRevenueJobs({
    start,
    endExclusive,
  });

  let filteredJobs = sortedJobs;
  let saleAssignments = [];

  // ------------------------------------------
  // FILTER BY SALESPERSON BEFORE PAGINATION
  // ------------------------------------------

  if (salesmanId) {
    const allMatchingJobIds = sortedJobs.map((job) => String(job.id));

    saleAssignments = await getRevenueSaleAssignments(
      allMatchingJobIds,
      salesmanId,
    );

    const assignedJobIds = new Set(
      saleAssignments.map((sale) => String(sale.serviceTitanJobId)),
    );

    filteredJobs = sortedJobs.filter((job) =>
      assignedJobIds.has(String(job.id)),
    );
  }

  // ------------------------------------------
  // SERVER-SIDE PAGINATION
  // ------------------------------------------

  const pagination = buildPagination({
    requestedPage,
    pageSize,
    totalItems: filteredJobs.length,
  });

  const startIndex = (pagination.currentPage - 1) * pagination.pageSize;

  const paginatedJobs = filteredJobs.slice(
    startIndex,
    startIndex + pagination.pageSize,
  );

  // ------------------------------------------
  // CURRENT PAGE CUSTOMER IDS
  // ------------------------------------------

  const customerIds = paginatedJobs
    .map((job) => job.customerId)
    .filter((id) => id !== undefined && id !== null && id !== "");

  // ------------------------------------------
  // CURRENT PAGE SERVICE TITAN JOB IDS
  // ------------------------------------------

  const serviceTitanJobIds = paginatedJobs.map((job) => String(job.id));

  // ------------------------------------------
  // FETCH ASSIGNMENTS AND CUSTOMERS
  // ------------------------------------------

  const [pageSaleAssignments, customerLookup] = await Promise.all([
    salesmanId
      ? Promise.resolve(
          saleAssignments.filter((sale) =>
            serviceTitanJobIds.includes(String(sale.serviceTitanJobId)),
          ),
        )
      : getRevenueSaleAssignments(serviceTitanJobIds),

    getServiceTitanCustomersByIds(customerIds),
  ]);

  // ------------------------------------------
  // BUILD REVENUE TABLE DATA
  // ------------------------------------------

  const revenueData = buildRevenueTableData({
    jobs: paginatedJobs,
    customerLookup,
    saleAssignments: pageSaleAssignments,
  });

  return {
    revenueData,
    pagination,
  };
}

// ============================================
// LEGACY COMBINED DATA FUNCTION
// ============================================

export async function getSalesRevenueData({ searchParams = {} } = {}) {
  const dateRange = getSalesRevenueDateRange(searchParams);

  const [summaryData, tableData] = await Promise.all([
    getSalesRevenueSummaryData({
      dateRange,
    }),

    getSalesRevenueTableData({
      dateRange,
      searchParams,
    }),
  ]);

  return {
    dateRange: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      preset: dateRange.preset,
    },

    ...summaryData,
    ...tableData,
  };
}
