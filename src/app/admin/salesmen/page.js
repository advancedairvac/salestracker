import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import SalesmanCard from "@/components/dashboard/salesman-card";

export default async function SalesmenPage() {
  // Authentication and authorization
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/salesperson");
  }

  // Fetch active salespeople and their performance data
  const salesmen = await prisma.user.findMany({
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
      monthlyGoal: true,

      // Sales closed by this salesperson
      closedSales: {
        select: {
          saleValue: true,
        },
      },

      // Opportunities assigned to this salesperson
      assignedOpportunities: {
        select: {
          status: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Prepare performance data for each salesperson
  const salesmanPerformance = salesmen.map((salesman) => {
    const revenue = salesman.closedSales.reduce(
      (total, sale) => total + Number(sale.saleValue || 0),
      0,
    );

    const opportunities = salesman.assignedOpportunities.length;

    const wonOpportunities = salesman.assignedOpportunities.filter(
      (opportunity) => opportunity.status === "WON",
    ).length;

    const lostOpportunities = salesman.assignedOpportunities.filter(
      (opportunity) => opportunity.status === "LOST",
    ).length;

    const closedOpportunities = wonOpportunities + lostOpportunities;

    const closeRate =
      closedOpportunities > 0
        ? Math.round((wonOpportunities / closedOpportunities) * 100)
        : 0;

    return {
      id: salesman.id,
      name: salesman.name,
      title: salesman.title,
      monthlyGoal: Number(salesman.monthlyGoal || 0),
      revenue,
      commission: 0,
      opportunities,
      closeRate,
    };
  });

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-[#555]">
          Sales Team Performance
        </h2>

        <span className="text-xs text-[#888]">
          {salesmanPerformance.length} Team Members
        </span>
      </div>

      {/* Sales Team Grid */}
      {salesmanPerformance.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
        <div className="border border-[#d5d5d5] px-4 py-10 text-center">
          <p className="text-sm font-medium text-[#555]">
            No active sales team members found.
          </p>
          <p className="mt-1 text-xs text-[#888]">
            Add a salesperson to see their performance here.
          </p>
        </div>
      )}
    </section>
  );
}
