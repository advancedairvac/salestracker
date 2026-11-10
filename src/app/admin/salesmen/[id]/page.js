import { redirect, notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import { PRESETS, getInitialRange } from "@/lib/date/date-utils";
import { getGoalConfiguration, calculateTeamGoal } from "@/lib/date/goal-utils";

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
// DATE HELPERS
// ============================================

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getDateRange(startDate, endDate) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  return {
    start: new Date(startYear, startMonth - 1, startDay),
    endExclusive: new Date(endYear, endMonth - 1, endDay + 1),
  };
}

function getLeadSourceLabel(source) {
  switch (source) {
    case "SELF_GENERATED":
      return "Self-generated";

    case "COMPANY_GENERATED":
      return "Company-generated";

    default:
      return "—";
  }
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

  const defaultRange = getInitialRange();

  const requestedStartDate =
    typeof query?.startDate === "string"
      ? query.startDate
      : defaultRange.startDate;

  const requestedEndDate =
    typeof query?.endDate === "string" ? query.endDate : defaultRange.endDate;

  const validRange =
    isValidDateString(requestedStartDate) &&
    isValidDateString(requestedEndDate) &&
    requestedStartDate <= requestedEndDate;

  const startDate = validRange ? requestedStartDate : defaultRange.startDate;

  const endDate = validRange ? requestedEndDate : defaultRange.endDate;

  const requestedPreset =
    typeof query?.preset === "string" ? query.preset : "MTD";

  const selectedPreset = PRESETS.includes(requestedPreset)
    ? requestedPreset
    : "MTD";

  const { start, endExclusive } = getDateRange(startDate, endDate);

  // ============================================
  // SALESPERSON INFORMATION
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
      quarterlyGoal: true,
      annualGoal: true,
    },
  });

  if (!salesman) {
    notFound();
  }

  // ============================================
  // GOAL CONFIGURATION
  // ============================================

  const goalConfiguration = getGoalConfiguration(
    selectedPreset,
    startDate,
    endDate,
  );

  const selectedPeriodGoal = calculateTeamGoal(
    [salesman],
    goalConfiguration.goalType,
  );

  // ============================================
  // FETCH DATA FROM POSTGRESQL
  // ============================================

  const [sales, opportunities, followUps] = await Promise.all([
    // Sales assigned to this salesperson
    prisma.sale.findMany({
      where: {
        salesmanId: salesman.id,
        saleValue: {
          gt: 0,
        },
        completedAt: {
          gte: start,
          lt: endExclusive,
        },
      },
      orderBy: {
        completedAt: "desc",
      },
      select: {
        id: true,
        serviceTitanJobId: true,
        serviceTitanJobNumber: true,
        customerName: true,
        saleValue: true,
        source: true,
        completedAt: true,
        customer: {
          select: {
            businessName: true,
          },
        },
      },
    }),

    // Open opportunities assigned to this salesperson
    prisma.opportunity.findMany({
      where: {
        assignedToId: salesman.id,
        status: "OPEN",
        opportunityDate: {
          gte: start,
          lt: endExclusive,
        },
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

    // Future pending follow-ups assigned to this salesperson
    prisma.followUp.findMany({
      where: {
        assignedToId: salesman.id,
        status: "PENDING",
        isActive: true,
        dueAt: {
          gte: new Date(),
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
            jobType: true,
            customer: {
              select: {
                businessName: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                name: true,
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
  ]);

  // ============================================
  // SERIALIZE OPPORTUNITIES
  // ============================================

  const opportunityData = opportunities.map((opportunity) => ({
    ...opportunity,
    value:
      opportunity.value !== null && opportunity.value !== undefined
        ? Number(opportunity.value)
        : null,
  }));

  // ============================================
  // SALESMAN REVENUE
  // ============================================

  const totalRevenue = sales.reduce(
    (total, sale) => total + Number(sale.saleValue || 0),
    0,
  );

  // ============================================
  // REVENUE TABLE DATA
  // ============================================

  const revenueData = sales.map((sale) => ({
    id: sale.id,
    serviceTitanJobId: sale.serviceTitanJobNumber || sale.serviceTitanJobId,
    customerName: sale.customerName || sale.customer?.businessName || "—",
    saleValue: Number(sale.saleValue || 0),
    source: getLeadSourceLabel(sale.source),
    salesmanName: salesman.name,
  }));

  // ============================================
  // REVENUE SUMMARY
  // ============================================

  const commissionRate = 5;

  const estimatedCommission = (totalRevenue * commissionRate) / 100;

  // ============================================
  // CLOSE RATE
  // ============================================

  const closeRate = 0;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-5">
      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
          {
            label: "Dashboard",
            href: "/admin",
          },
        ]}
        currentPage={salesman.name}
      />

      <RevenueDateFilter
        value={{
          startDate,
          endDate,
        }}
        preset={selectedPreset}
        basePath={`/admin/salesmen/${salesman.id}`}
      />

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
          goal={selectedPeriodGoal}
          goalLabel={goalConfiguration.label}
          commissionRate={commissionRate}
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

      <div className="flex items-center gap-0 pt-2">
        <div className="h-[4px] w-8 rounded-full bg-black" />
        <div className="h-[3px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      {/* Follow-ups */}

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-bold uppercase text-black sm:text-base">
          Follow-ups
        </h2>

        <FollowUpsTable followUps={followUps} showSalesman={false} />
      </section>

      <div className="flex items-center gap-0 pt-2">
        <div className="h-[4px] w-8 rounded-full bg-black" />
        <div className="h-[3px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      {/* Estimates */}

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-bold uppercase text-black sm:text-base">
          Estimates
        </h2>

        <EstimatesTable opportunities={opportunityData} />
      </section>

      <div className="flex items-center gap-0 pt-2">
        <div className="h-[4px] w-8 rounded-full bg-black" />
        <div className="h-[3px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      <PageTagline>Men produce, boys consume.</PageTagline>
    </div>
  );
}
