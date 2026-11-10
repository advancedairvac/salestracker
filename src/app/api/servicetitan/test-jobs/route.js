
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { getJobs } from "@/lib/integrations/servicetitan";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await getJobs({
      page: 1,
      pageSize: 5,
      includeTotal: true,
    });

    const jobs = Array.isArray(result.data) ? result.data : [];

    return NextResponse.json({
      success: true,

      totalCount: result.totalCount ?? null,
      hasMore: result.hasMore ?? null,

      returnedJobs: jobs.length,

      jobs: jobs.map((job) => ({
        raw: job,

        extracted: {
          id: job.id ?? null,
          jobNumber: job.jobNumber ?? null,
          summary: job.summary ?? null,
          jobName: job.name ?? null,
          customerId: job.customerId ?? null,
          locationId: job.locationId ?? null,
          jobStatus: job.jobStatus ?? null,
          total: job.total ?? null,
          completedOn: job.completedOn ?? null,
          createdOn: job.createdOn ?? null,
        },

        availableFields: Object.keys(job),
      })),
    });
  } catch (error) {
    console.error("ServiceTitan Jobs Test Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to test ServiceTitan Jobs API.",
      },
      { status: 500 },
    );
  }
}
