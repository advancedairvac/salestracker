import { prisma } from "@/lib/prisma";

// ============================================
// FOLLOW-UP PROCESSOR CONFIGURATION
// ============================================

const MAX_BATCH_SIZE = 50;
const ACTIVE_SCHEDULE_MODES = ["STANDARD", "MANUAL"];

// ============================================
// GET DUE FOLLOW-UPS
// Each follow-up executes independently.
// No previous follow-up status dependency.
// ============================================

export async function getDueFollowUps({
  now = new Date(),
  limit = MAX_BATCH_SIZE,
} = {}) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || MAX_BATCH_SIZE, 1),
    MAX_BATCH_SIZE,
  );

  const followUps = await prisma.followUp.findMany({
    where: {
      isActive: true,
      status: "PENDING",
      type: "EMAIL",

      dueAt: {
        lte: now,
      },

      notificationAttempts: {
        lt: 3,
      },

      OR: [
        { nextRetryAt: null },
        {
          nextRetryAt: {
            lte: now,
          },
        },
      ],

      schedule: {
        is: {
          isActive: true,
          mode: {
            in: ACTIVE_SCHEDULE_MODES,
          },
        },
      },

      opportunity: {
        is: {
          status: "OPEN",
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
            },
          },
        },
      },

      schedule: true,

      notificationLogs: {
        where: {
          status: "PROCESSING",
        },
        select: {
          id: true,
        },
      },
    },

    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],

    take: safeLimit,
  });

  return followUps.filter((followUp) => {
    if (followUp.notificationAttempts >= followUp.maxAttempts) {
      return false;
    }

    if (followUp.nextRetryAt && followUp.nextRetryAt > now) {
      return false;
    }

    if (followUp.notificationLogs.length > 0) {
      return false;
    }

    return true;
  });
}

// ============================================
// CLAIM EMAIL FOLLOW-UP
// Atomic claim to prevent duplicate processing.
// No sequence dependency.
// ============================================

