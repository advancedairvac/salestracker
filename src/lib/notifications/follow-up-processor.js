import { prisma } from "@/lib/prisma";

const MAX_BATCH_SIZE = 50;
const ACTIVE_SCHEDULE_MODES = ["STANDARD", "MANUAL"];

function getSafeLimit(limit) {
  const parsed = Number(limit);

  if (!Number.isFinite(parsed)) return MAX_BATCH_SIZE;

  return Math.min(Math.max(Math.floor(parsed), 1), MAX_BATCH_SIZE);
}

export async function getDueFollowUps({
  now = new Date(),
  limit = MAX_BATCH_SIZE,
} = {}) {
  const safeLimit = getSafeLimit(limit);

  const followUps = await prisma.followUp.findMany({
    where: {
      isActive: true,
      status: "PENDING",
      dueAt: { lte: now },

      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],

      notificationAttempts: {
        lt: 3,
      },

      schedule: {
        is: {
          isActive: true,
          mode: { in: ACTIVE_SCHEDULE_MODES },
        },
      },

      opportunity: {
        is: {
          status: "OPEN",
          assignedTo: {
            is: {
              isActive: true,
            },
          },
        },
      },

      notificationLogs: {
        none: {
          status: "PROCESSING",
        },
      },
    },

    include: {
      opportunity: {
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
        },
      },
      schedule: true,
    },

    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],

    take: safeLimit,
  });

  return followUps.filter((followUp) => {
    return (
      followUp.notificationAttempts < followUp.maxAttempts &&
      (!followUp.nextRetryAt || followUp.nextRetryAt <= now) &&
      followUp.opportunity?.assignedTo?.isActive &&
      Boolean(followUp.opportunity.assignedTo.email?.trim())
    );
  });
}

export async function claimEmailFollowUp(followUpId, now = new Date()) {
  if (!followUpId) {
    throw new Error("Follow-up ID is required.");
  }

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.findUnique({
      where: { id: followUpId },

      include: {
        opportunity: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
        schedule: true,
      },
    });

    if (!followUp) {
      return { claimed: false, reason: "FOLLOW_UP_NOT_FOUND" };
    }

    if (followUp.status !== "PENDING" || !followUp.isActive) {
      return { claimed: false, reason: "FOLLOW_UP_NOT_ELIGIBLE" };
    }

    if (!followUp.dueAt || followUp.dueAt > now) {
      return { claimed: false, reason: "FOLLOW_UP_NOT_DUE" };
    }

    if (followUp.notificationAttempts >= followUp.maxAttempts) {
      return { claimed: false, reason: "MAX_ATTEMPTS_REACHED" };
    }

    if (followUp.nextRetryAt && followUp.nextRetryAt > now) {
      return { claimed: false, reason: "RETRY_NOT_DUE" };
    }

    if (!followUp.schedule?.isActive) {
      return { claimed: false, reason: "SCHEDULE_INACTIVE" };
    }

    if (
      !ACTIVE_SCHEDULE_MODES.includes(followUp.schedule.mode) ||
      followUp.schedule.mode !== followUp.scheduleType
    ) {
      return { claimed: false, reason: "SCHEDULE_MODE_MISMATCH" };
    }

    if (followUp.opportunity?.status !== "OPEN") {
      return { claimed: false, reason: "OPPORTUNITY_NOT_OPEN" };
    }

    const assignedUser = followUp.opportunity.assignedTo;
    const recipientEmail = assignedUser?.email?.trim();

    if (!assignedUser?.isActive || !recipientEmail) {
      return {
        claimed: false,
        reason: "ASSIGNED_USER_EMAIL_MISSING_OR_INACTIVE",
      };
    }

    const existingProcessingLog = await tx.notificationLog.findFirst({
      where: {
        followUpId: followUp.id,
        status: "PROCESSING",
      },
      select: { id: true },
    });

    if (existingProcessingLog) {
      return { claimed: false, reason: "NOTIFICATION_ALREADY_PROCESSING" };
    }

    const template = await tx.emailTemplate.findFirst({
      where: {
        userId: null,
        eventType: followUp.eventType,
        isActive: true,
      },
    });

    if (!template) {
      return { claimed: false, reason: "EMAIL_TEMPLATE_NOT_FOUND" };
    }

    const attemptNumber = followUp.notificationAttempts + 1;
    const eventKey = `followup:${followUp.id}:attempt:${attemptNumber}`;

    const claimResult = await tx.followUp.updateMany({
      where: {
        id: followUp.id,
        status: "PENDING",
        isActive: true,
        notificationAttempts: followUp.notificationAttempts,
        dueAt: { lte: now },

        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],

        schedule: {
          is: {
            isActive: true,
            mode: followUp.scheduleType,
          },
        },

        opportunity: {
          is: {
            status: "OPEN",
          },
        },

        notificationLogs: {
          none: {
            status: "PROCESSING",
          },
        },
      },

      data: {
        notificationAttempts: { increment: 1 },
        nextRetryAt: null,
      },
    });

    if (claimResult.count !== 1) {
      return {
        claimed: false,
        reason: "ALREADY_CLAIMED_OR_STATE_CHANGED",
      };
    }

    const notificationLog = await tx.notificationLog.create({
      data: {
        followUpId: followUp.id,
        scheduleId: followUp.scheduleId,
        templateId: template.id,
        eventKey,
        eventType: followUp.eventType,
        attemptNumber,
        recipientEmail,
        status: "PROCESSING",
        processingAt: now,
        scheduledAt: followUp.dueAt,
        subjectSnapshot: template.subject,
        bodySnapshot: template.body,
      },
    });

    return {
      claimed: true,
      followUpId: followUp.id,
      notificationLogId: notificationLog.id,
      attemptNumber,
      recipientEmail,
      eventType: followUp.eventType,
      followUpType: followUp.type,
      subject: template.subject,
      body: template.body,
    };
  });
}

export async function processDueFollowUps({
  now = new Date(),
  limit = MAX_BATCH_SIZE,
} = {}) {
  const candidates = await getDueFollowUps({ now, limit });

  const results = {
    scanned: candidates.length,
    claimed: 0,
    skipped: 0,
    claims: [],
    skipReasons: [],
  };

  for (const followUp of candidates) {
    try {
      const claim = await claimEmailFollowUp(followUp.id, now);

      if (claim.claimed) {
        results.claimed++;
        results.claims.push(claim);
      } else {
        results.skipped++;
        results.skipReasons.push({
          followUpId: followUp.id,
          eventType: followUp.eventType,
          followUpType: followUp.type,
          reason: claim.reason,
        });
      }
    } catch (error) {
      results.skipped++;

      results.skipReasons.push({
        followUpId: followUp.id,
        eventType: followUp.eventType,
        followUpType: followUp.type,
        reason: "CLAIM_ERROR",
        error: error.message,
      });

      console.error(`Failed to claim follow-up ${followUp.id}:`, error);
    }
  }

  return results;
}
