import { prisma } from "@/lib/prisma";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import RevenueSummary from "@/components/dashboard/revenue-summary";
import RevenueTable from "@/components/dashboard/revenue-table";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Sales Revenue",
};

// ============================================
// HELPERS
// ============================================

function getInitialDateRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: start.toLocaleDateString("en-CA"),
    endDate: end.toLocaleDateString("en-CA"),
  };
}

function getDateRange(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00.000`);
  const end = new Date(`${endDate}T23:59:59.999`);

  return { start, end };
}

function getMonthCount(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1
  );
}

function calculateRevenue(sales) {
  return sales.reduce((total, sale) => total + Number(sale.saleValue || 0), 0);
}

// ============================================
// SALES REVENUE PAGE
// ============================================

export default async function SalesRevenuePage({ searchParams }) {
  const params = await searchParams;

  const defaultRange = getInitialDateRange();

  const startDate = params?.startDate || defaultRange.startDate;
  const endDate = params?.endDate || defaultRange.endDate;

  const validRange =
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
    startDate <= endDate &&
    !Number.isNaN(new Date(`${startDate}T00:00:00`).getTime()) &&
    !Number.isNaN(new Date(`${endDate}T00:00:00`).getTime());

  const selectedStartDate = validRange ? startDate : defaultRange.startDate;

  const selectedEndDate = validRange ? endDate : defaultRange.endDate;

  const { start, end } = getDateRange(selectedStartDate, selectedEndDate);

  // ============================================
  // DATABASE QUERIES
  // ============================================

  const [sales, teamMembers] = await Promise.all([
    prisma.sale.findMany({
      where: {
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

    prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "SALESPERSON"],
        },
        isActive: true,
      },
      select: {
        monthlyGoal: true,
      },
    }),
  ]);

  // ============================================
  // REVENUE SUMMARY
  // ============================================

  const totalRevenue = calculateRevenue(sales);

  const monthlyTeamGoal = teamMembers.reduce(
    (total, member) => total + Number(member.monthlyGoal || 0),
    0,
  );

  const monthCount = getMonthCount(selectedStartDate, selectedEndDate);

  const totalGoal = monthlyTeamGoal * monthCount;

  const estimatedCommission = totalRevenue * 0.05;

  // ============================================
  // TABLE DATA
  // ============================================

  const revenueData = sales.map((sale) => ({
    id: sale.id,
    serviceTitanJobId: sale.serviceTitanJobId,
    customerName: sale.opportunity?.customer?.businessName || "—",
    saleValue: Number(sale.saleValue),
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
        items={[{ label: "Sales Tracker", href: "/admin" }]}
        currentPage="Sales Revenue"
      />

      {/* Date Selector */}
      <RevenueDateFilter
        value={{
          startDate,
          endDate,
        }}
      />

      {/* Revenue Summary */}
      <RevenueSummary
        revenue={totalRevenue}
        monthlyGoal={monthlyTeamGoal}
        startDate={selectedStartDate}
        endDate={selectedEndDate}
        commissionRate={5}
      />

      {/* Revenue Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
            Revenue Details
          </h2>

          <span className="shrink-0 text-xs text-[#777]">
            {revenueData.length} {revenueData.length === 1 ? "Sale" : "Sales"}
          </span>
        </div>

        <RevenueTable sales={revenueData} />
      </section>

      {/* Page Tagline */}
      <PageTagline>
        Success is the sum of small efforts, repeated day in and day out.
      </PageTagline>
    </div>
  );
}
