import { getDayStart, addDays } from "@/lib/date/date-utils";

// ============================================
// PIPELINE FILTER CONSTANTS
// ============================================

export const PIPELINE_DATE_FILTERS = [
  "TODAY",
  "TOMORROW",
  "NEXT_WEEK",
  "NEXT_MONTH",
  "BEYOND",
];

// ============================================
// GET OPPORTUNITY VALUE
// ============================================

export function getOpportunityValue(opportunity) {
  const value = Number(opportunity?.value || 0);

  return Number.isFinite(value) ? value : 0;
}

// ============================================
// FILTER OPEN OPPORTUNITIES
// ============================================

export function getOpenOpportunities(opportunities = []) {
  return opportunities.filter((opportunity) => opportunity.status === "OPEN");
}

// ============================================
// CALCULATE PIPELINE VALUE
// ============================================

export function calculatePipelineValue(opportunities = []) {
  const openOpportunities = getOpenOpportunities(opportunities);

  return openOpportunities.reduce(
    (total, opportunity) => total + getOpportunityValue(opportunity),
    0,
  );
}

// ============================================
// GET PIPELINE SUMMARY
// ============================================

export function getPipelineSummary(opportunities = []) {
  const openOpportunities = getOpenOpportunities(opportunities);

  return {
    totalOpportunities: opportunities.length,
    openOpportunities: openOpportunities.length,
    pipelineValue: calculatePipelineValue(openOpportunities),
  };
}

// ============================================
// GET FOLLOW-UP DATE RANGE
// ============================================

export function getFollowUpDateRange(filter, referenceDate = new Date()) {
  const today = getDayStart(referenceDate);

  switch (filter) {
    case "TODAY": {
      return {
        start: today,
        endExclusive: addDays(today, 1),
      };
    }

    case "TOMORROW": {
      const start = addDays(today, 1);

      return {
        start,
        endExclusive: addDays(start, 1),
      };
    }

    case "NEXT_WEEK": {
      return {
        start: addDays(today, 2),
        endExclusive: addDays(today, 8),
      };
    }

    case "NEXT_MONTH": {
      const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      return {
        start,
        endExclusive: new Date(today.getFullYear(), today.getMonth() + 2, 1),
      };
    }

    case "BEYOND": {
      return {
        start: new Date(today.getFullYear(), today.getMonth() + 2, 1),
        endExclusive: null,
      };
    }

    default:
      return null;
  }
}

// ============================================
// VALIDATE PIPELINE FILTER
// ============================================

export function getSelectedFilter(value, users = []) {
  if (!value || value === "ALL") {
    return "ALL";
  }

  if (PIPELINE_DATE_FILTERS.includes(value)) {
    return value;
  }

  if (value.startsWith("USER:")) {
    const userId = value.slice(5);

    const userExists = users.some((user) => user.id === userId);

    return userExists ? value : "ALL";
  }

  return "ALL";
}
