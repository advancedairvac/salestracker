import { NextResponse } from "next/server";

import { getRevenueJobs } from "@/lib/integrations/servicetitan";

// ============================================
// TEST REVENUE JOB FIELDS
// ============================================

export async function GET() {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        {
          success: false,
          message: "This endpoint is only available in development.",
        },
        { status: 404 },
      );
    }

    // Fetch only 3 jobs with the required revenue fields.
    const result = await getRevenueJobs({
      page: 1,
      pageSize: 3,
      includeTotal: true,
    });

    const jobs = Array.isArray(result.data) ? result.data : [];

    const availableFields = [
      ...new Set(jobs.flatMap((job) => Object.keys(job))),
    ].sort();

    return NextResponse.json({
      success: true,

      environment: process.env.SERVICETITAN_ENV || "integration",

      metadata: {
        totalCount: result.totalCount ?? null,
        page: result.page ?? 1,
        pageSize: result.pageSize ?? 3,
        hasMore: result.hasMore ?? null,
        returnedRecords: jobs.length,
      },

      availableFields,

      sampleJobs: jobs,
    });
  } catch (error) {
    console.error("[ServiceTitan Test Jobs Error]", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to fetch ServiceTitan Jobs.",
      },
      { status: 500 },
    );
  }
}
