import { prisma } from "@/lib/prisma";
import { renderFollowUpEmail } from "@/lib/email/follow-up-email-template";

const MAX_BATCH_SIZE = 50;
const ACTIVE_SCHEDULE_MODES = ["STANDARD", "MANUAL"];

function getSafeLimit(limit) {
  const parsed = Number(limit);

  if (!Number.isFinite(parsed)) return MAX_BATCH_SIZE;

  return Math.min(Math.max(Math.floor(parsed), 1), MAX_BATCH_SIZE);
}

// ============================================
// GET DUE FOLLOW-UPS
// ============================================

export async function getDueFollowUps({
  now = new Date(),
  limit = MAX_BATCH_SIZE,
} = {}) {
  const safeLimit = getSafeLimit(limit);

  const followUps = await prisma.followUp.findMany({
    where: {
      isActive: true,
      status: "PENDING",

      dueAt: {
        lte: now,
      },

      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],

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
          assignedTo: {
            is: {
              status: "ACTIVE",
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
              status: true,
            },
          },

          customer: true,
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
      followUp.opportunity?.assignedTo?.status === "ACTIVE" &&
      Boolean(followUp.opportunity.assignedTo.email?.trim())
    );
  });
}

// ============================================
// CLAIM EMAIL FOLLOW-UP
// ============================================

export async function claimEmailFollowUp(followUpId, now = new Date()) {
  if (!followUpId) {
    throw new Error("Follow-up ID is required.");
  }

  return prisma.$transaction(async (tx) => {
    // ----------------------------------------
    // GET FOLLOW-UP
    // ----------------------------------------

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
                status: true,
              },
            },

            customer: true,
          },
        },

        schedule: true,
      },
    });

    if (!followUp) {
      return {
        claimed: false,
        reason: "FOLLOW_UP_NOT_FOUND",
      };
    }

    // ----------------------------------------
    // VALIDATE FOLLOW-UP STATUS
    // ----------------------------------------

    if (followUp.status !== "PENDING" || !followUp.isActive) {
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
    // VALIDATE SCHEDULE
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
    // VALIDATE OPPORTUNITY
    // ----------------------------------------

    if (followUp.opportunity?.status !== "OPEN") {
      return {
        claimed: false,
        reason: "OPPORTUNITY_NOT_OPEN",
      };
    }

    // ----------------------------------------
    // VALIDATE ASSIGNED SALESPERSON
    // ----------------------------------------

    const assignedUser = followUp.opportunity.assignedTo;
    const recipientEmail = assignedUser?.email?.trim();

    if (assignedUser?.status !== "ACTIVE" || !recipientEmail) {
      return {
        claimed: false,
        reason: "ASSIGNED_USER_EMAIL_MISSING_OR_INACTIVE",
      };
    }

    // ----------------------------------------
    // VALIDATE CUSTOMER
    // ----------------------------------------

    if (!followUp.opportunity.customer) {
      return {
        claimed: false,
        reason: "CUSTOMER_NOT_FOUND",
      };
    }

    // ----------------------------------------
    // CHECK EXISTING PROCESSING NOTIFICATION
    // ----------------------------------------

    const existingProcessingLog = await tx.notificationLog.findFirst({
      where: {
        followUpId: followUp.id,
        status: "PROCESSING",
      },

      select: {
        id: true,
      },
    });

    if (existingProcessingLog) {
      return {
        claimed: false,
        reason: "NOTIFICATION_ALREADY_PROCESSING",
      };
    }

    // ----------------------------------------
    // GET ADMIN EMAIL TEMPLATE
    // ----------------------------------------

    const template = await tx.emailTemplate.findFirst({
      where: {
        userId: null,
        eventType: followUp.eventType,
        isActive: true,
      },

      orderBy: {
        createdAt: "asc",
      },
    });

    // ----------------------------------------
    // RENDER EMAIL
    // ----------------------------------------

    const email = renderFollowUpEmail({
      opportunity: followUp.opportunity,
      followUp,

      // Admin-edited email message
      customMessage: template?.body,

      // Admin-edited email subject
      subject: template?.subject,
    });

    // ----------------------------------------
    // PREPARE ATTEMPT
    // ----------------------------------------

    const attemptNumber = followUp.notificationAttempts + 1;

    const eventKey = `followup:${followUp.id}:attempt:${attemptNumber}`;

    // ----------------------------------------
    // ATOMICALLY CLAIM FOLLOW-UP
    // ----------------------------------------

    const claimResult = await tx.followUp.updateMany({
      where: {
        id: followUp.id,
        status: "PENDING",
        isActive: true,

        notificationAttempts: followUp.notificationAttempts,

        dueAt: {
          lte: now,
        },

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
        templateId: template?.id || null,

        eventKey,
        eventType: followUp.eventType,
        attemptNumber,

        recipientEmail,

        status: "PROCESSING",
        processingAt: now,
        scheduledAt: followUp.dueAt,

        subjectSnapshot: email.subject,
        bodySnapshot: email.html,
      },
    });

    // ----------------------------------------
    // RETURN CLAIMED EMAIL
    // ----------------------------------------

    return {
      claimed: true,

      followUpId: followUp.id,
      notificationLogId: notificationLog.id,

      attemptNumber,

      recipientEmail,

      eventType: followUp.eventType,
      followUpType: followUp.type,

      subject: email.subject,
      body: email.html,
      text: email.text,
    };
  });
}

// ============================================
// PROCESS DUE FOLLOW-UPS
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
