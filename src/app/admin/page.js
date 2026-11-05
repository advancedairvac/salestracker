import { prisma } from "@/lib/prisma";

import DateSelector from "@/components/ui/date-selector";
import Breadcrumbs from "@/components/ui/breadcrumbs";
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
// ADMIN DASHBOARD
// ============================================

export default async function AdminDashboardPage() {
  const { today, monthStart, yearStart } = getDateRanges();

  // ============================================
  // DATABASE QUERIES
  // ============================================

  const [
    todaySales,
    monthSales,
    yearSales,
    pipeline,
    teamMembers,
    monthlySalesByMember,
    opportunitiesByMember,
  ] = await Promise.all([
    // Today's Revenue
    prisma.sale.aggregate({
      where: {
        closedAt: {
          gte: today,
        },
      },
      _sum: {
        saleValue: true,
      },
    }),

    // Monthly Revenue
    prisma.sale.aggregate({
      where: {
        closedAt: {
          gte: monthStart,
        },
      },
      _sum: {
        saleValue: true,
      },
    }),

    // Yearly Revenue
    prisma.sale.aggregate({
      where: {
        closedAt: {
          gte: yearStart,
        },
      },
      _sum: {
        saleValue: true,
      },
    }),

    // Open Pipeline
    prisma.opportunity.aggregate({
      where: {
        status: "OPEN",
      },
      _count: {
        _all: true,
      },
      _sum: {
        value: true,
      },
    }),

    // Active Team Members
    prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "SALESPERSON"],
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        title: true,
        role: true,
        monthlyGoal: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    // Monthly Revenue Grouped by Salesperson
    prisma.sale.groupBy({
      by: ["closedById"],
      where: {
        closedAt: {
          gte: monthStart,
        },
      },
      _sum: {
        saleValue: true,
      },
    }),

    // Opportunities Grouped by Assigned User and Status
    prisma.opportunity.groupBy({
      by: ["assignedToId", "status"],
      _count: {
        _all: true,
      },
    }),
  ]);

  // ============================================
  // REVENUE CALCULATIONS
  // ============================================

  const todayRevenue = Number(todaySales._sum.saleValue || 0);

  const monthRevenue = Number(monthSales._sum.saleValue || 0);

  const yearRevenue = Number(yearSales._sum.saleValue || 0);

  // ============================================
  // PIPELINE CALCULATIONS
  // ============================================

  const totalOpportunities = pipeline._count._all;

  const pipelineValue = Number(pipeline._sum.value || 0);

  // Estimates are not separately represented
  // in the current database schema.
  const totalEstimates = 0;

  // ============================================
  // TEAM REVENUE LOOKUP
  // ============================================

  const revenueByMember = new Map(
    monthlySalesByMember.map((item) => [
      item.closedById,
      Number(item._sum.saleValue || 0),
    ]),
  );

  // ============================================
  // TEAM OPPORTUNITY LOOKUP
  // ============================================

  const opportunityStatsByMember = new Map();

  for (const item of opportunitiesByMember) {
    const memberId = item.assignedToId;

    if (!opportunityStatsByMember.has(memberId)) {
      opportunityStatsByMember.set(memberId, {
        total: 0,
        won: 0,
        lost: 0,
      });
    }

    const stats = opportunityStatsByMember.get(memberId);

    stats.total += item._count._all;

    if (item.status === "WON") {
      stats.won += item._count._all;
    }

    if (item.status === "LOST") {
      stats.lost += item._count._all;
    }
  }

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
    const stats = opportunityStatsByMember.get(member.id) || {
      total: 0,
      won: 0,
      lost: 0,
    };

    const decidedCount = stats.won + stats.lost;

    const closeRate =
      decidedCount > 0 ? Math.round((stats.won / decidedCount) * 100) : 0;

    return {
      id: member.id,
      name: member.name,
      title: member.title || "",
      role: member.role,
      monthlyGoal: Number(member.monthlyGoal || 0),
      revenue: revenueByMember.get(member.id) || 0,
      commission: 0,
      opportunities: stats.total,
      closeRate,
    };
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* REUSABLE BREADCRUMB */}
      <Breadcrumbs
        items={[{ label: "Sales Tracker", href: "/admin" }]}
        currentPage="Dashboard"
      />

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
      <section className="mt-12 space-y-3">
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
