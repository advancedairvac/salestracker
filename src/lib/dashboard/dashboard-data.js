import { prisma } from "@/lib/prisma";

import { getAllJobs, getAllEstimates } from "@/lib/integrations/servicetitan";

// ============================================
// FETCH SERVICETITAN DASHBOARD DATA
// ============================================

export async function getDashboardServiceTitanData() {
  const [jobs, estimates] = await Promise.all([
    getAllJobs({
      pageSize: 100,
      maxPages: 100,
    }),

    getAllEstimates({
      pageSize: 100,
      maxPages: 10,
    }),
  ]);

  return {
    jobs,
    estimates,
  };
}

// ============================================
// FETCH OPPORTUNITIES
// ============================================

export async function getDashboardOpportunities({
  start,
  endExclusive,
  salesmanId,
} = {}) {
  if (!start || !endExclusive) {
    throw new Error("A valid date range is required.");
  }

  const where = {
    opportunityDate: {
      gte: start,
      lt: endExclusive,
    },
  };

  // Salesperson can only access their own opportunities.
  if (salesmanId) {
    where.assignedToId = salesmanId;
  }

  return prisma.opportunity.findMany({
    where,

    select: {
      id: true,
      assignedToId: true,
      value: true,
      status: true,
    },
  });
}

// ============================================
// FETCH SALES REVENUE
// ============================================

export async function getDashboardRevenueSales({
  start,
  endExclusive,
  salesmanId,
} = {}) {
  if (!start || !endExclusive) {
    throw new Error("A valid date range is required.");
  }

  const where = {
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
  };

  // Salesperson can only access their own sales.
  if (salesmanId) {
    where.salesmanId = salesmanId;
  }

  return prisma.sale.findMany({
    where,

    select: {
      id: true,
      saleValue: true,
      completedAt: true,
      salesmanId: true,
    },
  });
}

// ============================================
// FETCH ACTIVE TEAM MEMBERS
// ============================================

export async function getDashboardTeamMembers() {
  return prisma.user.findMany({
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
  });
}

// ============================================
// FETCH ADMIN DASHBOARD DATA
// ============================================

export async function getAdminDashboardData({ start, endExclusive } = {}) {
  const [serviceTitanData, opportunities, revenueSales, teamMembers] =
    await Promise.all([
      getDashboardServiceTitanData(),

      getDashboardOpportunities({
        start,
        endExclusive,
      }),

      getDashboardRevenueSales({
        start,
        endExclusive,
      }),

      getDashboardTeamMembers(),
    ]);

  return {
    ...serviceTitanData,
    opportunities,
    revenueSales,
    teamMembers,
  };
}

// ============================================
// FETCH SALESPERSON DASHBOARD DATA
// ============================================

export async function getSalespersonDashboardData({
  start,
  endExclusive,
  salesmanId,
} = {}) {
  if (!salesmanId) {
    throw new Error("Authenticated salesperson ID is required.");
  }

  const [
    serviceTitanData,
    companyOpportunities,
    ownOpportunities,
    ownRevenueSales,
  ] = await Promise.all([
    getDashboardServiceTitanData(),

    // Company-wide opportunities for Pipeline Card
    getDashboardOpportunities({
      start,
      endExclusive,
    }),

    // Individual salesperson opportunities
    getDashboardOpportunities({
      start,
      endExclusive,
      salesmanId,
    }),

    // Individual salesperson revenue
    getDashboardRevenueSales({
      start,
      endExclusive,
      salesmanId,
    }),
  ]);

  return {
    ...serviceTitanData,
    opportunities: companyOpportunities,
    ownOpportunities,
    revenueSales: ownRevenueSales,
  };
}
