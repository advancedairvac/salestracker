import { prisma } from "@/lib/prisma";

const BASE_RETRY_DELAY_MINUTES = 5;
const STALE_PROCESSING_MINUTES = 10;
const MAX_RECOVERY_BATCH_SIZE = 50;

function getNextRetryAt(attemptNumber, now = new Date()) {
  const delayMinutes =
    BASE_RETRY_DELAY_MINUTES * Math.pow(2, attemptNumber - 1);

  return new Date(now.getTime() + delayMinutes * 60 * 1000);
}

export async function markNotificationSent({
  notificationLogId,
  followUpId,
  providerMessageId,
}) {
  if (!notificationLogId || !followUpId) {
    throw new Error("Notification log ID and follow-up ID are required.");
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const logUpdate = await tx.notificationLog.updateMany({
      where: {
        id: notificationLogId,
        followUpId,
        status: "PROCESSING",
      },
      data: {
        status: "SENT",
        sentAt: now,
        processingAt: null,
        providerMessageId: providerMessageId || null,
        errorMessage: null,
      },
    });

    if (logUpdate.count !== 1) {
      throw new Error("Notification log was already processed or not found.");
    }

    const followUpUpdate = await tx.followUp.updateMany({
      where: {
        id: followUpId,
        status: "PENDING",
        isActive: true,
      },
      data: {
        status: "COMPLETED",
        isActive: false,
        notificationSentAt: now,
        nextRetryAt: null,
        lastNotificationError: null,
        completedAt: now,
      },
    });

    if (followUpUpdate.count !== 1) {
      throw new Error("Follow-up could not be marked as completed.");
    }

    return {
      success: true,
      status: "SENT",
      sentAt: now.toISOString(),
    };
  });
}

export async function markNotificationFailed({
  notificationLogId,
  followUpId,
  attemptNumber,
  error,
}) {
  if (!notificationLogId || !followUpId) {
    throw new Error("Notification log ID and follow-up ID are required.");
  }

  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error("Valid attempt number is required.");
  }

  const errorMessage =
    error instanceof Error
      ? error.message
      : String(error || "Unknown email delivery error.");

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.findUnique({
      where: { id: followUpId },
      select: {
        id: true,
        status: true,
        isActive: true,
        maxAttempts: true,
        notificationAttempts: true,
      },
    });

    if (!followUp) {
      throw new Error("Follow-up not found.");
    }

    const log = await tx.notificationLog.findUnique({
      where: { id: notificationLogId },
      select: {
        id: true,
        followUpId: true,
        status: true,
        attemptNumber: true,
      },
    });

    if (
      !log ||
      log.followUpId !== followUpId ||
      log.attemptNumber !== attemptNumber
    ) {
      throw new Error("Notification log does not match the follow-up attempt.");
    }

    if (log.status !== "PROCESSING") {
      throw new Error("Notification log is not processing.");
    }

    const attempts = Math.max(attemptNumber, followUp.notificationAttempts);

    const canRetry =
      followUp.status === "PENDING" &&
      followUp.isActive &&
      attempts < followUp.maxAttempts;

    const nextRetryAt = canRetry ? getNextRetryAt(attempts, now) : null;

    const logUpdate = await tx.notificationLog.updateMany({
      where: {
        id: notificationLogId,
        followUpId,
        status: "PROCESSING",
      },
      data: {
        status: "FAILED",
        processingAt: null,
        errorMessage,
      },
    });

    if (logUpdate.count !== 1) {
      throw new Error("Notification log was already processed.");
    }

    await tx.followUp.updateMany({
      where: {
        id: followUpId,
        status: "PENDING",
      },
      data: {
        nextRetryAt,
        lastNotificationError: errorMessage,
        ...(!canRetry ? { isActive: false } : {}),
      },
    });

    return {
      success: true,
      status: "FAILED",
      retryScheduled: canRetry,
      nextRetryAt: nextRetryAt?.toISOString() || null,
      attempts,
      maxAttempts: followUp.maxAttempts,
    };
  });
}

export async function recoverStaleProcessingNotifications({
  now = new Date(),
  limit = MAX_RECOVERY_BATCH_SIZE,
} = {}) {
  const safeLimit = Math.min(
    Math.max(Math.floor(Number(limit) || MAX_RECOVERY_BATCH_SIZE), 1),
    MAX_RECOVERY_BATCH_SIZE,
  );

  const cutoff = new Date(now.getTime() - STALE_PROCESSING_MINUTES * 60 * 1000);

  const staleLogs = await prisma.notificationLog.findMany({
    where: {
      status: "PROCESSING",
      processingAt: {
        not: null,
        lte: cutoff,
      },
    },
    select: {
      id: true,
      followUpId: true,
    },
    orderBy: {
      processingAt: "asc",
    },
    take: safeLimit,
  });

  const results = {
    scanned: staleLogs.length,
    recovered: 0,
    skipped: 0,
    errors: [],
  };

  for (const log of staleLogs) {
    try {
      const recovered = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.notificationLog.updateMany({
          where: {
            id: log.id,
            status: "PROCESSING",
            processingAt: {
              not: null,
              lte: cutoff,
            },
          },
          data: {
            status: "FAILED",
            processingAt: null,
            errorMessage:
              "Stale PROCESSING notification. Email delivery outcome is unknown. Manual review is required.",
          },
        });

        if (updateResult.count !== 1) {
          return false;
        }

        await tx.followUp.updateMany({
          where: {
            id: log.followUpId,
            status: "PENDING",
          },
          data: {
            isActive: false,
            nextRetryAt: null,
            lastNotificationError:
              "Email delivery outcome is unknown. Manual review is required before retrying.",
          },
        });

        return true;
      });

      if (recovered) {
        results.recovered++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      results.skipped++;
      results.errors.push({
        notificationLogId: log.id,
        reason: error.message,
      });

      console.error(`Failed to recover notification ${log.id}:`, error);
    }
  }

  return results;
}
