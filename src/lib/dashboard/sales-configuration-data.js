import { prisma } from "@/lib/prisma";

import { getAllJobs } from "@/lib/integrations/servicetitan";
import { getServiceTitanJobTypesByIds } from "@/lib/dashboard/servicetitan-lookups";

import {
  getServiceTitanCustomersByIds,
  getCustomerName,
} from "@/lib/dashboard/customer-sync";

import { getSalesRevenueDateRange } from "@/lib/dashboard/revenue-data";

// ============================================
// CONFIGURATION
// ============================================

const SERVICE_TITAN_PAGE_SIZE = 500;
const MAX_SERVICE_TITAN_PAGES = 1000;
const ALLOWED_PAGE_SIZES = [9, 18, 27, 36];

// ============================================
// PAGINATION HELPERS
// ============================================

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getPaginationParams(searchParams = {}) {
  const requestedPage = getPositiveInteger(searchParams.page, 1);
  const requestedPageSize = getPositiveInteger(searchParams.pageSize, 9);

  return {
    requestedPage,
    pageSize: ALLOWED_PAGE_SIZES.includes(requestedPageSize)
      ? requestedPageSize
      : 9,
  };
}

function buildPagination(requestedPage, pageSize, totalItems) {
  const totalPages = Math.ceil(totalItems / pageSize);

  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

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
// JOB HELPERS
// ============================================

function getJobValue(job) {
  const value = Number(job.total ?? job.saleValue ?? 0);

  return Number.isFinite(value) ? value : 0;
}

function getTimestamp(value) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getJobCity(job, customer) {
  return (
    job.location?.city ||
    job.city ||
    job.locationName?.city ||
    customer?.city ||
    customer?.address?.city ||
    customer?.locations?.[0]?.city ||
    ""
  );
}

// ============================================
// FORMAT JOB CARD
// ============================================

function formatJob(job, customerMap, jobTypeMap, saleMap) {
  const jobId = String(job.id);
  const customer = customerMap[String(job.customerId || "")];

  const resolvedCustomerName = getCustomerName(customer);

  const customerName =
    resolvedCustomerName !== "—"
      ? resolvedCustomerName
      : job.customerName || "—";

  const jobTypeName = jobTypeMap.get(String(job.jobTypeId)) || "";
  const city = getJobCity(job, customer);
  const jobNumber = String(job.jobNumber || job.id);

  const title = [`Job #${jobNumber}:`, jobTypeName, city ? `in ${city}` : ""]
    .filter(Boolean)
    .join(" ");

  const sale = saleMap.get(jobId);

  return {
    serviceTitanJobId: jobId,
    jobNumber,
    title,
    customerName,
    saleValue: getJobValue(job),
    jobStatus: job.jobStatus || "",
    createdOn: job.createdOn || null,
    completedOn: job.completedOn || null,
    modifiedOn: job.modifiedOn || null,

    // Admin assignment
    source: sale?.source || null,
    salesmanId: sale?.salesmanId || null,
    salesmanName: sale?.salesman?.name || null,
    commissionEstimate: Number(sale?.commissionEstimate || 0),
  };
}

// ============================================
// MAIN DATA FUNCTION
// ============================================

export async function getSalesConfigurationData(searchParams = {}) {
  const { requestedPage, pageSize } = getPaginationParams(searchParams);
  const requestedTab = Array.isArray(searchParams.tab)
    ? searchParams.tab[0]
    : searchParams.tab;
  const allowedTabs = [
    "auto-assigned",
    "source-assigned",
    "salesman-assigned",
    "unassigned",
    "all",
  ];
  const activeTab = allowedTabs.includes(requestedTab)
    ? requestedTab
    : "all";

  // ------------------------------------------
  // REVENUE API DATE FILTERS
  // ------------------------------------------

  const dateRange = getSalesRevenueDateRange(searchParams);

  const apiFilters = {
    jobStatus: "Completed",
    completedOnOrAfter: dateRange.start.toISOString(),
    completedBefore: dateRange.endExclusive.toISOString(),
  };

  // ------------------------------------------
  // FETCH JOBS AND SALESPERSONS
  // ------------------------------------------

  const [jobsResult, salesmen] = await Promise.all([
    getAllJobs({
      pageSize: SERVICE_TITAN_PAGE_SIZE,
      maxPages: MAX_SERVICE_TITAN_PAGES,
      ...apiFilters,
    }),

    prisma.user.findMany({
      where: {
        role: {
          in: ["SALESPERSON", "ADMIN"],
        },
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const serviceTitanJobs = Array.isArray(jobsResult) ? jobsResult : [];

  // ------------------------------------------
  // SORT BY MODIFIED DATE
  // ------------------------------------------

  const sortedJobs = [...serviceTitanJobs].sort(
    (a, b) => getTimestamp(b.modifiedOn) - getTimestamp(a.modifiedOn),
  );

  const allServiceTitanJobIds = sortedJobs.map((job) => String(job.id));
  const savedSales = allServiceTitanJobIds.length
    ? await prisma.sale.findMany({
        where: {
          serviceTitanJobId: { in: allServiceTitanJobIds },
        },
        select: {
          serviceTitanJobId: true,
          source: true,
          salesmanId: true,
          autoAssigned: true,
          commissionEstimate: true,
          salesman: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    : [];

  const saleMap = new Map(
    savedSales.map((sale) => [String(sale.serviceTitanJobId), sale]),
  );

  const tabCounts = {
    "auto-assigned": 0,
    "source-assigned": 0,
    "salesman-assigned": 0,
    unassigned: 0,
    all: sortedJobs.length,
  };

  for (const job of sortedJobs) {
    const sale = saleMap.get(String(job.id));
    if (sale?.autoAssigned) tabCounts["auto-assigned"] += 1;
    if (sale?.source) tabCounts["source-assigned"] += 1;
    if (sale?.salesmanId) tabCounts["salesman-assigned"] += 1;
    if (!sale?.salesmanId) tabCounts.unassigned += 1;
  }

  const filteredJobs = sortedJobs.filter((job) => {
    const sale = saleMap.get(String(job.id));

    switch (activeTab) {
      case "auto-assigned":
        return Boolean(sale?.autoAssigned);
      case "source-assigned":
        return Boolean(sale?.source);
      case "salesman-assigned":
        return Boolean(sale?.salesmanId);
      case "unassigned":
        return !sale?.salesmanId;
      default:
        return true;
    }
  });

  // ------------------------------------------
  // SERVER-SIDE PAGINATION AFTER FILTERING
  // ------------------------------------------

  const pagination = buildPagination(
    requestedPage,
    pageSize,
    filteredJobs.length,
  );

  const startIndex = (pagination.currentPage - 1) * pagination.pageSize;

  const currentPageJobs = filteredJobs.slice(
    startIndex,
    startIndex + pagination.pageSize,
  );

  // ------------------------------------------
  // CURRENT PAGE IDS
  // ------------------------------------------

  const customerIds = [
    ...new Set(
      currentPageJobs
        .map((job) => job.customerId)
        .filter((id) => id !== undefined && id !== null && id !== "")
        .map(String),
    ),
  ];

  const jobTypeIds = [
    ...new Set(
      currentPageJobs
        .map((job) => job.jobTypeId)
        .filter((id) => id !== undefined && id !== null && id !== "")
        .map(String),
    ),
  ];


  // ------------------------------------------
  // FETCH CURRENT PAGE RELATED DATA
  // ------------------------------------------

  const [customerMap, jobTypeMap] = await Promise.all([
    getServiceTitanCustomersByIds(customerIds),
    getServiceTitanJobTypesByIds(jobTypeIds),
  ]);

  // ------------------------------------------
  // FORMAT CURRENT PAGE JOBS
  // ------------------------------------------

  const jobs = currentPageJobs.map((job) =>
    formatJob(job, customerMap, jobTypeMap, saleMap),
  );

  return {
    jobs,
    salesmen,
    activeTab,
    tabCounts,
    pagination,
  };
}
