import { processDueFollowUps } from "@/lib/notifications/follow-up-processor";
import { sendFollowUpEmail } from "@/lib/email/send-follow-up-email";

import {
  markNotificationSent,
  markNotificationFailed,
  recoverStaleProcessingNotifications,
} from "@/lib/notifications/notification-logger";

// ============================================
// FOLLOW-UP EMAIL DISPATCHER
// ============================================

export async function dispatchFollowUpEmails({
  now = new Date(),
  limit = 50,
} = {}) {
  console.log("Starting follow-up email dispatcher...");

  const summary = {
    recovery: {
      scanned: 0,
      recovered: 0,
      skipped: 0,
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

  // ==========================================
  // STEP 1: RECOVER STALE NOTIFICATIONS
  // ==========================================

  try {
    summary.recovery = await recoverStaleProcessingNotifications({
      now,
      limit,
    });

    console.log("Stale notification recovery completed.", summary.recovery);
  } catch (error) {
    console.error("Notification recovery failed:", error);

    summary.errors.push({
      stage: "RECOVERY",
      reason: error.message,
    });
  }

  // ==========================================
  // STEP 2: CLAIM DUE FOLLOW-UPS
  // ==========================================

  let processingResult;

  try {
    processingResult = await processDueFollowUps({
      now,
      limit,
    });

    summary.scanned = processingResult.scanned ?? 0;
    summary.claimed = processingResult.claimed ?? 0;
    summary.skipped = processingResult.skipped ?? 0;
    summary.skipReasons = processingResult.skipReasons ?? [];
  } catch (error) {
    console.error("Failed to process due follow-ups:", error);

    summary.errors.push({
      stage: "PROCESSING",
      reason: error.message,
    });

    return {
      success: false,
      ...summary,
    };
  }

  // ==========================================
  // STEP 3: PROCESS CLAIMED FOLLOW-UPS
  // ==========================================

  for (const claim of processingResult.claims ?? []) {
    let emailResult;

    // ----------------------------------------
    // SEND EMAIL
    // ----------------------------------------

    try {
      emailResult = await sendFollowUpEmail({
        recipientEmail: claim.recipientEmail,
        subject: claim.subject,
        body: claim.body,
      });
    } catch (error) {
      console.error(
        `Email sending failed for follow-up ${claim.followUpId}:`,
        error,
      );

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
        console.error(
          `Failed to record notification failure for ${claim.followUpId}:`,
          loggingError,
        );

        summary.errors.push({
          followUpId: claim.followUpId,
          reason: error.message,
          loggingError: loggingError.message,
        });
      }

      continue;
    }

    // ----------------------------------------
    // EMAIL ACCEPTED BY RESEND
    // ----------------------------------------

    try {
      await markNotificationSent({
        notificationLogId: claim.notificationLogId,
        followUpId: claim.followUpId,
        providerMessageId: emailResult.providerMessageId,
      });

      summary.sent++;

      console.log(
        `Email accepted and logged for follow-up ${claim.followUpId}.`,
      );
    } catch (error) {
      summary.acceptedButUnlogged++;

      console.error(
        `Email accepted by Resend, but database logging failed for ${claim.followUpId}:`,
        error,
      );

      summary.errors.push({
        followUpId: claim.followUpId,
        reason: "EMAIL_ACCEPTED_BUT_DATABASE_UPDATE_FAILED",
        providerMessageId: emailResult.providerMessageId,
        loggingError: error.message,
      });
    }
  }

  // ==========================================
  // STEP 4: FINAL SUMMARY
  // ==========================================

  console.log("Follow-up email dispatcher completed.");
  console.log(summary);

  return {
    success: summary.errors.length === 0,
    ...summary,
  };
}
