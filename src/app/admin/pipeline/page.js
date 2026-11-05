import { prisma } from "@/lib/prisma";

import PageTagline from "@/components/ui/page-tagline";
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
  };

  if (selectedUserId) {
    followUpWhere.assignedToId = selectedUserId;
  }

  if (!isUserFilter) {
    const dateRange = getFollowUpDateRange(selectedFilter);

    if (dateRange) {
      followUpWhere.dueAt = dateRange;
    }
  }

  // Open estimates query
  const estimateWhere = {
    status: "OPEN",
  };

  if (selectedUserId) {
    estimateWhere.assignedToId = selectedUserId;
  }

  // Fetch Follow-ups and Estimates
  const [followUps, opportunities] = await Promise.all([
    prisma.followUp.findMany({
      where: followUpWhere,
      include: {
        opportunity: {
          include: {
            customer: {
              select: {
                businessName: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        dueAt: "asc",
      },
    }),

    prisma.opportunity.findMany({
      where: estimateWhere,
      include: {
        customer: {
          select: {
            businessName: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        opportunityDate: "desc",
      },
    }),
  ]);

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <div className="mb-7 text-[11px] text-[#555] sm:text-xs">
        <span className="font-medium text-black">Sales Tracker</span>

        <span className="mx-1">/</span>

        <span>In The Pipeline</span>
      </div>

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

      {/* Estimates */}
      <section className="w-full">
        <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
          Estimates
        </h2>

        <EstimatesTable opportunities={opportunities} />
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
