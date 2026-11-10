import { prisma } from "@/lib/prisma";
import {
  getAllJobs,
  getAllAppointmentAssignments,
  getServiceTitanCustomers,
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
  const start = new Date(`${startDate}T00:00:00.000`);
  const end = new Date(`${endDate}T23:59:59.999`);

  return { start, end };
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime()) && formatDate(date) === value;
}

function calculateRevenue(jobs) {
  return jobs.reduce((total, job) => total + Number(job.total || 0), 0);
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

  if (Array.isArray(result?.results)) {
    return result.results;
  }

  return [];
}

function getCustomerName(customer) {
  if (!customer) return "—";

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

// ============================================
// SALES REVENUE PAGE
// ============================================

export default async function SalesRevenuePage({ searchParams }) {
  const params = await searchParams;

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

  const requestedPreset = params?.preset;

  const selectedPreset = validPresets.includes(requestedPreset)
    ? requestedPreset
    : "MTD";

  const { start, end } = getDateRange(selectedStartDate, selectedEndDate);

  // ============================================
  // FETCH DATA
  // ============================================

  const [allJobs, customerResult, allAssignments, teamMembers] =
    await Promise.all([
      getAllJobs({
        pageSize: 100,
        maxPages: 10,
      }),

      getServiceTitanCustomers({
        page: 1,
        pageSize: 100,
      }),

      getAllAppointmentAssignments({
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
  // FILTER AND SORT COMPLETED JOBS
  // ============================================

  const jobs = allJobs
    .filter((job) => {
      if (job.jobStatus !== "Completed" || !job.completedOn) {
        return false;
      }

      const completedDate = new Date(job.completedOn);

      return (
        !Number.isNaN(completedDate.getTime()) &&
        completedDate >= start &&
        completedDate <= end
      );
    })
    .sort(
      (a, b) =>
        new Date(b.completedOn).getTime() - new Date(a.completedOn).getTime(),
    );

  // ============================================
  // CREATE CUSTOMER LOOKUP MAP
  // ============================================

  const customerMap = new Map(
    serviceTitanCustomers.map((customer) => [
      String(customer.id),
      getCustomerName(customer),
    ]),
  );

  // ============================================
  // CREATE TECHNICIAN LOOKUP MAP
  // ============================================

  const technicianMap = new Map();

  allAssignments.forEach((assignment) => {
    if (assignment.status !== "Done") {
      return;
    }

    if (
      assignment.active === false ||
      !assignment.jobId ||
      !assignment.technicianName
    ) {
      return;
    }

    const jobId = String(assignment.jobId);

    if (!technicianMap.has(jobId)) {
      technicianMap.set(jobId, []);
    }

    const technicians = technicianMap.get(jobId);

    if (!technicians.includes(assignment.technicianName)) {
      technicians.push(assignment.technicianName);
    }
  });

  // ============================================
  // REVENUE SUMMARY AND TEAM GOAL
  // ============================================

  const totalRevenue = calculateRevenue(jobs);

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
    const technicians = technicianMap.get(String(job.id)) || [];

    return {
      id: job.id,

      serviceTitanJobId: job.jobNumber || job.id,

      customerName: customerMap.get(String(job.customerId)) || "—",

      saleValue: Number(job.total || 0),

      source: "Company",

      salesmanName: technicians.length > 0 ? technicians.join(", ") : "—",

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
