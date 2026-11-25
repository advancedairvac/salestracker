import { prisma } from "@/lib/prisma";

import { getEstimates } from "@/lib/integrations/servicetitan";

import {
  getServiceTitanCustomersByIds,
  getCustomerName,
} from "@/lib/dashboard/customer-sync";

import {
  getFollowUpDateRange,
  getSelectedFilter,
} from "@/lib/dashboard/pipeline-helpers";

// ============================================
// CONFIGURATION
// ============================================

const PAGE_SIZES = [10, 20, 50, 100];

// ============================================
// GET ACTIVE PIPELINE USERS
// ============================================


async function getPipelineUsers() {
  return prisma.user.findMany({
    where: {
      role: {
        in: ["ADMIN", "SALESPERSON"],
      },
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: [
      {
        role: "asc",
      },
      {
        name: "asc",
      },
    ],
  });
}


// ============================================
// BUILD FOLLOW-UP QUERY
// ============================================

function buildFollowUpWhere(selectedFilter, salesmanId = null) {
  const isUserFilter = selectedFilter.startsWith("USER:");

  const selectedUserId = isUserFilter ? selectedFilter.slice(5) : null;

  const where = {
    status: "PENDING",
    isActive: true,

    // Follow-up must have a scheduled date.
    dueAt: {
      not: null,
    },

    // Only OPEN opportunities should appear.
    opportunity: {
      is: {
        status: "OPEN",
      },
    },
  };

  // Explicit salesperson filter takes priority.
  if (salesmanId) {
    where.assignedToId = salesmanId;
  } else if (selectedUserId) {
    where.assignedToId = selectedUserId;
  }

  // ALL includes both upcoming and overdue follow-ups.
  if (selectedFilter !== "ALL" && !isUserFilter) {
    const dateRange = getFollowUpDateRange(selectedFilter);

    if (dateRange) {
      where.dueAt = {
        gte: dateRange.start,
        ...(dateRange.endExclusive ? { lt: dateRange.endExclusive } : {}),
      };
    }
  }

  return where;
}

// ============================================
// GET FOLLOW-UPS
// One upcoming/overdue follow-up per opportunity
// ============================================

async function getPipelineFollowUps(selectedFilter, salesmanId = null) {
  const followUps = await prisma.followUp.findMany({
    where: buildFollowUpWhere(selectedFilter, salesmanId),

    include: {
      opportunity: {
        include: {
          customer: {
            select: {
              businessName: true,
              pocName: true,
            },
          },
        },
      },

      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
    },

    // Earliest due date comes first.
    orderBy: [
      {
        dueAt: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  // ==========================================
  // KEEP ONLY ONE FOLLOW-UP PER OPPORTUNITY
  // ==========================================

  const selectedFollowUps = [];
  const processedOpportunityIds = new Set();

  for (const followUp of followUps) {
    const opportunityId = followUp.opportunityId;

    if (!opportunityId) continue;

    // Skip if this opportunity already has
    // its nearest eligible follow-up selected.
    if (processedOpportunityIds.has(opportunityId)) {
      continue;
    }

    processedOpportunityIds.add(opportunityId);

    selectedFollowUps.push({
      ...followUp,

      // Temporary value.
      // Commission calculation will be implemented
      // later with the Commission Rule feature.
      commissionEstimate: 0,

      opportunity: followUp.opportunity
        ? {
            ...followUp.opportunity,

            value:
              followUp.opportunity.value !== null &&
              followUp.opportunity.value !== undefined
                ? Number(followUp.opportunity.value)
                : null,
          }
        : null,
    });
  }

  return selectedFollowUps;
}

// ============================================
// GET SERVICETITAN CUSTOMER IDS
// ============================================

function getServiceTitanCustomerIds(estimates = []) {
  return [
    ...new Set(
      estimates
        .map((estimate) => estimate.customerId)
        .filter((id) => id !== undefined && id !== null)
        .map(String),
    ),
  ];
}

// ============================================
// FORMAT PIPELINE ESTIMATES
// No Salesperson or Source lookup
// ============================================

function formatPipelineEstimates(
  serviceTitanEstimates = [],
  serviceTitanCustomers = {},
) {
  return serviceTitanEstimates.map((estimate) => {
    const estimateId = String(estimate.id);

    const customer = serviceTitanCustomers[String(estimate.customerId)] || null;

    const customerName = getCustomerName(customer);

    const estimateValue =
      estimate.total ?? estimate.subtotal ?? estimate.amount ?? 0;

    return {
      id: estimateId,

      serviceTitanEstimateId:
        estimate.number || estimate.estimateNumber || estimate.id,

      customer: {
        businessName:
          customerName !== "—" ? customerName : estimate.customerName || "—",
      },

      value: Number(estimateValue) || 0,
    };
  });
}

// ============================================
// NORMALIZE PAGINATION
// ============================================

function normalizePagination(page, pageSize) {
  const requestedPage = Number(page);
  const requestedPageSize = Number(pageSize);

  return {
    page:
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,

    pageSize: PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : 10,
  };
}

// ============================================
// GET SERVER-PAGINATED ESTIMATES
// Fetch only the requested page
// ============================================

async function getPaginatedPipelineEstimates({ page, pageSize }) {
  const result = await getEstimates({
    page,
    pageSize,
    includeTotal: true,
  });

  const serviceTitanEstimates = Array.isArray(result.data) ? result.data : [];

  const customerIds = getServiceTitanCustomerIds(serviceTitanEstimates);

  const customerResult = customerIds.length
    ? await getServiceTitanCustomersByIds(customerIds)
    : {};

  const estimates = formatPipelineEstimates(
    serviceTitanEstimates,
    customerResult,
  );

  const totalItems = Number(
    result.totalCount ?? result.totalItems ?? result.count ?? 0,
  );

  return {
    estimates,

    pagination: {
      currentPage: page,
      pageSize,

      totalItems:
        Number.isFinite(totalItems) && totalItems >= 0
          ? totalItems
          : estimates.length,
    },

    isServerPaginated: true,
  };
}

// ============================================
// PIPELINE PAGE DATA
// Users + Selected Filter
// ============================================

export async function getPipelinePageData({ requestedFilter = "ALL" } = {}) {
  const users = await getPipelineUsers();

  const selectedFilter = getSelectedFilter(requestedFilter, users);

  return {
    users,
    selectedFilter,
  };
}

// ============================================
// PIPELINE FOLLOW-UP DATA
// Supports optional salesperson filtering
// ============================================

export async function getPipelineFollowUpsData({
  selectedFilter = "ALL",
  salesmanId = null,
} = {}) {
  return getPipelineFollowUps(selectedFilter, salesmanId);
}

// ============================================
// PIPELINE ESTIMATES DATA
// ============================================

export async function getPipelineEstimatesData({
  requestedPage = 1,
  requestedPageSize = 10,
} = {}) {
  const { page, pageSize } = normalizePagination(
    requestedPage,
    requestedPageSize,
  );

  return getPaginatedPipelineEstimates({
    page,
    pageSize,
  });
}

// ============================================
// LEGACY COMBINED PIPELINE DATA
// Compatibility with existing callers
// ============================================

export async function getPipelineData({
  requestedFilter = "ALL",
  requestedPage = 1,
  requestedPageSize = 10,
} = {}) {
  const { users, selectedFilter } = await getPipelinePageData({
    requestedFilter,
  });

  const [followUpData, estimateResult] = await Promise.all([
    getPipelineFollowUpsData({
      selectedFilter,
    }),

    getPipelineEstimatesData({
      requestedPage,
      requestedPageSize,
    }),
  ]);

  return {
    users,
    selectedFilter,
    followUpData,
    estimates: estimateResult.estimates,
    pagination: estimateResult.pagination,
    isServerPaginated: estimateResult.isServerPaginated,
  };
}
