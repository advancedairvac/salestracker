import { prisma } from "@/lib/prisma";

import { getRevenueJobs } from "@/lib/integrations/servicetitan";

import {
  getServiceTitanCustomersByIds,
  getCustomerName,
} from "@/lib/dashboard/customer-sync";

import { resolveSelectedDateRange } from "@/lib/dashboard/date-range-helpers";

import { isWithinRange } from "@/lib/date/date-utils";

import { getGoalConfiguration, calculateTeamGoal } from "@/lib/date/goal-utils";

import {
  isCompletedJob,
  getCompletedJobs,
  calculateJobRevenue,
} from "@/lib/dashboard/servicetitan-helpers";

import { getDashboardTeamMembers } from "@/lib/dashboard/dashboard-data";

// ============================================
// CONFIGURATION
// ============================================

const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

const SERVICE_TITAN_PAGE_SIZE = 500;
const MAX_SERVICE_TITAN_PAGES = 1000;

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

function getRevenueDateRange(searchParams = {}) {
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
// ============================================

async function fetchAllRevenueJobs({ start, endExclusive } = {}) {
  const allJobs = [];
  const seenJobIds = new Set();

  let page = 1;
  let expectedTotal = null;

  const completedOnOrAfter = start.toISOString();
  const completedBefore = endExclusive.toISOString();

  while (page <= MAX_SERVICE_TITAN_PAGES) {
    const result = await getRevenueJobs({
      page,
      pageSize: SERVICE_TITAN_PAGE_SIZE,
      includeTotal: true,

      jobStatus: "Completed",
      completedOnOrAfter,
      completedBefore,
    });

    const jobs = Array.isArray(result.data) ? result.data : [];

    if (page === 1) {
      const totalCount = Number(result.totalCount);

      expectedTotal =
        Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : null;
    }

    for (const job of jobs) {
      if (!job?.id) continue;

      const jobId = String(job.id);

      if (seenJobIds.has(jobId)) continue;

      seenJobIds.add(jobId);
      allJobs.push(job);
    }

    if (jobs.length === 0 || result.hasMore === false) {
      break;
    }

    if (
      result.hasMore === undefined &&
      expectedTotal !== null &&
      allJobs.length >= expectedTotal
    ) {
      break;
    }

    if (result.hasMore === undefined && jobs.length < SERVICE_TITAN_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  if (page > MAX_SERVICE_TITAN_PAGES) {
    throw new Error(
      "ServiceTitan revenue pagination exceeded the maximum allowed pages.",
    );
  }

  return {
    jobs: allJobs,
    expectedTotal,
  };
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

    case "COMPANY_GENERATED":
      return "Company Generated";

    default:
      return "—";
  }
}

// ============================================
// FETCH CRM SALE ASSIGNMENTS
// ============================================

async function getRevenueSaleAssignments(serviceTitanJobIds = []) {
  if (!serviceTitanJobIds.length) {
    return [];
  }

  return prisma.sale.findMany({
    where: {
      serviceTitanJobId: {
        in: serviceTitanJobIds,
      },
    },

    select: {
      serviceTitanJobId: true,
      source: true,
      salesmanId: true,

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

      commissionEstimate: 0,
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
// SHARED SALES REVENUE DATA
// ============================================

export async function getSalesRevenueData({ searchParams = {} } = {}) {
  // ------------------------------------------
  // DATE RANGE
  // ------------------------------------------

  const dateRange = getRevenueDateRange(searchParams);

  const { preset, startDate, endDate, start, endExclusive } = dateRange;

  // ------------------------------------------
  // PAGINATION PARAMETERS
  // ------------------------------------------

  const { requestedPage, pageSize } = getRevenuePagination(searchParams);

  // ------------------------------------------
  // FETCH REVENUE JOBS AND TEAM MEMBERS
  // ------------------------------------------

  const [revenueJobResult, teamMembers] = await Promise.all([
    fetchAllRevenueJobs({
      start,
      endExclusive,
    }),

    getDashboardTeamMembers(),
  ]);

  // ------------------------------------------
  // FILTER COMPLETED JOBS
  // Includes zero-value jobs in the table.
  // ------------------------------------------

  const matchingJobs = revenueJobResult.jobs.filter(
    (job) =>
      isCompletedJob(job) &&
      isWithinRange(job.completedOn, start, endExclusive),
  );

  // ------------------------------------------
  // SORT JOBS: NEWEST FIRST
  // ------------------------------------------

  const sortedJobs = sortRevenueJobs(matchingJobs);

  // ------------------------------------------
  // REVENUE SUMMARY
  // Only positive-value completed jobs.
  // ------------------------------------------

  const summaryJobs = getCompletedJobs(sortedJobs);

  const totalRevenue = calculateJobRevenue(summaryJobs);

  // ------------------------------------------
  // TEAM GOAL
  // ------------------------------------------

  const goalConfiguration = getGoalConfiguration(preset, startDate, endDate);

  const teamGoal = calculateTeamGoal(teamMembers, goalConfiguration.goalType);

  // ------------------------------------------
  // SERVER-SIDE PAGINATION
  // ------------------------------------------

  const pagination = buildPagination({
    requestedPage,
    pageSize,
    totalItems: sortedJobs.length,
  });

  const startIndex = (pagination.currentPage - 1) * pagination.pageSize;

  const paginatedJobs = sortedJobs.slice(
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

  const [saleAssignments, customerLookup] = await Promise.all([
    getRevenueSaleAssignments(serviceTitanJobIds),

    getServiceTitanCustomersByIds(customerIds),
  ]);

  // ------------------------------------------
  // BUILD REVENUE TABLE DATA
  // ------------------------------------------

  const revenueData = buildRevenueTableData({
    jobs: paginatedJobs,
    customerLookup,
    saleAssignments,
  });

  // ------------------------------------------
  // RETURN
  // ------------------------------------------

  return {
    dateRange: {
      startDate,
      endDate,
      preset,
    },

    totalRevenue,

    teamGoal,

    goalConfiguration,

    teamMembers,

    revenueData,

    pagination,
  };
}
