
import { NextResponse } from "next/server";
import { getJobs } from "@/lib/integrations/servicetitan";

export async function GET() {
  try {
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    const endDate = new Date(new Date().getFullYear() + 1, 0, 1);

    const result = await getJobs({
      page: 1,
      pageSize: 500,
      includeTotal: true,
      jobStatus: "Completed",
      completedOnOrAfter: startDate.toISOString(),
      completedBefore: endDate.toISOString(),
    });

    return NextResponse.json({
      success: true,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
      page: result.page,
      pageSize: result.pageSize,
      jobs: (result.data || []).map((job) => ({
        id: job.id,
        jobNumber: job.jobNumber,
        jobStatus: job.jobStatus,
        completedOn: job.completedOn,
        total: job.total,
      })),
    });
  } catch (error) {
    console.error("Jobs Filter Test Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
