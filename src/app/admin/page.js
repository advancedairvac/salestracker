import { prisma } from "@/lib/prisma";

import DateSelector from "@/components/ui/date-selector";
import PageTagline from "@/components/ui/page-tagline";

import RevenueCard from "@/components/dashboard/revenue-card";
import PipelineCard from "@/components/dashboard/pipeline-card";
import SalesmanCard from "@/components/dashboard/salesman-card";

export const metadata = {
  title: "Admin Dashboard",
};

// ============================================
// DATE RANGES
// ============================================

function getDateRanges() {
  const now = new Date();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const yearStart = new Date(now.getFullYear(), 0, 1);

  return {
    today,
    monthStart,
    yearStart,
  };
}

// ============================================
// HELPERS
// ============================================

function calculateRevenue(sales = []) {
  return sales.reduce((total, sale) => total + Number(sale.saleValue || 0), 0);
}

// ============================================
// ADMIN DASHBOARD
// ============================================

export default async function AdminDashboardPage() {
  const { today, monthStart, yearStart } = getDateRanges();

  // ============================================
  // DATABASE QUERIES
  // ============================================

  const [sales, openOpportunities, teamMembers] = await Promise.all([
    // --------------------------------------------
    // Sales Revenue
    // --------------------------------------------

    prisma.sale.findMany({
      where: {
        closedAt: {
          gte: yearStart,
        },
      },
      select: {
        saleValue: true,
        closedAt: true,
        closedById: true,
      },
    }),

    // --------------------------------------------
    // Open Pipeline Opportunities
    // --------------------------------------------

    prisma.opportunity.findMany({
      where: {
        status: "OPEN",
      },
      select: {
        value: true,
      },
    }),

    // --------------------------------------------
    // Active Admin and Salespeople
    // --------------------------------------------

    prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "SALESPERSON"],
        },
        isActive: true,
      },

      orderBy: {
        name: "asc",
      },

      include: {
        // Sales closed during the current month
        closedSales: {
          where: {
            closedAt: {
              gte: monthStart,
            },
          },
          select: {
            saleValue: true,
            closedAt: true,
          },
        },

        // All assigned opportunities
        assignedOpportunities: {
          select: {
            status: true,
          },
        },
      },
    }),
  ]);

  // ============================================
  // REVENUE CALCULATIONS
  // ============================================

  const todayRevenue = calculateRevenue(
    sales.filter((sale) => sale.closedAt >= today),
  );

  const monthRevenue = calculateRevenue(
    sales.filter((sale) => sale.closedAt >= monthStart),
  );

  const yearRevenue = calculateRevenue(sales);

  // ============================================
  // PIPELINE CALCULATIONS
  // ============================================

  const totalOpportunities = openOpportunities.length;

  const pipelineValue = openOpportunities.reduce((total, opportunity) => {
    return total + Number(opportunity.value || 0);
  }, 0);

  // Estimates are not separately represented
  // in the current database schema.
  const totalEstimates = 0;

  // ============================================
  // ADMIN FIRST, THEN SALESPERSONS
  // ============================================

  const sortedTeamMembers = [...teamMembers].sort((a, b) => {
    if (a.role === "ADMIN" && b.role !== "ADMIN") {
      return -1;
    }

    if (a.role !== "ADMIN" && b.role === "ADMIN") {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });

  // ============================================
  // TEAM PERFORMANCE
  // ============================================

  const teamData = sortedTeamMembers.map((member) => {
    const opportunities = member.assignedOpportunities;

    const wonCount = opportunities.filter(
      (opportunity) => opportunity.status === "WON",
    ).length;

    const lostCount = opportunities.filter(
      (opportunity) => opportunity.status === "LOST",
    ).length;

    const decidedCount = wonCount + lostCount;

    const closeRate =
      decidedCount > 0 ? Math.round((wonCount / decidedCount) * 100) : 0;

    // Current month's revenue
    const monthlyRevenue = calculateRevenue(member.closedSales);

    return {
      id: member.id,
      name: member.name,
      title: member.title || "",
      role: member.role,

      monthlyGoal: Number(member.monthlyGoal || 0),

      revenue: monthlyRevenue,

      // Commission will be implemented later
      commission: 0,

      opportunities: opportunities.length,

      closeRate,
    };
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
        <span className="font-semibold text-black">Sales Tracker</span>

        <span className="text-[#777]">/</span>

        <span className="text-[#666]">Dashboard</span>
      </div>

      {/* Date Selector */}
      <DateSelector />

      {/* Revenue and Pipeline */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RevenueCard
          today={todayRevenue}
          mtd={monthRevenue}
          ytd={yearRevenue}
        />

        <PipelineCard
          opportunities={totalOpportunities}
          estimates={totalEstimates}
          pipelineValue={pipelineValue}
        />
      </section>

      {/* Sales Team Performance */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
            Sales Team Performance
          </h2>

          <span className="shrink-0 text-xs text-[#777]">
            {teamData.length} Team Members
          </span>
        </div>

        {teamData.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {teamData.map((member) => (
              <SalesmanCard
                key={member.id}
                id={member.id}
                name={member.name}
                title={member.title}
                revenue={member.revenue}
                commission={member.commission}
                monthlyGoal={member.monthlyGoal}
                opportunities={member.opportunities}
                closeRate={member.closeRate}
              />
            ))}
          </div>
        ) : (
          <div className="border border-[#d5d5d5] bg-white px-4 py-10 text-center">
            <p className="text-sm font-medium text-[#555]">
              No active team members found.
            </p>
          </div>
        )}
      </section>

      {/* Page-specific Tagline */}
      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
