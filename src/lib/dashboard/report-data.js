
import { prisma } from "@/lib/prisma";
import { getOpportunityCustomer } from "@/lib/opportunities/opportunity-customer";
import { getDateBounds, isWithinRange } from "@/lib/date/date-utils";
import { getRevenueJobsForRange } from "@/lib/dashboard/servicetitan-jobs";
import { getCustomerName } from "@/lib/dashboard/customer-sync";
import { getServiceTitanJobTypesByIds } from "@/lib/dashboard/servicetitan-lookups";
import { getDashboardEstimatesForRange } from "@/lib/dashboard/servicetitan-estimates";

import { getAllServiceTitanCustomers } from "@/lib/integrations/servicetitan";

// ============================================
// CONFIGURATION
// ============================================

const REPORT_TYPES = [
  "ALL",
  "SALES",
  "OPPORTUNITIES",
  "ESTIMATES",
  "COMMISSIONS",
];

// ============================================
// DATE HELPERS
// ============================================

function parseDateRange(startDate, endDate) {
  const { start, endExclusive } = getDateBounds(startDate, endDate);

  return {
    start,
    endExclusive,
    startISO: start.toISOString(),
    endExclusiveISO: endExclusive.toISOString(),
  };
}

// ============================================
// GENERAL HELPERS
// ============================================

