import { prisma } from "@/lib/prisma";

import {
  getAllJobs,
  getAllServiceTitanCustomers,
} from "@/lib/integrations/servicetitan";

import { getGoalConfiguration, calculateTeamGoal } from "@/lib/date/goal-utils";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import RevenueSummary from "@/components/dashboard/revenue-summary";
import RevenueTable from "@/components/dashboard/revenue-table";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Sales Revenue",
};

export const dynamic = "force-dynamic";

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

  return {
    startDate: formatDate(start),
    endDate: formatDate(now),
  };
}

function getDateRange(startDate, endDate) {
  return {
    start: new Date(`${startDate}T00:00:00`),
    end: new Date(`${endDate}T23:59:59.999`),
  };
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime()) && formatDate(date) === value;
}

function getCustomerList(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.customers)) {
    return result.customers;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
}

function getCustomerName(customer) {
  if (!customer) {
    return "—";
  }

  const firstName = customer.firstName?.trim() || "";
  const lastName = customer.lastName?.trim() || "";

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    customer.pocName ||
    fullName ||
    customer.name ||
    customer.businessName ||
    "—"
  );
}

function getJobValue(job) {
  const value = Number(job.total);

  return Number.isFinite(value) ? value : 0;
}

function isCompletedJob(job) {
  return (
    String(job.jobStatus || "").toLowerCase() === "completed" &&
    Boolean(job.completedOn)
  );
}

// Format database source values for display.
function getSourceLabel(source) {
  const sourceLabels = {
    SELF_GENERATED: "Self Generated",
    COMPANY_GENERATED: "Company Generated",
  };

  return sourceLabels[source] || "—";
}

// ============================================
// SALES REVENUE PAGE
// ============================================

export default async function SalesRevenuePage({ searchParams }) {
  const params = await searchParams;

  // ============================================
  // DATE FILTER
  // ============================================

  const defaultRange = getInitialDateRange();

  const requestedStartDate = params?.startDate || defaultRange.startDate;

  const requestedEndDate = params?.endDate || defaultRange.endDate;

  const validRange =
    isValidDateString(requestedStartDate) &&
    isValidDateString(requestedEndDate) &&
    requestedStartDate <= requestedEndDate;

  const selectedStartDate = validRange
    ? requestedStartDate
    : defaultRange.startDate;

  const selectedEndDate = validRange ? requestedEndDate : defaultRange.endDate;

  const validPresets = [
    "Custom",
    "Today",
    "Yesterday",
    "Last 7 Days",
    "Last 30 Days",
    "Last 365 Days",
    "MTD",
    "QTD",
    "YTD",
    "Q1",
    "Q2",
    "Q3",
    "Q4",
  ];

  const selectedPreset = validPresets.includes(params?.preset)
    ? params.preset
    : "MTD";

  const { start, end } = getDateRange(selectedStartDate, selectedEndDate);

  // ============================================
  // FETCH DATA
  // ============================================

  const [allJobs, customerResult, teamMembers] = await Promise.all([
    getAllJobs({
      pageSize: 100,
      maxPages: 100,
    }),

    getAllServiceTitanCustomers({
      pageSize: 100,
      maxPages: 100,
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
        quarterlyGoal: true,
        annualGoal: true,
      },
    }),
  ]);

  const serviceTitanCustomers = getCustomerList(customerResult);

  // ============================================
  // CUSTOMER LOOKUP
  // ============================================

  const customerMap = new Map(
    serviceTitanCustomers.map((customer) => [
      String(customer.id),
      getCustomerName(customer),
    ]),
  );

  // ============================================
  // FETCH SAVED SALES ASSIGNMENTS
  // ============================================

  // Get ServiceTitan Job IDs.
  const serviceTitanJobIds = allJobs
    .filter((job) => job.id !== undefined && job.id !== null)
    .map((job) => String(job.id));

  // Fetch existing CRM assignments from PostgreSQL.
  const savedSales = serviceTitanJobIds.length
    ? await prisma.sale.findMany({
        where: {
          serviceTitanJobId: {
            in: serviceTitanJobIds,
          },
        },
        select: {
          serviceTitanJobId: true,
          source: true,
          salesmanId: true,
          salesman: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    : [];

  // Create lookup map using ServiceTitan Job ID.
  const saleMap = new Map(
    savedSales.map((sale) => [String(sale.serviceTitanJobId), sale]),
  );

  // ============================================
  // FILTER COMPLETED JOBS
  // ============================================

  const jobs = allJobs
    .filter((job) => {
      if (!isCompletedJob(job)) {
        return false;
      }

      const completedDate = new Date(job.completedOn);

      if (Number.isNaN(completedDate.getTime())) {
        return false;
      }

      return completedDate >= start && completedDate <= end;
    })
    // Only jobs with a positive value count as revenue.
    // Zero-value jobs require verified invoice payment data.
    .filter((job) => getJobValue(job) > 0)
    .sort(
      (a, b) =>
        new Date(b.completedOn).getTime() - new Date(a.completedOn).getTime(),
    );

  // ============================================
  // REVENUE SUMMARY
  // ============================================

  const totalRevenue = jobs.reduce((total, job) => total + getJobValue(job), 0);

  const goalConfiguration = getGoalConfiguration(
    selectedPreset,
    selectedStartDate,
    selectedEndDate,
  );

  const totalGoal = calculateTeamGoal(teamMembers, goalConfiguration.goalType);

  // ============================================
  // REVENUE TABLE DATA
  // ============================================

  const revenueData = jobs.map((job) => {
    // Match ServiceTitan Job with saved CRM Sale.
    const savedSale = saleMap.get(String(job.id));

    return {
      id: job.id,

      serviceTitanJobId: job.jobNumber || job.id,

      customerName: customerMap.get(String(job.customerId)) || "—",

      saleValue: getJobValue(job),

      // Read Source from PostgreSQL.
      source: getSourceLabel(savedSale?.source),

      // Read assigned Salesperson from PostgreSQL.
      salesmanName: savedSale?.salesman?.name || "—",

      commissionEstimate: 0,
    };
  });

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
        ]}
        currentPage="Sales Revenue"
      />

      <RevenueDateFilter
        value={{
          startDate: selectedStartDate,
          endDate: selectedEndDate,
        }}
        preset={selectedPreset}
      />

      <RevenueSummary
        revenue={totalRevenue}
        goal={totalGoal}
        goalLabel={goalConfiguration.label}
        commissionRate={0}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
            Revenue Details
          </h2>

          <span className="shrink-0 text-xs text-[#777]">
            {revenueData.length} {revenueData.length === 1 ? "Job" : "Jobs"}
          </span>
        </div>

        <RevenueTable sales={revenueData} />
      </section>

      <PageTagline>
        Success is the sum of small efforts, repeated day in and day out.
      </PageTagline>
    </div>
  );
}
