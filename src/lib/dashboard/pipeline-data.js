
import { prisma } from "@/lib/prisma";

import {
  getAllEstimates,
  getAllServiceTitanCustomers,
} from "@/lib/integrations/servicetitan";

import {
  getFollowUpDateRange,
  getSelectedFilter,
} from "@/lib/dashboard/pipeline-helpers";

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

  const selectedUserId = isUserFilter
    ? selectedFilter.slice(5)
    : null;

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
        ...(dateRange.endExclusive
          ? { lt: dateRange.endExclusive }
          : {}),
      };
    }
  }

  return where;
}

// ============================================
// GET FOLLOW-UPS
// ============================================

async function getPipelineFollowUps(selectedFilter) {
  const where = buildFollowUpWhere(selectedFilter);

  const followUps = await prisma.followUp.findMany({
    where,
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
// GET SERVICETITAN DATA
// ============================================

async function getPipelineServiceTitanData() {
  const [estimates, customers] = await Promise.all([
    getAllEstimates({
      pageSize: 100,
      maxPages: 10,
    }),

    getAllServiceTitanCustomers({
      pageSize: 100,
      maxPages: 100,
    }),
  ]);

  return {
    estimates,
    customers,
  };
}

// ============================================
// GET ESTIMATE IDS
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
// CREATE CUSTOMER MAP
// ============================================

function createCustomerMap(customers = []) {
  return new Map(
    customers
      .filter(
        (customer) =>
          customer.stCustomerId !== undefined &&
          customer.stCustomerId !== null,
      )
      .map((customer) => [
        String(customer.stCustomerId),
        customer,
      ]),
  );
}

// ============================================
// FORMAT SERVICETITAN ESTIMATES
// ============================================

function formatPipelineEstimates(
  serviceTitanEstimates = [],
  serviceTitanCustomers = [],
  crmAssignments = [],
) {
  const assignmentMap = new Map(
    crmAssignments.map((assignment) => [
      String(assignment.serviceTitanEstimateId),
      assignment,
    ]),
  );

  const customerMap = createCustomerMap(serviceTitanCustomers);

  return serviceTitanEstimates.map((estimate) => {
    const estimateId = String(estimate.id);

    const assignment = assignmentMap.get(estimateId);

    const customer = customerMap.get(
      String(estimate.customerId),
    );

    const estimateValue =
      estimate.total ?? estimate.subtotal ?? estimate.amount ?? 0;

    return {
      id: estimateId,

      serviceTitanEstimateId:
        estimate.number || estimate.estimateNumber || estimate.id,

      customer: {
        businessName:
          customer?.pocName || estimate.customerName || "—",
      },

      value: Number(estimateValue) || 0,

      assignedTo: assignment?.assignedTo || null,

      source: assignment?.source || null,

      commissionEstimate: 0,
    };
  });
}

// ============================================
// APPLY USER FILTER TO ESTIMATES
// ============================================

function filterPipelineEstimates(
  estimates = [],
  crmAssignments = [],
  selectedUserId = null,
) {
  if (!selectedUserId) {
    return estimates;
  }

  const assignmentMap = new Map(
    crmAssignments.map((assignment) => [
      String(assignment.serviceTitanEstimateId),
      assignment,
    ]),
  );

  return estimates.filter((estimate) => {
    const assignment = assignmentMap.get(estimate.id);

    return assignment?.assignedToId === selectedUserId;
  });
}

// ============================================
// GET PIPELINE DATA
// ============================================

export async function getPipelineData({
  requestedFilter = "ALL",
} = {}) {
  // Fetch active users
  const users = await getPipelineUsers();

  // Validate selected filter
  const selectedFilter = getSelectedFilter(
    requestedFilter,
    users,
  );

  const isUserFilter = selectedFilter.startsWith("USER:");

  const selectedUserId = isUserFilter
    ? selectedFilter.slice(5)
    : null;

  // Fetch Follow-ups and ServiceTitan data
  const [followUps, serviceTitanData] = await Promise.all([
    getPipelineFollowUps(selectedFilter),
    getPipelineServiceTitanData(),
  ]);

  // Get CRM assignments
  const estimateIds = getServiceTitanEstimateIds(
    serviceTitanData.estimates,
  );

  const crmAssignments = await getEstimateAssignments(
    estimateIds,
  );

  // Format estimates
  const estimates = formatPipelineEstimates(
    serviceTitanData.estimates,
    serviceTitanData.customers,
    crmAssignments,
  );

  // Apply selected user filter
  const filteredEstimates = filterPipelineEstimates(
    estimates,
    crmAssignments,
    selectedUserId,
  );

  return {
    users,
    selectedFilter,
    followUpData: followUps,
    estimates: filteredEstimates,
  };
}
