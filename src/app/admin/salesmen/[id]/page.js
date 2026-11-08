import { redirect, notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import RevenueSummary from "@/components/dashboard/revenue-summary";
import RevenueTable from "@/components/dashboard/revenue-table";
import EstimatesTable from "@/components/dashboard/estimates-table";
import FollowUpsTable from "@/components/dashboard/followUps-table";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Salesman Details",
};

// ============================================
// HELPERS
// ============================================

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getInitialDateRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getDateRange(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00.000`);
  const end = new Date(`${endDate}T23:59:59.999`);

  return { start, end };
}

function calculateRevenue(sales) {
  return sales.reduce((total, sale) => total + Number(sale.saleValue || 0), 0);
}

function calculateCloseRate(opportunities) {
  const won = opportunities.filter(
    (opportunity) => opportunity.status === "WON",
  ).length;

  const lost = opportunities.filter(
    (opportunity) => opportunity.status === "LOST",
  ).length;

  const closed = won + lost;

  return closed > 0 ? Math.round((won / closed) * 100) : 0;
}

// ============================================
// SALESMAN DETAILS PAGE
// ============================================

export default async function SalesmanDetailsPage({ params, searchParams }) {
  // ============================================
  // AUTHENTICATION
  // ============================================

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/salesperson");
  }

  // ============================================
  // ROUTE & SEARCH PARAMETERS
  // ============================================

  const { id } = await params;
  const query = await searchParams;

  const defaultRange = getInitialDateRange();

  const requestedStartDate = query?.startDate || defaultRange.startDate;
  const requestedEndDate = query?.endDate || defaultRange.endDate;

  const validRange =
    isValidDateString(requestedStartDate) &&
    isValidDateString(requestedEndDate) &&
    requestedStartDate <= requestedEndDate;

  const startDate = validRange ? requestedStartDate : defaultRange.startDate;

  const endDate = validRange ? requestedEndDate : defaultRange.endDate;

  const { start, end } = getDateRange(startDate, endDate);

  // ============================================
  // SALESMAN INFORMATION
  // ============================================

  const salesman = await prisma.user.findFirst({
    where: {
      id,
      role: {
        in: ["ADMIN", "SALESPERSON"],
      },
    },
    select: {
      id: true,
      name: true,
      title: true,
      monthlyGoal: true,
    },
  });

  if (!salesman) {
    notFound();
  }

  // ============================================
  // DATABASE QUERIES
  // ============================================

  const [sales, opportunities, followUps, closedOpportunities] =
    await Promise.all([
      // Sales closed by this salesman within selected date range
      prisma.sale.findMany({
        where: {
          closedById: salesman.id,
          closedAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: {
          closedAt: "desc",
        },
        include: {
          closedBy: {
            select: {
              name: true,
            },
          },
          opportunity: {
            select: {
              customer: {
                select: {
                  businessName: true,
                },
              },
            },
          },
        },
      }),

      // Open opportunities assigned to this salesman
      prisma.opportunity.findMany({
        where: {
          assignedToId: salesman.id,
          status: "OPEN",
        },
        orderBy: {
          updatedAt: "desc",
        },
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
      }),

      // Pending follow-ups assigned to this salesman
      prisma.followUp.findMany({
        where: {
          assignedToId: salesman.id,
          status: "PENDING",
          dueAt: {
            not: null,
          },
        },
        orderBy: {
          dueAt: "asc",
        },
        include: {
          opportunity: {
            select: {
              id: true,
              title: true,
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
      }),

      // Won and lost opportunities within selected date range
      prisma.opportunity.findMany({
        where: {
          assignedToId: salesman.id,
          status: {
            in: ["WON", "LOST"],
          },
          closedAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          status: true,
        },
      }),
    ]);

  // ============================================
  // REVENUE CALCULATIONS
  // ============================================

  const totalRevenue = calculateRevenue(sales);

  const monthlyGoal = Number(salesman.monthlyGoal || 0);

  const closeRate = calculateCloseRate(closedOpportunities);

  // ============================================
  // REVENUE TABLE DATA
  // ============================================

  const revenueData = sales.map((sale) => ({
    id: sale.id,
    serviceTitanJobId: sale.serviceTitanJobId,
    customerName: sale.opportunity?.customer?.businessName || "—",
    saleValue: Number(sale.saleValue || 0),
    source: sale.source,
    salesmanName: sale.closedBy?.name || "—",
  }));

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
          {
            label: "Dashboard",
            href: "/admin/salesmen",
          },
        ]}
        currentPage={salesman.name}
      />

      {/* Date Selector */}
      <RevenueDateFilter
        value={{
          startDate,
          endDate,
        }}
        basePath={`/admin/salesmen/${salesman.id}`}
      />

      {/* Salesman Information */}
      <section className="border-b border-[#d9d9d9] pb-5">
        <div className="flex items-start justify-between gap-4 px-1">
          <div>
            <h1 className="text-base font-bold uppercase text-black sm:text-lg">
              {salesman.name}
            </h1>

            <p className="mt-1 text-xs uppercase text-[#777]">
              {salesman.title || "Salesperson"}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-black">{closeRate}%</p>

            <p className="text-[10px] uppercase text-[#777]">Close Rate</p>
          </div>
        </div>
      </section>

      {/* Sales Revenue */}
      <section className="space-y-4">
        <h2 className="px-1 text-sm font-bold uppercase text-black sm:text-base">
          Sales Revenue
        </h2>

        <RevenueSummary
          revenue={totalRevenue}
          monthlyGoal={monthlyGoal}
          startDate={startDate}
          endDate={endDate}
          commissionRate={5}
        />

        {/* Revenue Details */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase text-[#555]">
              Revenue Details
            </h3>

            <span className="shrink-0 text-xs text-[#777]">
              {revenueData.length} {revenueData.length === 1 ? "Sale" : "Sales"}
            </span>
          </div>

          <RevenueTable sales={revenueData} />
        </section>
      </section>

      {/* Section Divider */}
      <div className="flex items-center gap-0 pt-2">
        <div className="h-[4px] w-8 rounded-full bg-black" />
        <div className="h-[3px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      {/* Follow-ups */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-bold uppercase text-black sm:text-base">
          Follow-ups
        </h2>

        <FollowUpsTable followUps={followUps} />
      </section>

      {/* Section Divider */}
      <div className="flex items-center gap-0 pt-2">
        <div className="h-[4px] w-8 rounded-full bg-black" />
        <div className="h-[3px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      {/* Estimates */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-bold uppercase text-black sm:text-base">
          Estimates
        </h2>

        <EstimatesTable opportunities={opportunities} />
      </section>

      {/* Section Divider */}
      <div className="flex items-center gap-0 pt-2">
        <div className="h-[4px] w-8 rounded-full bg-black" />
        <div className="h-[3px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      {/* Page Tagline */}
      <PageTagline>Men produce, boys consume.</PageTagline>
    </div>
  );
}
