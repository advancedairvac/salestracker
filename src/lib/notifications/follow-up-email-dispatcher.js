import { processDueFollowUps } from "@/lib/notifications/follow-up-processor";

import { sendFollowUpEmail } from "@/lib/email/send-follow-up-email";

import {
  markNotificationSent,
  markNotificationFailed,
  recoverStaleProcessingNotifications,
} from "@/lib/notifications/notification-logger";

export async function dispatchFollowUpEmails({ limit = 50 } = {}) {
  const results = {
    success: true,
    recovered: 0,
    scanned: 0,
    claimed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // ============================================
  // RECOVER STALE PROCESSING NOTIFICATIONS
  // ============================================

  try {
    const recovery = await recoverStaleProcessingNotifications({
      limit,
    });

    results.recovered = recovery.recovered;

    if (recovery.errors?.length) {
      results.errors.push(
        ...recovery.errors.map((item) => ({
          stage: "STALE_RECOVERY",
          ...item,
        })),
      );
    }
  } catch (error) {
    results.errors.push({
      stage: "STALE_RECOVERY",
      error: error.message,
    });
  }

  // ============================================
  // PROCESS DUE FOLLOW-UPS
  // ============================================

  let processing;

  try {
    processing = await processDueFollowUps({
      limit,
    });

    results.scanned = processing.scanned;
    results.claimed = processing.claimed;
    results.skipped = processing.skipped;

    if (processing.skipReasons?.length) {
      results.skipReasons = processing.skipReasons;
    }
  } catch (error) {
    results.success = false;

    results.errors.push({
      stage: "FOLLOW_UP_PROCESSING",
      error: error.message,
    });

    return results;
  }

  // ============================================
  // SEND CLAIMED EMAILS
  // ============================================

  for (const claim of processing.claims) {
    try {
      const emailResult = await sendFollowUpEmail({
        recipientEmail: claim.recipientEmail,
        subject: claim.subject,
        body: claim.body,
        text: claim.text,
      });

      await markNotificationSent({
        notificationLogId: claim.notificationLogId,
        followUpId: claim.followUpId,
        providerMessageId: emailResult.providerMessageId,
      });

      results.sent++;
    } catch (error) {
      results.failed++;

      results.errors.push({
        stage: "EMAIL_DELIVERY",
        followUpId: claim.followUpId,
        notificationLogId: claim.notificationLogId,
        attemptNumber: claim.attemptNumber,
        error: error.message,
      });

      // ========================================
      // MARK NOTIFICATION FAILED
      // ========================================

      try {
        await markNotificationFailed({
          notificationLogId: claim.notificationLogId,
          followUpId: claim.followUpId,
          attemptNumber: claim.attemptNumber,
          error,
        });
      } catch (loggingError) {
        results.errors.push({
          stage: "FAILURE_LOGGING",
          followUpId: claim.followUpId,
          notificationLogId: claim.notificationLogId,
          error: loggingError.message,
        });
      }
    }
  }

  // ============================================
  // FINAL RESULT
  // ============================================

  results.success = results.failed === 0 && results.errors.length === 0;

  return results;
}
