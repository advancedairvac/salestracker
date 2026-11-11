import { prisma } from "@/lib/prisma";

import {
  getAllJobs,
  getAllServiceTitanCustomers,
} from "@/lib/integrations/servicetitan";

import {
  getDateRange,
  getDateBounds,
  isValidDateString,
} from "@/lib/date/date-utils";

import { getGoalConfiguration, calculateTeamGoal } from "@/lib/date/goal-utils";

import {
  getCompletedJobs,
  calculateJobRevenue,
} from "@/lib/dashboard/servicetitan-helpers";

import { getDashboardTeamMembers } from "@/lib/dashboard/dashboard-data";

// ============================================
// DATE RANGE
// ============================================

const VALID_PRESETS = [
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

function getQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getRevenueDateRange(searchParams = {}) {
  const initialRange = getDateRange("MTD");

  const requestedPreset = getQueryValue(searchParams.preset);

  const preset = VALID_PRESETS.includes(requestedPreset)
    ? requestedPreset
    : "MTD";

  const requestedStartDate = getQueryValue(searchParams.startDate);
  const requestedEndDate = getQueryValue(searchParams.endDate);

  const hasValidCustomRange =
    isValidDateString(requestedStartDate) &&
    isValidDateString(requestedEndDate);

  const startDate = hasValidCustomRange
    ? requestedStartDate
    : initialRange.startDate;

  const endDate = hasValidCustomRange ? requestedEndDate : initialRange.endDate;

  const dateBounds = getDateBounds(startDate, endDate);

  if (!dateBounds) {
    throw new Error("Invalid revenue date range.");
  }

  return {
    preset,
    startDate,
    endDate,
    start: dateBounds.start,
    endExclusive: dateBounds.endExclusive,
  };
}

// ============================================
// CUSTOMER LOOKUP
// ============================================

function getCustomerList(customers) {
  if (Array.isArray(customers)) {
    return customers;
  }

  if (Array.isArray(customers?.customers)) {
    return customers.customers;
  }

  if (Array.isArray(customers?.data)) {
    return customers.data;
  }

  return [];
}

function getCustomerName(customer) {
  if (!customer) {
    return "—";
  }

  if (customer.pocName) {
    return customer.pocName;
  }

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || customer.name || customer.businessName || "—";
}

function buildCustomerLookup(customers) {
  const customerMap = new Map();

  for (const customer of customers) {
    if (!customer?.id) {
      continue;
    }

    customerMap.set(String(customer.id), getCustomerName(customer));
  }

  return customerMap;
}

// ============================================
// SOURCE LABEL
// ============================================

function getSourceLabel(source) {
  if (source === "SELF_GENERATED") {
    return "Self Generated";
  }

  if (source === "COMPANY_GENERATED") {
    return "Company Generated";
  }

  return "—";
}

// ============================================
// FETCH CRM SALE ASSIGNMENTS
// ============================================

async function getRevenueSaleAssignments(serviceTitanJobIds = []) {
  if (!serviceTitanJobIds.length) {
    return [];
  }

  return prisma.sale.findMany({
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
  });
}

// ============================================
// BUILD REVENUE TABLE DATA
// ============================================

function buildRevenueTableData({
  jobs = [],
  customerLookup = new Map(),
  saleAssignments = [],
} = {}) {
  const salesByJobId = new Map();

  for (const sale of saleAssignments) {
    if (sale.serviceTitanJobId) {
      salesByJobId.set(String(sale.serviceTitanJobId), sale);
    }
  }

  return jobs.map((job) => {
    const savedSale = salesByJobId.get(String(job.id));

    return {
      id: job.id,

      serviceTitanJobId: job.jobNumber || job.id,

      customerName: customerLookup.get(String(job.customerId)) || "—",

      saleValue: Number(job.total) || 0,

      source: getSourceLabel(savedSale?.source),

      salesmanName: savedSale?.salesman?.name || "—",

      commissionEstimate: 0,
    };
  });
}

// ============================================
// SHARED SALES REVENUE DATA
// ============================================

export async function getSalesRevenueData({ searchParams = {} } = {}) {
  const dateRange = getRevenueDateRange(searchParams);

  const { preset, startDate, endDate, start, endExclusive } = dateRange;

  // Fetch ServiceTitan data and team members together.
  const [jobs, serviceTitanCustomers, teamMembers] = await Promise.all([
    getAllJobs({
      pageSize: 100,
      maxPages: 100,
    }),

    getAllServiceTitanCustomers({
      pageSize: 100,
      maxPages: 100,
    }),

    getDashboardTeamMembers(),
  ]);

  // Keep only completed jobs with positive values.
  const completedJobs = getCompletedJobs(jobs);

  // Apply the selected date range.
  const filteredJobs = completedJobs
    .filter((job) => {
      const completedDate = new Date(job.completedOn);

      return completedDate >= start && completedDate < endExclusive;
    })
    .sort((a, b) => new Date(b.completedOn) - new Date(a.completedOn));

  // Fetch CRM assignments only for the relevant jobs.
  const serviceTitanJobIds = filteredJobs.map((job) => String(job.id));

  const [saleAssignments] = await Promise.all([
    getRevenueSaleAssignments(serviceTitanJobIds),
  ]);

  // Build customer lookup and revenue table.
  const customerLookup = buildCustomerLookup(
    getCustomerList(serviceTitanCustomers),
  );

  const revenueData = buildRevenueTableData({
    jobs: filteredJobs,
    customerLookup,
    saleAssignments,
  });

  // Calculate revenue and team goal.
  const totalRevenue = calculateJobRevenue(filteredJobs);

  const goalConfiguration = getGoalConfiguration(preset, startDate, endDate);

  const teamGoal = calculateTeamGoal(teamMembers, goalConfiguration.goalType);

  return {
    dateRange: {
      startDate,
      endDate,
      preset,
    },

    totalRevenue,
    teamGoal,
    goalConfiguration,
    teamMembers,
    revenueData,
  };
}
