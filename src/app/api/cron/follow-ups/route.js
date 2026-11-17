
import { NextResponse } from "next/server";

import { dispatchFollowUpEmails } from "@/lib/notifications/follow-up-email-dispatcher";

// ============================================
// RUNTIME CONFIGURATION
// ============================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================
// CRON AUTHENTICATION
// ============================================

function isAuthorizedCronRequest(request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET is missing.");

    return false;
  }

  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${cronSecret}`;
}

// ============================================
// CRON FOLLOW-UP HANDLER
// ============================================

export async function GET(request) {
  // ------------------------------------------
  // AUTHENTICATION
  // ------------------------------------------

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

  // ------------------------------------------
  // PROCESS FOLLOW-UPS
  // ------------------------------------------

  try {
    console.log("Cron follow-up execution started.");

    const result = await dispatchFollowUpEmails({
      limit: 50,
    });

    console.log("Cron follow-up execution completed.", result);

    return NextResponse.json(
      {
        success: true,
        message: "Follow-up processing completed.",
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
