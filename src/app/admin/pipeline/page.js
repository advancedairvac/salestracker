import { prisma } from "@/lib/prisma";

import {
  getAllEstimates,
  getAllServiceTitanCustomers,
} from "@/lib/integrations/servicetitan";

import PageTagline from "@/components/ui/page-tagline";
import Breadcrumbs from "@/components/ui/breadcrumbs";

import PipelineFilter from "@/components/dashboard/pipeline-filter";
import FollowUpsTable from "@/components/dashboard/followUps-table";
import EstimatesTable from "@/components/dashboard/estimates-table";

export const metadata = {
  title: "In The Pipeline",
};

function getDayStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getFollowUpDateRange(filter) {
  const today = getDayStart(new Date());

  if (filter === "TODAY") {
    return {
      gte: today,
      lt: addDays(today, 1),
    };
  }

  if (filter === "TOMORROW") {
    return {
      gte: addDays(today, 1),
      lt: addDays(today, 2),
    };
  }

  if (filter === "NEXT_WEEK") {
    return {
      gte: addDays(today, 2),
      lt: addDays(today, 8),
    };
  }

  if (filter === "NEXT_MONTH") {
    const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 2, 1);

    return {
      gte: start,
      lt: end,
    };
  }

  if (filter === "BEYOND") {
    const start = new Date(today.getFullYear(), today.getMonth() + 2, 1);

    return {
      gte: start,
    };
  }

  return null;
}

function getSelectedFilter(value, users) {
  if (!value || value === "ALL") {
    return "ALL";
  }

  const dateFilters = [
    "TODAY",
    "TOMORROW",
    "NEXT_WEEK",
    "NEXT_MONTH",
    "BEYOND",
  ];

  if (dateFilters.includes(value)) {
    return value;
  }

  if (value.startsWith("USER:")) {
    const userId = value.slice(5);

    const userExists = users.some((user) => user.id === userId);

    if (userExists) {
      return value;
    }
  }

  return "ALL";
}

export default async function PipelinePage({ searchParams }) {
  const params = await searchParams;

  const requestedFilter =
    typeof params?.filter === "string" ? params.filter : "ALL";

  // Get active Admins and Salespersons
  const users = await prisma.user.findMany({
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

  const selectedFilter = getSelectedFilter(requestedFilter, users);

  const isUserFilter = selectedFilter.startsWith("USER:");
  const selectedUserId = isUserFilter ? selectedFilter.slice(5) : null;

  // Follow-up query
  const followUpWhere = {
    status: "PENDING",
    isActive: true,
  };

  if (selectedUserId) {
    followUpWhere.assignedToId = selectedUserId;
  }

  // ALL shows only upcoming follow-ups
  if (selectedFilter === "ALL") {
    followUpWhere.dueAt = {
      gte: new Date(),
    };
  } else if (!isUserFilter) {
    const dateRange = getFollowUpDateRange(selectedFilter);

    if (dateRange) {
      followUpWhere.dueAt = dateRange;
    }
  }

  // Fetch Follow-ups, ServiceTitan Estimates and Customers
  const [followUps, serviceTitanEstimates, serviceTitanCustomers] =
    await Promise.all([
      prisma.followUp.findMany({
        where: followUpWhere,
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
      }),

      getAllEstimates({
        pageSize: 100,
        maxPages: 10,
      }),

      getAllServiceTitanCustomers({
        pageSize: 100,
        maxPages: 100,
      }),
    ]);

  // Get ServiceTitan Estimate IDs
  const estimateIds = [
    ...new Set(
      serviceTitanEstimates
        .map((estimate) => estimate.id)
        .filter((id) => id !== undefined && id !== null)
        .map(String),
    ),
  ];

  // Find CRM assignments matching ServiceTitan Estimate IDs
  const crmAssignments = estimateIds.length
    ? await prisma.opportunity.findMany({
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
      })
    : [];

  // Map CRM assignments by ServiceTitan Estimate ID
  const assignmentMap = new Map(
    crmAssignments.map((assignment) => [
      String(assignment.serviceTitanEstimateId),
      assignment,
    ]),
  );

  // Map ServiceTitan Customers by Customer ID
  const customerMap = new Map(
    serviceTitanCustomers
      .filter((customer) => customer.stCustomerId)
      .map((customer) => [String(customer.stCustomerId), customer]),
  );

  // Format ServiceTitan Estimates
  const estimates = serviceTitanEstimates.map((estimate) => {
    const estimateId = String(estimate.id);

    const assignment = assignmentMap.get(estimateId);

    const customer = customerMap.get(String(estimate.customerId));

    return {
      id: estimateId,

      serviceTitanEstimateId:
        estimate.number || estimate.estimateNumber || estimate.id,

      customer: {
        businessName: customer?.pocName || estimate.customerName || "—",
      },

      value: estimate.total ?? estimate.subtotal ?? estimate.amount ?? 0,

      assignedTo: assignment?.assignedTo || null,

      source: assignment?.source || null,

      commissionEstimate: 0,
    };
  });

  // Apply Salesperson Filter
  const filteredEstimates = selectedUserId
    ? estimates.filter((estimate) => {
        const assignment = assignmentMap.get(estimate.id);

        return assignment?.assignedToId === selectedUserId;
      })
    : estimates;

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[{ label: "Sales Tracker", href: "/admin" }]}
        currentPage="In The Pipeline"
      />

      {/* Pipeline Filter */}
      <PipelineFilter users={users} selectedFilter={selectedFilter} />

      {/* Follow-ups */}
      <section className="mt-7 w-full">
        <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
          Follow-ups
        </h2>

        <FollowUpsTable followUps={followUps} />
      </section>

      {/* First Progress Separator */}
      <div className="my-8 flex w-full items-center">
        <div className="h-[4px] w-8 shrink-0 rounded-full bg-black" />
        <div className="h-[4px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      {/* ServiceTitan Estimates */}
      <section className="w-full">
        <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
          Estimates
        </h2>

        <EstimatesTable opportunities={filteredEstimates} />
      </section>

      {/* Second Progress Separator */}
      <div className="my-8 flex w-full items-center">
        <div className="h-[4px] w-8 shrink-0 rounded-full bg-black" />
        <div className="h-[4px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      {/* Page Tagline */}
      <PageTagline>Drive thy business, or it will drive thee.</PageTagline>
    </div>
  );
}
