
import { calculateTeamGoal } from "@/lib/date/goal-utils";

// ============================================
// SORT TEAM MEMBERS
// Admins first, then Salespersons
// ============================================

export function sortTeamMembers(teamMembers = []) {
  return [...teamMembers].sort((a, b) => {
    if (a.role === "ADMIN" && b.role !== "ADMIN") {
      return -1;
    }

    if (a.role !== "ADMIN" && b.role === "ADMIN") {
      return 1;
    }

    return (a.name || "").localeCompare(b.name || "");
  });
}

// ============================================
// GET OPPORTUNITY COUNT BY MEMBER
// ============================================

export function getOpportunityCountByMember(opportunities = []) {
  const opportunityCountByMember = new Map();

  for (const opportunity of opportunities) {
    if (!opportunity.assignedToId) {
      continue;
    }

    const memberId = opportunity.assignedToId;

    const currentCount = opportunityCountByMember.get(memberId) || 0;

    opportunityCountByMember.set(memberId, currentCount + 1);
  }

  return opportunityCountByMember;
}

// ============================================
// BUILD TEAM PERFORMANCE DATA
// ============================================

export function buildTeamPerformanceData({
  teamMembers = [],
  goalType,
  revenueByMember = new Map(),
  opportunityCountByMember = new Map(),
} = {}) {
  const sortedTeamMembers = sortTeamMembers(teamMembers);

  return sortedTeamMembers.map((member) => {
    const memberGoal = calculateTeamGoal([member], goalType);

    return {
      id: member.id,
      name: member.name,
      title: member.title || "",
      role: member.role,

      monthlyGoal: memberGoal,

      revenue: revenueByMember.get(member.id) || 0,

      commission: 0,

      opportunities: opportunityCountByMember.get(member.id) || 0,

      closeRate: 0,
    };
  });
}
