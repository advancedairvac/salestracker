
import { getQuarterInfo } from "./date-utils";

// ============================================
// GET QUARTER INFORMATION
// ============================================

function getQuarterFromDate(dateString) {
  const [year, month] = dateString.split("-").map(Number);

  return {
    year,
    quarter: Math.floor((month - 1) / 3) + 1,
  };
}

// ============================================
// GET GOAL CONFIGURATION
// ============================================

export function getGoalConfiguration(preset, startDate, endDate) {
  switch (preset) {
    case "Today":
      return {
        goalType: "daily",
        label: "TODAY GOAL",
      };

    case "Yesterday":
      return {
        goalType: "daily",
        label: "YESTERDAY GOAL",
      };

    case "Last 7 Days":
      return {
        goalType: "last7",
        label: "7 DAYS GOAL",
      };

    case "Last 30 Days":
    case "MTD":
      return {
        goalType: "monthly",
        label: "MONTHLY GOAL",
      };

    case "QTD":
    case "Q1":
    case "Q2":
    case "Q3":
    case "Q4":
      return {
        goalType: "quarterly",
        label: "QUARTERLY GOAL",
      };

    case "YTD":
    case "Last 365 Days":
      return {
        goalType: "annual",
        label: "ANNUAL GOAL",
      };

    case "Custom": {
      const start = getQuarterFromDate(startDate);
      const end = getQuarterFromDate(endDate);

      const sameMonth = startDate.slice(0, 7) === endDate.slice(0, 7);

      if (sameMonth) {
        return {
          goalType: "monthly",
          label: "MONTHLY GOAL",
        };
      }

      const sameQuarter =
        start.year === end.year &&
        start.quarter === end.quarter;

      if (sameQuarter) {
        return {
          goalType: "quarterly",
          label: "QUARTERLY GOAL",
        };
      }

      return {
        goalType: "annual",
        label: "ANNUAL GOAL",
      };
    }

    default:
      return {
        goalType: "monthly",
        label: "MONTHLY GOAL",
      };
  }
}

// ============================================
// CALCULATE TEAM GOAL
// ============================================

export function calculateTeamGoal(teamMembers, goalType) {
  return teamMembers.reduce((total, member) => {
    const monthlyGoal = Number(member.monthlyGoal) || 0;
    const quarterlyGoal = Number(member.quarterlyGoal) || 0;
    const annualGoal = Number(member.annualGoal) || 0;

    let memberGoal = 0;

    switch (goalType) {
      case "daily":
        memberGoal = monthlyGoal / 30;
        break;

      case "last7":
        memberGoal = (monthlyGoal / 30) * 7;
        break;

      case "monthly":
        memberGoal = monthlyGoal;
        break;

      case "quarterly":
        memberGoal = quarterlyGoal;
        break;

      case "annual":
        memberGoal = annualGoal;
        break;

      default:
        memberGoal = monthlyGoal;
    }

    return total + memberGoal;
  }, 0);
}
