import { prisma } from "@/lib/prisma";

import {
  getEstimates,
  getAllEstimates,
  getAllServiceTitanCustomers,
} from "@/lib/integrations/servicetitan";

import {
  getServiceTitanCustomersByIds,
  getCustomerName,
} from "@/lib/dashboard/customer-sync";

import {
  getFollowUpDateRange,
  getSelectedFilter,
} from "@/lib/dashboard/pipeline-helpers";

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
// GET SERVICETITAN ESTIMATE IDS
// ============================================

function getServiceTitanEstimateIds(estimates = []) {
  return [
    ...new Set(
      estimates
        .map((estimate) => estimate.id)
        .filter((id) => id !== undefined && id !== null)
        .map(String),
    ),
  ];
}

// ============================================
// GET CRM ESTIMATE ASSIGNMENTS
// ============================================

async function getEstimateAssignments(estimateIds = []) {
  if (!estimateIds.length) {
    return [];
  }

  return prisma.opportunity.findMany({
    where: {
      serviceTitanEstimateId: {
        in: estimateIds,
      },
    },
    select: {
      serviceTitanEstimateId: true,
      source: true,
      assignedToId: true,
      assignedTo: {
        select: {
          name: true,
        },
      },
    },
  });
}

// ============================================
// FORMAT SERVICETITAN ESTIMATES
// ============================================

function formatPipelineEstimates(
  serviceTitanEstimates = [],
  serviceTitanCustomers = {},
  crmAssignments = [],
) {
  const assignmentMap = new Map(
    crmAssignments.map((assignment) => [
      String(assignment.serviceTitanEstimateId),
      assignment,
    ]),
  );

  return serviceTitanEstimates.map((estimate) => {
    const estimateId = String(estimate.id);

    const assignment = assignmentMap.get(estimateId);

    // Customer Sync returns an object keyed by ServiceTitan customer ID.
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

      assignedTo: assignment?.assignedTo || null,

      source: assignment?.source || null,

      commissionEstimate: 0,
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
// ============================================

async function getPaginatedPipelineEstimates({ page, pageSize }) {
  // Fetch only the requested ServiceTitan estimate page.
  const result = await getEstimates({
    page,
    pageSize,
    includeTotal: true,
  });

  const serviceTitanEstimates = Array.isArray(result.data) ? result.data : [];

  // Collect current-page estimate IDs.
  const estimateIds = getServiceTitanEstimateIds(serviceTitanEstimates);

  // Collect unique customer IDs from current-page estimates.
  const customerIds = [
    ...new Set(
      serviceTitanEstimates
        .map((estimate) => estimate.customerId)
        .filter((id) => id !== undefined && id !== null)
        .map(String),
    ),
  ];

  // Fetch only current-page CRM assignments and customers.
  const [crmAssignments, customerResult] = await Promise.all([
    getEstimateAssignments(estimateIds),

    getServiceTitanCustomersByIds(customerIds),
  ]);

  // Format current-page estimates using the Customer Sync lookup.
  const estimates = formatPipelineEstimates(
    serviceTitanEstimates,
    customerResult,
    crmAssignments,
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
// LEGACY SALESPERSON FILTER
// Keep existing behavior for now.
// ============================================

async function getLegacyUserFilteredEstimates(selectedUserId) {
  const [serviceTitanEstimates, serviceTitanCustomers] = await Promise.all([
    getAllEstimates({
      pageSize: 100,
      maxPages: 10,
    }),

    getAllServiceTitanCustomers({
      pageSize: 100,
      maxPages: 100,
    }),
  ]);

  const estimateIds = getServiceTitanEstimateIds(serviceTitanEstimates);

  const crmAssignments = await getEstimateAssignments(estimateIds);

  const estimates = formatPipelineEstimates(
    serviceTitanEstimates,
    serviceTitanCustomers.reduce((lookup, customer) => {
      if (
        customer?.stCustomerId !== undefined &&
        customer?.stCustomerId !== null
      ) {
        lookup[String(customer.stCustomerId)] = customer;
      }

      return lookup;
    }, {}),
    crmAssignments,
  );

  const assignmentMap = new Map(
    crmAssignments.map((assignment) => [
      String(assignment.serviceTitanEstimateId),
      assignment,
    ]),
  );

  const filteredEstimates = estimates.filter((estimate) => {
    const assignment = assignmentMap.get(estimate.id);

    return assignment?.assignedToId === selectedUserId;
  });

  return {
    estimates: filteredEstimates,

    pagination: {
      currentPage: 1,
      pageSize: 10,
      totalItems: filteredEstimates.length,
    },

    isServerPaginated: false,
  };
}

// ============================================
// GET PIPELINE DATA
// ============================================

export async function getPipelineData({
  requestedFilter = "ALL",
  requestedPage = 1,
  requestedPageSize = 10,
} = {}) {
  // Fetch active users.
  const users = await getPipelineUsers();

  // Validate selected filter.
  const selectedFilter = getSelectedFilter(requestedFilter, users);

  const isUserFilter = selectedFilter.startsWith("USER:");

  const selectedUserId = isUserFilter ? selectedFilter.slice(5) : null;

  // Normalize pagination.
  const { page, pageSize } = normalizePagination(
    requestedPage,
    requestedPageSize,
  );

  // Fetch follow-ups and estimates.
  const [followUps, estimateResult] = await Promise.all([
    getPipelineFollowUps(selectedFilter),

    isUserFilter
      ? getLegacyUserFilteredEstimates(selectedUserId)
      : getPaginatedPipelineEstimates({
          page,
          pageSize,
        }),
  ]);

  return {
    users,

    selectedFilter,

    followUpData: followUps,

    estimates: estimateResult.estimates,

    pagination: estimateResult.pagination,

    isServerPaginated: estimateResult.isServerPaginated,
  };
}
