import { prisma } from "@/lib/prisma";

const CLOSED_OPPORTUNITY_STATUSES = ["WON", "LOST"];

export async function getOpportunityCloseRateStats({
  memberIds = [],
  start,
  endExclusive,
} = {}) {
  const uniqueMemberIds = [...new Set(memberIds.filter(Boolean))];

  if (
    !uniqueMemberIds.length ||
    !(start instanceof Date) ||
    !(endExclusive instanceof Date) ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(endExclusive.getTime()) ||
    start >= endExclusive
  ) {
    return new Map();
  }

  const groupedOpportunities = await prisma.opportunity.groupBy({
    by: ["createdById", "status"],
    where: {
      createdById: { in: uniqueMemberIds },
      createdAt: {
        gte: start,
        lt: endExclusive,
      },
    },
    _count: { _all: true },
  });

  const countsByMember = new Map(
    uniqueMemberIds.map((memberId) => [
      memberId,
      { createdCount: 0, closedCount: 0, closeRate: 0 },
    ]),
  );

  for (const row of groupedOpportunities) {
    const stats = countsByMember.get(row.createdById);
    if (!stats) continue;

    const count = row._count._all;
    stats.createdCount += count;

    if (CLOSED_OPPORTUNITY_STATUSES.includes(row.status)) {
      stats.closedCount += count;
    }
  }

  for (const stats of countsByMember.values()) {
    stats.closeRate = stats.createdCount
      ? Math.round((stats.closedCount / stats.createdCount) * 100)
      : 0;
  }

  return countsByMember;
}
