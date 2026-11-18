
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";

import { getInitialRange } from "@/lib/date/date-utils";
import { getGoalConfiguration } from "@/lib/date/goal-utils";

import { getAdminTeamSectionData } from "@/lib/dashboard/dashboard-data";
import { getTeamMetrics } from "@/lib/dashboard/dashboard-metrics";

import SalesmanCard from "@/components/dashboard/salesman-card";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Sales Team | Sales Tracker",
};

// ============================================
// SALESMEN PAGE
// Same data and calculation architecture
// as Admin Dashboard
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

  const [startYear, startMonth, startDay] =
    defaultRange.startDate.split("-").map(Number);

  const [endYear, endMonth, endDay] =
    defaultRange.endDate.split("-").map(Number);

  const start = new Date(startYear, startMonth - 1, startDay);

  const endExclusive = new Date(
    endYear,
    endMonth - 1,
    endDay + 1,
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
  // FETCH TEAM DATA
  // Reuse Admin Dashboard data architecture
  // ============================================

  const { teamMembers, revenueSales, opportunities } =
    await getAdminTeamSectionData({
      start,
      endExclusive,
    });

  // ============================================
  // SORT TEAM MEMBERS
  // Admins first, then alphabetical
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
  // TEAM PERFORMANCE METRICS
  // Same calculation as Admin Dashboard
  // ============================================

  const salesmanPerformance = getTeamMetrics({
    teamMembers: sortedTeamMembers,
    goalType: goalConfiguration.goalType,
    revenueSales,
    opportunities,
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