function toNumber(value) {
  if (value === null || value === undefined) return 0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function normalizeId(value) {
  if (value === null || value === undefined) return null;

  return String(value);
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function formatDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

// ============================================
// AUTHORIZATION / FILTER VALIDATION
// ============================================

async function validateSalesperson(salesmanId) {
  if (!salesmanId || salesmanId === "ALL") {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: salesmanId,
      role: "SALESPERSON",
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Active salesperson not found.");
  }

  return user;
}

function validateReportType(reportType) {
  const normalized = String(reportType || "ALL").toUpperCase();

  if (!REPORT_TYPES.includes(normalized)) {
    throw new Error("Invalid report type.");
  }

  return normalized;
}

// ============================================
// SERVICETITAN PAGINATION
// ============================================

async function fetchAllJobs(dateRange) {
  const allJobs = await getRevenueJobsForRange({
    start: dateRange.start,
    endExclusive: dateRange.endExclusive,
  });

  const uniqueJobs = new Map();

  for (const job of allJobs) {
    if (job?.id !== null && job?.id !== undefined) {
      uniqueJobs.set(String(job.id), job);
    }
  }

  return [...uniqueJobs.values()].filter(
    (job) =>
      job.jobStatus === "Completed" &&
      isWithinRange(
        job.completedOn,
        dateRange.start,
        dateRange.endExclusive,
      ),
  );
}

async function fetchAllEstimates(dateRange) {
  const allEstimates = await getDashboardEstimatesForRange({
    start: dateRange.start,
    endExclusive: dateRange.endExclusive,
  });

  const uniqueEstimates = new Map();

  for (const estimate of allEstimates) {
    if (
      estimate?.id !== null &&
      estimate?.id !== undefined
    ) {
      uniqueEstimates.set(String(estimate.id), estimate);
    }
  }

  return [...uniqueEstimates.values()].filter((estimate) =>
    isWithinRange(
      estimate.createdOn,
      dateRange.start,
      dateRange.endExclusive,
    ),
  );
}

// ============================================
// DATABASE DATA
// ============================================

async function fetchSaleAssignments(jobs, salesmanId) {
  const jobIds = unique(
    jobs.map((job) => job.id),
  );

  if (!jobIds.length) return [];

  return prisma.sale.findMany({
    where: {
      serviceTitanJobId: {
        in: jobIds,
      },
      ...(salesmanId
        ? {
            salesmanId,
          }
        : {}),
    },
    select: {
      id: true,
      serviceTitanJobId: true,
      salesmanId: true,
      source: true,
      commissionEstimate: true,
      createdAt: true,
      updatedAt: true,
      salesman: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });
}

async function fetchOpportunities(dateRange, salesmanId) {
  return prisma.opportunity.findMany({
    where: {
      opportunityDate: {
        gte: dateRange.start,
        lt: dateRange.endExclusive,
      },
      ...(salesmanId
        ? {
            assignedToId: salesmanId,
          }
        : {}),
    },
    include: {
      customer: {
        select: {
          id: true,
          stCustomerId: true,
          businessName: true,
          pocName: true,
          phone: true,
          email: true,
          location: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      closedBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: {
      opportunityDate: "desc",
    },
  });
}

async function fetchCustomersByIds(customerIds) {
  const wantedIds = new Set(unique(customerIds));
  if (!wantedIds.size) return new Map();

  const allCustomers = await getAllServiceTitanCustomers({
    pageSize: 100,
    maxPages: 1000,
  });

  return new Map(
    allCustomers
      .map((customer) => [
        String(customer.stCustomerId ?? customer.id),
        customer,
      ])
      .filter(([id]) => wantedIds.has(id)),
  );
}

// ============================================
// ESTIMATE / OPPORTUNITY MATCHING
// ============================================

function matchEstimateOpportunity(estimate, opportunities) {
  const estimateId = normalizeId(estimate.id);
  const jobId = normalizeId(estimate.jobId);

  // First priority: exact Estimate ID.
  const exactMatch = opportunities.find(
    (opportunity) =>
      normalizeId(opportunity.titanEstimateId) === estimateId,
  );

  if (exactMatch) return exactMatch;

  // Second priority: matching ServiceTitan Job ID.
  if (jobId) {
    const jobMatch = opportunities.find(
      (opportunity) =>
        normalizeId(opportunity.titanJobId) === jobId,
    );

    if (jobMatch) return jobMatch;
  }

  return null;
}

// ============================================
// SALES REPORT
// ============================================

function buildSalesReport(jobs, sales, customers, jobTypes) {
  const salesMap = new Map(
    sales.map((sale) => [
      String(sale.serviceTitanJobId),
      sale,
    ]),
  );

  return jobs.map((job) => {
    const assignment = salesMap.get(String(job.id));
    const customer = customers.get(String(job.customerId));

    return {
      id: String(job.id),
      jobNumber: job.jobNumber || String(job.id),
      completedOn: formatDate(job.completedOn),
      customerId: normalizeId(job.customerId),
      customerName:
        customer?.businessName ||
        (customer ? getCustomerName(customer) : null) ||
        job.customerName ||
        `Customer #${job.customerId}`,
      jobTypeId: job.jobTypeId || null,
      jobTypeName:
        jobTypes.get(String(job.jobTypeId)) ||
        job.jobTypeName ||
        "—",
      businessUnitId: job.businessUnitId || null,
      revenue: toNumber(job.total),

      saleId: assignment?.id || null,
      salesmanId: assignment?.salesmanId || null,
      salesmanName: assignment?.salesman?.name || "Unassigned",
      source: assignment?.source || null,
      commissionEstimate: toNumber(
        assignment?.commissionEstimate,
      ),

      hasSaleAssignment: Boolean(assignment),
    };
  });
}

// ============================================
// OPPORTUNITY REPORT
// ============================================

function buildOpportunityReport(opportunities) {
  return opportunities.map((opportunity) => {
    const customer = getOpportunityCustomer(opportunity);
    return {
      id: opportunity.id,
      opportunityDate: formatDate(opportunity.opportunityDate),
      customerName:
        customer?.businessName || customer?.pocName || "Unknown Customer",
      customerId: opportunity.customerId,
      jobType: opportunity.jobType,
      value: toNumber(opportunity.value),
      source: opportunity.source,
      status: opportunity.status,
      assignedToId: opportunity.assignedToId,
      assignedToName: opportunity.assignedTo?.name || "Unassigned",
      closedById: opportunity.closedById,
      closedByName: opportunity.closedBy?.name || null,
      closedAt: formatDate(opportunity.closedAt),
      titanEstimateId: opportunity.titanEstimateId,
      titanJobId: opportunity.titanJobId,
    };
  });
}

// ============================================
// ESTIMATE REPORT
// ============================================

function buildEstimateReport(estimates, opportunities, customers) {
  return estimates.map((estimate) => {
    const opportunity = matchEstimateOpportunity(
      estimate,
      opportunities,
    );
    const customer = customers.get(String(estimate.customerId));

    const subtotal = toNumber(estimate.subtotal);
    const tax = toNumber(estimate.tax);

    return {
      id: normalizeId(estimate.id),
      jobId: normalizeId(estimate.jobId),
      jobNumber: estimate.jobNumber || null,
      customerId: normalizeId(estimate.customerId),
      customerName:
        customer?.businessName ||
        (customer ? getCustomerName(customer) : null) ||
        estimate.customerName ||
        `Customer #${estimate.customerId}`,

      name: estimate.name || "Untitled Estimate",
      createdOn: formatDate(estimate.createdOn),
      soldOn: formatDate(estimate.soldOn),

      status: estimate.status?.name || "Unknown",
      businessUnit: estimate.businessUnitName || null,

      subtotal,
      tax,
      total: subtotal + tax,

      opportunityId: opportunity?.id || null,
      salesmanId: opportunity?.assignedToId || null,
      salesmanName:
        opportunity?.assignedTo?.name || "Unassigned",

      opportunityStatus: opportunity?.status || null,
      opportunityValue: opportunity
        ? toNumber(opportunity.value)
        : null,

      attributionMethod: opportunity
        ? normalizeId(opportunity.titanEstimateId) ===
          normalizeId(estimate.id)
          ? "ESTIMATE_ID"
          : "JOB_ID"
        : "UNMATCHED",
    };
  });
}

// ============================================
// COMMISSION REPORT
// ============================================

function buildCommissionReport(salesReport) {
  return salesReport
    .filter((item) => item.saleId)
    .map((item) => ({
      saleId: item.saleId,
      jobId: item.id,
      jobNumber: item.jobNumber,
      completedOn: item.completedOn,
      customerName: item.customerName,
      salesmanId: item.salesmanId,
      salesmanName: item.salesmanName,
      source: item.source,
      revenue: item.revenue,
      commission: item.commissionEstimate,
    }));
}

// ============================================
// SUMMARY
// ============================================

function sum(items, field) {
  return items.reduce(
    (total, item) => total + toNumber(item[field]),
    0,
  );
}

function createSummary(data) {
  return {
    sales: {
      count: data.sales.length,
      totalRevenue: sum(data.sales, "revenue"),
      totalCommission: sum(data.sales, "commissionEstimate"),
      assignedCount: data.sales.filter(
        (item) => item.hasSaleAssignment,
      ).length,
      unassignedCount: data.sales.filter(
        (item) => !item.hasSaleAssignment,
      ).length,
    },

    opportunities: {
      count: data.opportunities.length,
      totalValue: sum(data.opportunities, "value"),
      openCount: data.opportunities.filter(
        (item) => item.status === "OPEN",
      ).length,
      wonCount: data.opportunities.filter(
        (item) => item.status === "WON",
      ).length,
      lostCount: data.opportunities.filter(
        (item) => item.status === "LOST",
      ).length,
    },

    estimates: {
      count: data.estimates.length,
      totalValue: sum(data.estimates, "total"),
      openCount: data.estimates.filter(
        (item) => item.status === "Open",
      ).length,
      soldCount: data.estimates.filter(
        (item) => item.status === "Sold",
      ).length,
    },

    commissions: {
      count: data.commissions.length,
      totalCommission: sum(data.commissions, "commission"),
    },
  };
}

// ============================================
// MAIN REPORT DATA FUNCTION
// ============================================

export async function getReportData({
  startDate,
  endDate,
  reportType = "ALL",
  salesmanId = "ALL",
}) {
  const dateRange = parseDateRange(startDate, endDate);

  const normalizedReportType = validateReportType(reportType);

  const selectedSalesperson = await validateSalesperson(
    salesmanId,
  );

  const selectedSalesmanId = selectedSalesperson?.id || null;

  // Fetch only the required external datasets.
  const needsSales =
    normalizedReportType === "ALL" ||
    normalizedReportType === "SALES" ||
    normalizedReportType === "COMMISSIONS";

  const needsEstimates =
    normalizedReportType === "ALL" ||
    normalizedReportType === "ESTIMATES";

  const needsOpportunities =
    normalizedReportType === "ALL" ||
    normalizedReportType === "OPPORTUNITIES" ||
    normalizedReportType === "ESTIMATES";

  const [jobs, estimates, opportunities] = await Promise.all([
    needsSales
      ? fetchAllJobs(dateRange)
      : Promise.resolve([]),

    needsEstimates
      ? fetchAllEstimates(dateRange)
      : Promise.resolve([]),

    needsOpportunities
      ? fetchOpportunities(dateRange, selectedSalesmanId)
      : Promise.resolve([]),
  ]);

  // Sales assignments are loaded for the complete job set.
  const sales = needsSales
    ? await fetchSaleAssignments(jobs, selectedSalesmanId)
    : [];

  // Customer information for ServiceTitan jobs.
  const customers = needsSales || needsEstimates
    ? await fetchCustomersByIds(
        unique([
          ...jobs.map((job) => job.customerId),
          ...estimates.map((estimate) => estimate.customerId),
        ]),
      )
    : new Map();

  const jobTypes = needsSales
    ? await getServiceTitanJobTypesByIds(jobs.map((job) => job.jobTypeId))
    : new Map();

  // Build report datasets.
  const salesReport = needsSales
    ? buildSalesReport(jobs, sales, customers, jobTypes)
    : [];

  const opportunityReport = needsOpportunities
    ? buildOpportunityReport(opportunities)
    : [];

  // For Estimate attribution, also check opportunities linked
  // by ServiceTitan Job ID, even if their opportunityDate is
  // outside the selected report period.
  let estimateAttributionOpportunities = opportunities;

  if (needsEstimates && estimates.length) {
    const estimateIds = unique(
      estimates.map((estimate) => estimate.id),
    );

    const estimateJobIds = unique(
      estimates.map((estimate) => estimate.jobId),
    );

    const attributionRecords = await prisma.opportunity.findMany({
      where: {
        OR: [
          {
            titanEstimateId: {
              in: estimateIds,
            },
          },
          {
            titanJobId: {
              in: estimateJobIds,
            },
          },
        ],
        ...(selectedSalesmanId
          ? {
              assignedToId: selectedSalesmanId,
            }
          : {}),
      },
      select: {
        id: true,
        titanEstimateId: true,
        titanJobId: true,
        opportunityDate: true,
        jobType: true,
        value: true,
        status: true,
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const attributionMap = new Map();

    for (const opportunity of [
      ...estimateAttributionOpportunities,
      ...attributionRecords,
    ]) {
      attributionMap.set(opportunity.id, opportunity);
    }

    estimateAttributionOpportunities = [
      ...attributionMap.values(),
    ];
  }

  const estimateReport = needsEstimates
    ? buildEstimateReport(
        estimates,
        estimateAttributionOpportunities,
      customers,
      )
    : [];

  const commissionReport =
    normalizedReportType === "ALL" ||
    normalizedReportType === "COMMISSIONS"
      ? buildCommissionReport(salesReport)
      : [];

  const data = {
    sales: salesReport,
    opportunities: opportunityReport,
    estimates: estimateReport,
    commissions: commissionReport,
  };

  const summary = createSummary(data);

  return {
    success: true,

    filters: {
      startDate,
      endDate,
      reportType: normalizedReportType,
      salesmanId: selectedSalesmanId || "ALL",
      salespersonName:
        selectedSalesperson?.name || "All Salespeople",
    },

    dateRange: {
      start: dateRange.start.toISOString(),
      endExclusive: dateRange.endExclusive.toISOString(),
    },

    summary,

    data,

    generatedAt: new Date().toISOString(),
  };
}
