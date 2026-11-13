
import { NextResponse } from "next/server";

import { getYtdRevenueJobs } from "@/lib/dashboard/servicetitan-jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jobs = await getYtdRevenueJobs();

    // ------------------------------------------
    // ANALYZE ALL JOB FIELDS
    // ------------------------------------------

    const allFields = new Set();

    jobs.forEach((job) => {
      Object.keys(job || {}).forEach((key) => {
        allFields.add(key);
      });
    });

    // ------------------------------------------
    // ANALYZE FIELD DATA TYPES
    // ------------------------------------------

    const fieldTypes = {};

    for (const field of allFields) {
      const types = new Set();

      jobs.forEach((job) => {
        const value = job?.[field];

        if (value === null) {
          types.add("null");
        } else if (Array.isArray(value)) {
          types.add("array");
        } else {
          types.add(typeof value);
        }
      });

      fieldTypes[field] = [...types];
    }

    // ------------------------------------------
    // SAMPLE JOBS
    // ------------------------------------------

    const samples = jobs.slice(0, 5);

    // ------------------------------------------
    // DASHBOARD REQUIRED FIELDS
    // ------------------------------------------

    const dashboardRequiredFields = [
      "id",
      "jobStatus",
      "completedOn",
      "total",
    ];

    return NextResponse.json({
      success: true,

      summary: {
        totalJobsLoaded: jobs.length,
        uniqueFields: [...allFields],
        totalUniqueFields: allFields.size,
        fieldTypes,
        dashboardRequiredFields,
      },

      samples,

      firstJob: jobs[0] || null,

      lastJob: jobs[jobs.length - 1] || null,
    });
  } catch (error) {
    console.error("[ServiceTitan Jobs Test]", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
