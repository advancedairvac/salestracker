
import { NextResponse } from "next/server";
import { getJobs } from "@/lib/integrations/servicetitan";
import { getRevenueDateRanges } from "@/lib/date/date-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startTime = Date.now();

    const {
      yearStart,
      nextYearStart,
    } = getRevenueDateRanges();

    const page = 1;
    const pageSize = 500;

    // Only request fields required by the Admin Dashboard Revenue Card.
    const requestedFields = "id,jobStatus,completedOn,total";

    const filters = {
      page,
      pageSize,
      includeTotal: true,
      jobStatus: "Completed",
      completedOnOrAfter: yearStart.toISOString(),
      completedBefore: nextYearStart.toISOString(),
      fields: requestedFields,
    };

    const response = await getJobs(filters);

    const jobs = response?.data || [];
    const totalCount = response?.totalCount || 0;

    const returnedFields =
      jobs.length > 0 ? Object.keys(jobs[0]) : [];

    const totalJobValue = jobs.reduce((sum, job) => {
      return sum + (Number(job.total) || 0);
    }, 0);

    const positiveValueJobs = jobs.filter(
      (job) => Number(job.total) > 0
    );

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,

      summary: {
        page,
        pageSize,
        totalCount,
        returnedRecords: jobs.length,
        hasMore: jobs.length < totalCount,
        completedJobs: jobs.filter(
          (job) =>
            String(job.jobStatus).toLowerCase() === "completed"
        ).length,
        positiveValueJobs: positiveValueJobs.length,
        totalJobValue: Number(totalJobValue.toFixed(2)),
        responseTime: `${responseTime}ms`,
      },

      requestedFields: requestedFields.split(","),

      returnedFields,

      fieldProjectionSupported:
        returnedFields.length > 0 &&
        returnedFields.every((field) =>
          requestedFields.split(",").includes(field)
        ),

      jobs,
    });
  } catch (error) {
    console.error("ServiceTitan Test Jobs API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch ServiceTitan jobs.",
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
