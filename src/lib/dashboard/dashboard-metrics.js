
import { isWithinRange } from "@/lib/date/date-utils";

import { calculateTeamGoal } from "@/lib/date/goal-utils";

import {
  getCompletedJobs,
  calculateJobRevenue,
} from "@/lib/dashboard/servicetitan-helpers";

import {
  calculateSalesRevenue,
  getRevenueByMember,
} from "@/lib/dashboard/revenue-helpers";

import {
  getPipelineSummary,
} from "@/lib/dashboard/pipeline-helpers";

import {
  getOpportunityCountByMember,
  buildTeamPerformanceData,
} from "@/lib/dashboard/team-helpers";

// ============================================
// REVENUE METRICS
// ServiceTitan Jobs API
// ============================================

export function getRevenueMetrics({
  jobs = [],
  dateRanges = {},
} = {}) {
  const {
    todayStart,
    tomorrowStart,
    monthStart,
    nextMonthStart,
    yearStart,
    nextYearStart,
  } = dateRanges;

  const completedJobs = getCompletedJobs(jobs);

  const todayJobs = completedJobs.filter((job) =>
    isWithinRange(job.completedOn, todayStart, tomorrowStart),
  );

  const monthJobs = completedJobs.filter((job) =>
    isWithinRange(job.completedOn, monthStart, nextMonthStart),
  );

  const yearJobs = completedJobs.filter((job) =>
    isWithinRange(job.completedOn, yearStart, nextYearStart),
  );

  return {
    todayRevenue: calculateJobRevenue(todayJobs),
    monthRevenue: calculateJobRevenue(monthJobs),
    yearRevenue: calculateJobRevenue(yearJobs),
  };
}

// ============================================
// ESTIMATE METRICS
// ============================================

export function getEstimateMetrics({
  estimates = [],
  start,
  endExclusive,
} = {}) {
  const selectedPeriodEstimates = estimates.filter((estimate) =>
    isWithinRange(estimate.createdOn, start, endExclusive),
  );

  return {
    totalEstimates: selectedPeriodEstimates.length,
    estimates: selectedPeriodEstimates,
  };
}

// ============================================
// PIPELINE METRICS
// ============================================

export function getPipelineMetrics(opportunities = []) {
  return getPipelineSummary(opportunities);
}

// ============================================
// TEAM PERFORMANCE METRICS
// ============================================

export function getTeamMetrics({
  teamMembers = [],
  goalType,
  revenueSales = [],
  opportunities = [],
} = {}) {
  const revenueByMember = getRevenueByMember(revenueSales);

  const opportunityCountByMember =
    getOpportunityCountByMember(opportunities);

  return buildTeamPerformanceData({
    teamMembers,
    goalType,
    revenueByMember,
    opportunityCountByMember,
  });
}

// ============================================
// SALESPERSON PERFORMANCE METRICS
// ============================================

export function getSalespersonMetrics({
  user,
  revenueSales = [],
  opportunities = [],
  goalType,
} = {}) {
  if (!user) {
    return null;
  }

  const ownSales = revenueSales.filter(
    (sale) => sale.salesmanId === user.id,
  );

  const ownOpportunities = opportunities.filter(
    (opportunity) => opportunity.assignedToId === user.id,
  );

  const monthlyGoal = calculateTeamGoal([user], goalType);

  return {
    id: user.id,
    name: user.name,
    title: user.title || "",
    role: user.role,
    revenue: calculateSalesRevenue(ownSales),
    commission: 0,
    monthlyGoal,
    opportunities: ownOpportunities.length,
    closeRate: 0,
  };
}
