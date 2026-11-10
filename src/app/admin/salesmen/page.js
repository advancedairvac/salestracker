import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import { getInitialRange } from "@/lib/date/date-utils";
import { getGoalConfiguration, calculateTeamGoal } from "@/lib/date/goal-utils";

import SalesmanCard from "@/components/dashboard/salesman-card";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Sales Team | Sales Tracker",
};

// ============================================
// DATE HELPERS
// ============================================

function getDateRange(startDate, endDate) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);

  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  return {
    start: new Date(startYear, startMonth - 1, startDay),
    endExclusive: new Date(endYear, endMonth - 1, endDay + 1),
  };
}

// ============================================
// DATABASE HELPERS
// ============================================

function getSaleValue(sale) {
  const value = Number(sale.saleValue || 0);

  return Number.isFinite(value) ? value : 0;
}

// ============================================
// SALESMEN PAGE
// ============================================

export default async function SalesmenPage() {
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
  // DEFAULT DATE RANGE (MTD)
  // ============================================

  const defaultRange = getInitialRange();

  const { start, endExclusive } = getDateRange(
    defaultRange.startDate,
    defaultRange.endDate,
  );

  // ============================================
  // GOAL CONFIGURATION
  // ============================================

  const goalConfiguration = getGoalConfiguration(
    "MTD",
    defaultRange.startDate,
    defaultRange.endDate,
  );

  // ============================================
  // FETCH DATA
  // Same query structure as Admin Dashboard
  // ============================================

  const [revenueSales, opportunities, teamMembers] = await Promise.all([
    // Assigned Sales Revenue
    prisma.sale.findMany({
      where: {
        saleValue: {
          gt: 0,
        },

        completedAt: {
          gte: start,
          lt: endExclusive,
        },

        salesmanId: {
          not: null,
        },
      },

      select: {
        id: true,
        saleValue: true,
        completedAt: true,
        salesmanId: true,
      },
    }),

    // CRM Opportunities
    prisma.opportunity.findMany({
      where: {
        opportunityDate: {
          gte: start,
          lt: endExclusive,
        },
      },

      select: {
        id: true,
        assignedToId: true,
        value: true,
        status: true,
      },
    }),

    // Active Admins and Salespersons
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
        quarterlyGoal: true,
        annualGoal: true,
      },

      orderBy: {
        name: "asc",
      },
    }),
  ]);

  // ============================================
  // SALES REVENUE BY TEAM MEMBER
  // ============================================

  const revenueByMember = new Map();

  for (const sale of revenueSales) {
    if (!sale.salesmanId) {
      continue;
    }

    const currentRevenue = revenueByMember.get(sale.salesmanId) || 0;

    revenueByMember.set(sale.salesmanId, currentRevenue + getSaleValue(sale));
  }

  // ============================================
  // OPPORTUNITY COUNT BY TEAM MEMBER
  // ============================================

  const opportunityCountByMember = new Map();

  for (const opportunity of opportunities) {
    if (!opportunity.assignedToId) {
      continue;
    }

    const memberId = opportunity.assignedToId;

    const currentCount = opportunityCountByMember.get(memberId) || 0;

    opportunityCountByMember.set(memberId, currentCount + 1);
  }

  // ============================================
  // SORT TEAM MEMBERS
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
  // TEAM PERFORMANCE DATA
  // Same calculation as Admin Dashboard
  // ============================================

  const salesmanPerformance = sortedTeamMembers.map((salesman) => {
    const memberGoal = calculateTeamGoal(
      [salesman],
      goalConfiguration.goalType,
    );

    return {
      id: salesman.id,
      name: salesman.name,
      title: salesman.title || "",

      monthlyGoal: memberGoal,

      revenue: revenueByMember.get(salesman.id) || 0,

      commission: 0,

      opportunities: opportunityCountByMember.get(salesman.id) || 0,

      closeRate: 0,
    };
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex min-h-full w-full flex-col space-y-4 sm:space-y-5">
      {/* BREADCRUMB */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
        ]}
        currentPage="Salesmen"
      />


      {/* TEAM SUMMARY */}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
            Team Members
          </h2>

          <span className="shrink-0 text-xs text-[#777]">
            {salesmanPerformance.length}{" "}
            {salesmanPerformance.length === 1 ? "Member" : "Members"}
          </span>
        </div>

        {/* SALESMAN CARDS */}

        {salesmanPerformance.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {salesmanPerformance.map((salesman) => (
              <SalesmanCard
                key={salesman.id}
                id={salesman.id}
                name={salesman.name}
                title={salesman.title}
                revenue={salesman.revenue}
                commission={salesman.commission}
                monthlyGoal={salesman.monthlyGoal}
                opportunities={salesman.opportunities}
                closeRate={salesman.closeRate}
                href={`/admin/salesmen/${salesman.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="border border-[#d5d5d5] bg-white px-4 py-10 text-center">
            <p className="text-sm font-medium text-[#555]">
              No active team members found.
            </p>

            <p className="mt-1 text-xs text-[#888]">
              Add a salesperson to see their performance here.
            </p>
          </div>
        )}
      </section>

      {/* PAGE TAGLINE */}

      <div className="mt-auto pt-16">
        <PageTagline>
          Iron sharpens iron, as one man sharpens another.
        </PageTagline>
      </div>
    </div>
  );
}
