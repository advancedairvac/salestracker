
import { prisma } from "@/lib/prisma";

// ============================================
// FOLLOW-UP PROCESSOR CONFIGURATION
// ============================================

const MAX_BATCH_SIZE = 50;

const ACTIVE_SCHEDULE_MODES = ["STANDARD", "MANUAL"];

// ============================================
// GET DUE FOLLOW-UPS
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
        {
          nextRetryAt: null,
        },
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
          customer: true,
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
    },

    orderBy: [
      {
        dueAt: "asc",
      },
      {
        createdAt: "asc",
      },
    ],

    take: safeLimit,
  });

  return followUps;
}

// ============================================
// CLAIM EMAIL FOLLOW-UP
// Atomic claim to prevent concurrent processing
// ============================================

export async function claimEmailFollowUp(followUpId) {
  if (!followUpId) {
    throw new Error("Follow-up ID is required.");
  }

  return prisma.$transaction(async (tx) => {
    // ----------------------------------------
    // GET CURRENT FOLLOW-UP
    // ----------------------------------------

    const followUp = await tx.followUp.findUnique({
      where: {
        id: followUpId,
      },

      include: {
        opportunity: {
          include: {
            customer: true,
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
      },
    });

    if (!followUp) {
      return {
        claimed: false,
        reason: "FOLLOW_UP_NOT_FOUND",
      };
    }

    const now = new Date();

    // ----------------------------------------
    // VALIDATE FOLLOW-UP
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

    if (
      followUp.notificationAttempts >= followUp.maxAttempts
    ) {
      return {
        claimed: false,
        reason: "MAX_ATTEMPTS_REACHED",
      };
    }

    if (
      followUp.nextRetryAt &&
      followUp.nextRetryAt > now
    ) {
      return {
        claimed: false,
        reason: "RETRY_NOT_DUE",
      };
    }

    if (
      !followUp.schedule.isActive ||
      followUp.schedule.mode !== followUp.scheduleType
    ) {
      return {
        claimed: false,
        reason: "SCHEDULE_NOT_ACTIVE",
      };
    }

    if (followUp.opportunity.status !== "OPEN") {
      return {
        claimed: false,
        reason: "OPPORTUNITY_NOT_OPEN",
      };
    }

    // ----------------------------------------
    // VALIDATE RECIPIENT
    // ----------------------------------------

    const recipientEmail = followUp.opportunity.customer.email;

    if (!recipientEmail) {
      return {
        claimed: false,
        reason: "CUSTOMER_EMAIL_MISSING",
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
          {
            nextRetryAt: null,
          },
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

    // Another worker may have claimed this record.
    if (claimResult.count !== 1) {
      return {
        claimed: false,
        reason: "ALREADY_CLAIMED",
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
      subject: template.subject,
      body: template.body,
    };
  });
}

// ============================================
// PROCESS DUE EMAIL FOLLOW-UPS
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
  };

  for (const followUp of candidates) {
    try {
      const claim = await claimEmailFollowUp(followUp.id);

      if (claim.claimed) {
        results.claimed++;
        results.claims.push(claim);
      } else {
        results.skipped++;
      }
    } catch (error) {
      results.skipped++;

      console.error(
        `Failed to claim follow-up ${followUp.id}:`,
        error,
      );
    }
  }

  return results;
}