export async function claimEmailFollowUp(followUpId, now = new Date()) {
  if (!followUpId) {
    throw new Error("Follow-up ID is required.");
  }

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.findUnique({
      where: {
        id: followUpId,
      },

      include: {
        opportunity: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },

        schedule: true,

        notificationLogs: {
          where: {
            status: "PROCESSING",
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!followUp) {
      return {
        claimed: false,
        reason: "FOLLOW_UP_NOT_FOUND",
      };
    }

    // ----------------------------------------
    // FOLLOW-UP VALIDATION
    // ----------------------------------------

    if (
      followUp.status !== "PENDING" ||
      !followUp.isActive ||
      followUp.type !== "EMAIL"
    ) {
      return {
        claimed: false,
        reason: "FOLLOW_UP_NOT_ELIGIBLE",
      };
    }

    if (!followUp.dueAt || followUp.dueAt > now) {
      return {
        claimed: false,
        reason: "FOLLOW_UP_NOT_DUE",
      };
    }

    if (followUp.notificationAttempts >= followUp.maxAttempts) {
      return {
        claimed: false,
        reason: "MAX_ATTEMPTS_REACHED",
      };
    }

    if (followUp.nextRetryAt && followUp.nextRetryAt > now) {
      return {
        claimed: false,
        reason: "RETRY_NOT_DUE",
      };
    }

    // ----------------------------------------
    // SCHEDULE VALIDATION
    // ----------------------------------------

    if (!followUp.schedule?.isActive) {
      return {
        claimed: false,
        reason: "SCHEDULE_INACTIVE",
      };
    }

    if (
      !ACTIVE_SCHEDULE_MODES.includes(followUp.schedule.mode) ||
      followUp.schedule.mode !== followUp.scheduleType
    ) {
      return {
        claimed: false,
        reason: "SCHEDULE_MODE_MISMATCH",
      };
    }

    // ----------------------------------------
    // OPPORTUNITY VALIDATION
    // ----------------------------------------

    if (followUp.opportunity?.status !== "OPEN") {
      return {
        claimed: false,
        reason: "OPPORTUNITY_NOT_OPEN",
      };
    }

    // ----------------------------------------
    // PREVENT DUPLICATE PROCESSING
    // ----------------------------------------

    if (followUp.notificationLogs.length > 0) {
      return {
        claimed: false,
        reason: "NOTIFICATION_ALREADY_PROCESSING",
      };
    }

    // ----------------------------------------
    // VALIDATE ASSIGNED USER EMAIL
    // ----------------------------------------

    const assignedUser = followUp.opportunity.assignedTo;
    const recipientEmail = assignedUser?.email?.trim();

    if (!recipientEmail) {
      return {
        claimed: false,
        reason: "ASSIGNED_USER_EMAIL_MISSING",
      };
    }

    // ----------------------------------------
    // GET GLOBAL EMAIL TEMPLATE
    // ----------------------------------------

    const template = await tx.emailTemplate.findFirst({
      where: {
        userId: null,
        eventType: followUp.eventType,
        isActive: true,
      },
    });

    if (!template) {
      return {
        claimed: false,
        reason: "EMAIL_TEMPLATE_NOT_FOUND",
      };
    }

    // ----------------------------------------
    // ATOMIC FOLLOW-UP CLAIM
    // ----------------------------------------

    const attemptNumber = followUp.notificationAttempts + 1;

    const eventKey = `followup:${followUp.id}:attempt:${attemptNumber}`;

    const claimResult = await tx.followUp.updateMany({
      where: {
        id: followUp.id,
        status: "PENDING",
        isActive: true,
        type: "EMAIL",

        notificationAttempts: followUp.notificationAttempts,

        dueAt: {
          lte: now,
        },

        OR: [
          { nextRetryAt: null },
          {
            nextRetryAt: {
              lte: now,
            },
          },
        ],

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
      },

      data: {
        notificationAttempts: {
          increment: 1,
        },

        nextRetryAt: null,
      },
    });

    if (claimResult.count !== 1) {
      return {
        claimed: false,
        reason: "ALREADY_CLAIMED_OR_STATE_CHANGED",
      };
    }

    // ----------------------------------------
    // CREATE NOTIFICATION LOG
    // ----------------------------------------

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

    console.log(`Follow-up ${followUp.id} claimed for ${recipientEmail}.`);

    return {
      claimed: true,
      followUpId: followUp.id,
      notificationLogId: notificationLog.id,
      attemptNumber,
      recipientEmail,
      eventType: followUp.eventType,
      subject: template.subject,
      body: template.body,
    };
  });
}

// ============================================
// PROCESS DUE EMAIL FOLLOW-UPS
// Independent execution for every due follow-up.
// ============================================

export async function processDueFollowUps({
  now = new Date(),
  limit = MAX_BATCH_SIZE,
} = {}) {
  const candidates = await getDueFollowUps({
    now,
    limit,
  });

  const results = {
    scanned: candidates.length,
    claimed: 0,
    skipped: 0,
    claims: [],
    skipReasons: [],
  };

  console.log(`Found ${candidates.length} eligible email follow-ups.`);

  for (const followUp of candidates) {
    try {
      const claim = await claimEmailFollowUp(followUp.id, now);

      if (claim.claimed) {
        results.claimed++;
        results.claims.push(claim);
        continue;
      }

      results.skipped++;

      results.skipReasons.push({
        followUpId: followUp.id,
        eventType: followUp.eventType,
        reason: claim.reason,
      });

      console.log(`Follow-up ${followUp.id} skipped: ${claim.reason}`);
    } catch (error) {
      results.skipped++;

      results.skipReasons.push({
        followUpId: followUp.id,
        eventType: followUp.eventType,
        reason: "CLAIM_ERROR",
        error: error.message,
      });

      console.error(`Failed to claim follow-up ${followUp.id}:`, error);
    }
  }

  // ------------------------------------------
  // FINAL SUMMARY
  // ------------------------------------------

  console.log("Follow-up processing summary:", {
    scanned: results.scanned,
    claimed: results.claimed,
    skipped: results.skipped,
    skipReasons: results.skipReasons,
  });

  return results;
}
