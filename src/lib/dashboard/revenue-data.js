import { prisma } from "@/lib/prisma";

import { getRevenueJobs } from "@/lib/integrations/servicetitan";

import {
  getServiceTitanCustomersByIds,
  getCustomerName,
} from "@/lib/dashboard/customer-sync";

import {
  getDateRange,
  getDateBounds,
  isValidDateString,
} from "@/lib/date/date-utils";

import { getGoalConfiguration, calculateTeamGoal } from "@/lib/date/goal-utils";

import {
  getCompletedJobs,
  calculateJobRevenue,
} from "@/lib/dashboard/servicetitan-helpers";

import { getDashboardTeamMembers } from "@/lib/dashboard/dashboard-data";

// ============================================
// CONFIGURATION
// ============================================

const VALID_PRESETS = [
  "Custom",
  "Today",
  "Yesterday",
  "Last 7 Days",
  "Last 30 Days",
  "Last 365 Days",
  "MTD",
  "QTD",
  "YTD",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
];

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
  const initialRange = getDateRange("MTD");

  const requestedPreset = getQueryValue(searchParams.preset);

  const preset = VALID_PRESETS.includes(requestedPreset)
    ? requestedPreset
    : "MTD";

  const requestedStartDate = getQueryValue(searchParams.startDate);
  const requestedEndDate = getQueryValue(searchParams.endDate);

  const hasValidCustomRange =
    isValidDateString(requestedStartDate) &&
    isValidDateString(requestedEndDate) &&
    requestedStartDate <= requestedEndDate;

  const startDate = hasValidCustomRange
    ? requestedStartDate
    : initialRange.startDate;

  const endDate = hasValidCustomRange ? requestedEndDate : initialRange.endDate;

  const dateBounds = getDateBounds(startDate, endDate);

  if (!dateBounds) {
    throw new Error("Invalid revenue date range.");
  }

  return {
    preset,
    startDate,
    endDate,
    start: dateBounds.start,
    endExclusive: dateBounds.endExclusive,
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

async function fetchAllRevenueJobs({ startDate, endDate } = {}) {
  const allJobs = [];
  const seenJobIds = new Set();

  let page = 1;
  let expectedTotal = null;

  while (page <= MAX_SERVICE_TITAN_PAGES) {
    const result = await getRevenueJobs({
      page,
      pageSize: SERVICE_TITAN_PAGE_SIZE,
      includeTotal: true,

      jobStatus: "Completed",
      completedOnOrAfter: startDate,
      completedBefore: endDate,
    });

    const jobs = Array.isArray(result.data) ? result.data : [];

    if (page === 1) {
      const totalCount = Number(result.totalCount);

      expectedTotal =
        Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : null;
    }

    for (const job of jobs) {
      if (!job?.id) {
        continue;
      }

      const jobId = String(job.id);

      if (seenJobIds.has(jobId)) {
        continue;
      }

      seenJobIds.add(jobId);
      allJobs.push(job);
    }

    if (jobs.length === 0 || result.hasMore === false) {
      break;
    }

    // Only use totalCount as a stopping condition
    // when the API does not provide hasMore.
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
  if (source === "SELF_GENERATED") {
    return "Self Generated";
  }

  if (source === "COMPANY_GENERATED") {
    return "Company Generated";
  }

  return "—";
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
      startDate,
      endDate,
    }),

    getDashboardTeamMembers(),
  ]);

  // ------------------------------------------
  // FILTER ALL COMPLETED JOBS
  // Includes zero-value jobs in the table.
  // ------------------------------------------

  const matchingJobs = revenueJobResult.jobs.filter((job) => {
    if (job.jobStatus !== "Completed") {
      return false;
    }

    const completedDate = new Date(job.completedOn);

    return (
      Number.isFinite(completedDate.getTime()) &&
      completedDate >= start &&
      completedDate < endExclusive
    );
  });

  const sortedJobs = sortRevenueJobs(matchingJobs);

  // ------------------------------------------
  // REVENUE SUMMARY
  // Preserve existing calculation semantics.
  // ------------------------------------------

  const summaryJobs = getCompletedJobs(sortedJobs);

  const totalRevenue = calculateJobRevenue(summaryJobs);

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
    .filter((id) => id !== undefined && id !== null);

  // ------------------------------------------
  // FETCH CURRENT PAGE ASSIGNMENTS AND CUSTOMERS
  // ------------------------------------------

  const serviceTitanJobIds = paginatedJobs.map((job) => String(job.id));

  const [saleAssignments, customerLookup] = await Promise.all([
    getRevenueSaleAssignments(serviceTitanJobIds),

    getServiceTitanCustomersByIds(customerIds),
  ]);

  // ------------------------------------------
  // BUILD TABLE DATA
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
