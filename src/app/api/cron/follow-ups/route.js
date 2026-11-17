import { NextResponse } from "next/server";

import { dispatchFollowUpEmails } from "@/lib/notifications/follow-up-email-dispatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================
// CRON AUTHORIZATION
// ============================================

function isAuthorizedCronRequest(request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET is missing.");
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

// ============================================
// GET - PROCESS FOLLOW-UP EMAILS
// ============================================

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized cron request.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    console.log("Cron follow-up execution started.");

    const result = await dispatchFollowUpEmails({
      limit: 50,
    });

    console.log("Cron follow-up execution completed.", result);

    return NextResponse.json(
      {
        success: result.success,

        message: result.success
          ? "Follow-up processing completed successfully."
          : "Follow-up processing completed with errors or failed notifications.",

        timestamp: new Date().toISOString(),

        result,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Cron follow-up execution failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Follow-up processing failed.",
      },
      {
        status: 500,
      },
    );
  }
}
