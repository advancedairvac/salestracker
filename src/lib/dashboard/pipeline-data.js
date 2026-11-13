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
      isActive: true,
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

function buildFollowUpWhere(selectedFilter) {
  const isUserFilter = selectedFilter.startsWith("USER:");

  const selectedUserId = isUserFilter ? selectedFilter.slice(5) : null;

  const where = {
    status: "PENDING",
    isActive: true,
  };

  if (selectedUserId) {
    where.assignedToId = selectedUserId;
  }

  // ALL shows only upcoming follow-ups.
  if (selectedFilter === "ALL") {
    where.dueAt = {
      gte: new Date(),
    };
  } else if (!isUserFilter) {
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
// ============================================

async function getPipelineFollowUps(selectedFilter) {
  const followUps = await prisma.followUp.findMany({
    where: buildFollowUpWhere(selectedFilter),

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

    orderBy: {
      dueAt: "asc",
    },
  });

  return followUps.map((followUp) => ({
    ...followUp,

    commissionEstimate:
      followUp.commissionEstimate !== null &&
      followUp.commissionEstimate !== undefined
        ? Number(followUp.commissionEstimate)
        : 0,

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
  }));
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
  // Fetch only the requested ServiceTitan estimate page.
  const result = await getEstimates({
    page,
    pageSize,
    includeTotal: true,
  });

  const serviceTitanEstimates = Array.isArray(result.data) ? result.data : [];

  // Collect unique customer IDs from current-page estimates.
  const customerIds = getServiceTitanCustomerIds(serviceTitanEstimates);

  // Fetch only current-page customers.
  const customerResult = customerIds.length
    ? await getServiceTitanCustomersByIds(customerIds)
    : {};

  // Format current-page estimates.
  const estimates = formatPipelineEstimates(
    serviceTitanEstimates,
    customerResult,
  );

  // ServiceTitan total count.
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
// ============================================

export async function getPipelineFollowUpsData({
  selectedFilter = "ALL",
} = {}) {
  return getPipelineFollowUps(selectedFilter);
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
