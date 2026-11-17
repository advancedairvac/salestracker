import { processDueFollowUps } from "@/lib/notifications/follow-up-processor";
import { sendFollowUpEmail } from "@/lib/email/send-follow-up-email";

import {
  markNotificationSent,
  markNotificationFailed,
  recoverStaleProcessingNotifications,
} from "@/lib/notifications/notification-logger";

export async function dispatchFollowUpEmails({
  now = new Date(),
  limit = 50,
} = {}) {
  const summary = {
    recovery: {
      scanned: 0,
      recovered: 0,
      skipped: 0,
      errors: [],
    },
    scanned: 0,
    claimed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    skipReasons: [],
    acceptedButUnlogged: 0,
    errors: [],
  };

  try {
    summary.recovery = await recoverStaleProcessingNotifications({
      now,
      limit,
    });
  } catch (error) {
    summary.errors.push({
      stage: "RECOVERY",
      reason: error.message,
    });
  }

  let processingResult;

  try {
    processingResult = await processDueFollowUps({ now, limit });

    summary.scanned = processingResult.scanned;
    summary.claimed = processingResult.claimed;
    summary.skipped = processingResult.skipped;
    summary.skipReasons = processingResult.skipReasons;
  } catch (error) {
    summary.errors.push({
      stage: "PROCESSING",
      reason: error.message,
    });

    return {
      success: false,
      ...summary,
    };
  }

  for (const claim of processingResult.claims) {
    let emailResult;

    try {
      emailResult = await sendFollowUpEmail({
        recipientEmail: claim.recipientEmail,
        subject: claim.subject,
        body: claim.body,
      });
    } catch (error) {
      try {
        const failureResult = await markNotificationFailed({
          notificationLogId: claim.notificationLogId,
          followUpId: claim.followUpId,
          attemptNumber: claim.attemptNumber,
          error,
        });

        summary.failed++;

        summary.errors.push({
          followUpId: claim.followUpId,
          reason: error.message,
          retryScheduled: failureResult.retryScheduled,
          nextRetryAt: failureResult.nextRetryAt,
        });
      } catch (loggingError) {
        summary.errors.push({
          followUpId: claim.followUpId,
          reason: error.message,
          loggingError: loggingError.message,
        });
      }

      continue;
    }

    try {
      await markNotificationSent({
        notificationLogId: claim.notificationLogId,
        followUpId: claim.followUpId,
        providerMessageId: emailResult.providerMessageId,
      });

      summary.sent++;
    } catch (error) {
      summary.acceptedButUnlogged++;

      summary.errors.push({
        followUpId: claim.followUpId,
        reason: "EMAIL_ACCEPTED_BUT_DATABASE_UPDATE_FAILED",
        providerMessageId: emailResult.providerMessageId,
        loggingError: error.message,
      });
    }
  }

  const hasRecoveryErrors = summary.recovery.errors?.length > 0;

  const hasSystemErrors = summary.errors.some(
    (item) =>
      ["RECOVERY", "PROCESSING"].includes(item.stage) ||
      item.reason === "EMAIL_ACCEPTED_BUT_DATABASE_UPDATE_FAILED",
  );

  return {
    success: !hasRecoveryErrors && !hasSystemErrors && summary.failed === 0,
    ...summary,
  };
}
