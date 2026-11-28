import { prisma } from "@/lib/prisma";

import { getRevenueJobsForRange } from "@/lib/dashboard/servicetitan-jobs";

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
// REVENUE PAGINATION PARAMETERS
// ============================================

function getRevenuePagination(searchParams = {}) {
  return {
    requestedPage: getPositiveInteger(getQueryValue(searchParams.page), 1),
    pageSize: getPageSize(getQueryValue(searchParams.pageSize)),
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

    case "COMPANY":
      return "Company";

    default:
      return "—";
  }
}

// ============================================
// FETCH CRM SALE ASSIGNMENTS
// DIRECT DATABASE QUERY - NO CACHE
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
// SUPPORTS SALESPERSON FILTERING
// ServiceTitan jobs use the shared date-range cache.
// ============================================

export async function getSalesRevenueSummaryData({
  dateRange,
  salesmanId = null,
} = {}) {
  if (!dateRange?.start || !dateRange?.endExclusive) {
    throw new Error("A valid revenue date range is required.");
  }

  const { preset, startDate, endDate, start, endExclusive } = dateRange;

  // Reuse the shared ServiceTitan date-range result.
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
  // FETCH ASSIGNMENTS ONLY ONCE
  // ------------------------------------------

  const allMatchingJobIds = sortedJobs.map((job) => String(job.id));

  const assignments = await getRevenueSaleAssignments(
    allMatchingJobIds,
    salesmanId,
  );

  // ------------------------------------------
  // FILTER SALESPERSON JOBS
  // ------------------------------------------

  let filteredJobs = sortedJobs;

  if (salesmanId) {
    const assignedJobIds = new Set(
      assignments.map((sale) => String(sale.serviceTitanJobId)),
    );

    filteredJobs = sortedJobs.filter((job) =>
      assignedJobIds.has(String(job.id)),
    );
  }

  // ------------------------------------------
  // TOTAL REVENUE
  // ------------------------------------------

  const summaryJobs = getCompletedJobs(filteredJobs);

  const totalRevenue = calculateJobRevenue(summaryJobs);

  // ------------------------------------------
  // TOTAL COMMISSION
  // REUSE THE SAME ASSIGNMENT RESULT
  // ------------------------------------------

  const totalCommission = assignments.reduce(
    (total, sale) => total + Number(sale.commissionEstimate || 0),
    0,
  );

  // ------------------------------------------
  // TEAM GOAL
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
// SUPPORTS SALESPERSON FILTERING
// ServiceTitan jobs use the shared date-range cache.
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

  // Always fetch live ServiceTitan data.
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

  const customerIds = [
    ...new Set(
      paginatedJobs
        .map((job) => job.customerId)
        .filter((id) => id !== undefined && id !== null && id !== ""),
    ),
  ];

  // ------------------------------------------
  // CURRENT PAGE SERVICE TITAN JOB IDS
  // ------------------------------------------

  const serviceTitanJobIds = paginatedJobs.map((job) => String(job.id));

  // ------------------------------------------
  // FETCH ASSIGNMENTS AND CUSTOMERS
  // ------------------------------------------

  const pageSaleAssignmentsPromise = salesmanId
    ? Promise.resolve(saleAssignments)
    : getRevenueSaleAssignments(serviceTitanJobIds);

  const [pageSaleAssignments, customerLookup] = await Promise.all([
    pageSaleAssignmentsPromise,
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
