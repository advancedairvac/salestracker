import { redirect, notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import {
  getAllJobs,
  getAllAppointmentAssignments,
  getServiceTitanCustomers,
} from "@/lib/integrations/servicetitan";

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

function isWithinRange(dateValue, start, endExclusive) {
  if (!dateValue) return false;

  const date = new Date(dateValue);

  return !Number.isNaN(date.getTime()) && date >= start && date < endExclusive;
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function getList(response, possibleKeys = []) {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  for (const key of possibleKeys) {
    if (Array.isArray(response[key])) {
      return response[key];
    }
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

function getCustomerName(customer) {
  if (!customer) return "—";

  if (customer.name) {
    return customer.name;
  }

  const firstName = customer.firstName || "";
  const lastName = customer.lastName || "";

  return `${firstName} ${lastName}`.trim() || "—";
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
  // FETCH DATA
  // ============================================

  const [
    allJobsResponse,
    assignmentsResponse,
    customersResponse,
    opportunities,
    followUps,
  ] = await Promise.all([
    // ServiceTitan Jobs
    getAllJobs({
      pageSize: 100,
      maxPages: 10,
    }),

    // ServiceTitan Appointment Assignments
    getAllAppointmentAssignments({
      pageSize: 100,
      maxPages: 100,
    }),

    // ServiceTitan Customers
    getServiceTitanCustomers(),

    // Open opportunities assigned to this salesman
    // within the selected date range
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

    // Pending follow-ups due within the selected range
    prisma.followUp.findMany({
      where: {
        assignedToId: salesman.id,
        status: "PENDING",
        dueAt: {
          gte: start,
          lt: endExclusive,
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
  ]);

  const allJobs = getList(allJobsResponse, ["jobs", "data", "items"]);

  const allAssignments = getList(assignmentsResponse, [
    "appointmentAssignments",
    "data",
    "items",
  ]);

  const customers = getList(customersResponse, ["customers", "data", "items"]);

  // ============================================
  // CUSTOMER LOOKUP
  // ============================================

  const customerMap = new Map(
    customers.map((customer) => [
      String(customer.id),
      getCustomerName(customer),
    ]),
  );

  // ============================================
  // ASSIGNMENTS BY JOB
  // ============================================

  const assignmentsByJob = new Map();

  for (const assignment of allAssignments) {
    if (
      assignment.status !== "Done" ||
      assignment.active === false ||
      !assignment.jobId ||
      !assignment.technicianName
    ) {
      continue;
    }

    const jobId = String(assignment.jobId);

    if (!assignmentsByJob.has(jobId)) {
      assignmentsByJob.set(jobId, []);
    }

    const technicianNames = assignmentsByJob.get(jobId);

    if (!technicianNames.includes(assignment.technicianName)) {
      technicianNames.push(assignment.technicianName);
    }
  }

  // ============================================
  // FILTER COMPLETED JOBS BY DATE
  // ============================================

  const selectedPeriodJobs = allJobs.filter(
    (job) =>
      job.jobStatus === "Completed" &&
      isWithinRange(job.completedOn, start, endExclusive),
  );

  // ============================================
  // SALESMAN REVENUE
  // ============================================

  const revenueJobs = selectedPeriodJobs.filter((job) => {
    const technicianNames = assignmentsByJob.get(String(job.id)) || [];

    return technicianNames.some(
      (name) => normalizeName(name) === normalizeName(salesman.name),
    );
  });

  const totalRevenue = revenueJobs.reduce(
    (total, job) => total + Number(job.total || 0),
    0,
  );

  // ============================================
  // REVENUE TABLE DATA
  // ============================================

  const revenueData = revenueJobs
    .sort(
      (a, b) =>
        new Date(b.completedOn).getTime() - new Date(a.completedOn).getTime(),
    )
    .map((job) => ({
      id: job.id,
      serviceTitanJobId: job.jobNumber || job.id,
      customerName: customerMap.get(String(job.customerId)) || "—",
      saleValue: Number(job.total || 0),
      source: "Company",
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

  // Your current Opportunity enum does not contain
  // WON or LOST. Therefore, an accurate close rate
  // cannot be calculated from the current schema.
  const closeRate = 0;

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
            href: "/admin",
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
        preset={selectedPreset}
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
          monthlyGoal={selectedPeriodGoal}
          startDate={startDate}
          endDate={endDate}
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
