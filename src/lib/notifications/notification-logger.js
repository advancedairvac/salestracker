
import { prisma } from "@/lib/prisma";

// ============================================
// RETRY CONFIGURATION
// ============================================

const BASE_RETRY_DELAY_MINUTES = 5;

// ============================================
// CALCULATE NEXT RETRY TIME
// ============================================

function getNextRetryAt(attemptNumber) {
  const delayMinutes =
    BASE_RETRY_DELAY_MINUTES * Math.pow(2, attemptNumber - 1);

  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

// ============================================
// MARK NOTIFICATION AS SENT
// ============================================

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
    const log = await tx.notificationLog.findUnique({
      where: {
        id: notificationLogId,
      },
      select: {
        id: true,
        followUpId: true,
        status: true,
      },
    });

    if (!log || log.followUpId !== followUpId) {
      throw new Error("Notification log not found.");
    }

    if (log.status !== "PROCESSING") {
      throw new Error("Notification log is not processing.");
    }

    await tx.notificationLog.update({
      where: {
        id: notificationLogId,
      },
      data: {
        status: "SENT",
        sentAt: now,
        providerMessageId: providerMessageId || null,
        errorMessage: null,
      },
    });

    await tx.followUp.updateMany({
      where: {
        id: followUpId,
        status: "PENDING",
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

    return {
      success: true,
      status: "SENT",
    };
  });
}

// ============================================
// MARK NOTIFICATION AS FAILED
// ============================================

export async function markNotificationFailed({
  notificationLogId,
  followUpId,
  attemptNumber,
  error,
}) {
  if (!notificationLogId || !followUpId) {
    throw new Error("Notification log ID and follow-up ID are required.");
  }

  const errorMessage =
    error instanceof Error
      ? error.message
      : String(error || "Unknown email delivery error.");

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.findUnique({
      where: {
        id: followUpId,
      },
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
      where: {
        id: notificationLogId,
      },
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

    const attempts = Math.max(
      attemptNumber,
      followUp.notificationAttempts,
    );

    const canRetry =
      followUp.status === "PENDING" &&
      followUp.isActive &&
      attempts < followUp.maxAttempts;

    const nextRetryAt = canRetry
      ? getNextRetryAt(attempts)
      : null;

    await tx.notificationLog.update({
      where: {
        id: notificationLogId,
      },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });

    await tx.followUp.update({
      where: {
        id: followUpId,
      },
      data: {
        nextRetryAt,
        lastNotificationError: errorMessage,
        ...(canRetry
          ? {}
          : {
              isActive: false,
            }),
      },
    });

    return {
      success: true,
      status: "FAILED",
      retryScheduled: canRetry,
      nextRetryAt: nextRetryAt?.toISOString() || null,
      attempts,
    };
  });
}
