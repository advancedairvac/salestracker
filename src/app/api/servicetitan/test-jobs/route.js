
import { NextResponse } from "next/server";
import { getJobs } from "@/lib/integrations/servicetitan";

export const dynamic = "force-dynamic";

export async function GET() {
  // Keep this endpoint available only in development.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, message: "Not found." },
      { status: 404 },
    );
  }

  try {
    const result = await getJobs({
      page: 1,
      pageSize: 3,
      includeTotal: true,
      jobStatus: "Completed",
    });

    const jobs = Array.isArray(result?.data) ? result.data : [];

    const sampleJobs = jobs.map((job) => ({
      id: job.id ?? null,
      jobNumber: job.jobNumber ?? null,

      customerId: job.customerId ?? null,
      customerName:
        job.customerName ??
        job.customer?.name ??
        job.customer?.firstName ??
        null,

      customerObject: job.customer
        ? {
            id: job.customer.id ?? null,
            name: job.customer.name ?? null,
            keys: Object.keys(job.customer),
          }
        : null,

      total: job.total ?? null,
      jobStatus: job.jobStatus ?? null,
      completedOn: job.completedOn ?? null,

      availableFields: Object.keys(job),
    }));

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

      sampleJobs,
    });
  } catch (error) {
    console.error("[ServiceTitan Test API]", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to fetch ServiceTitan jobs.",
      },
      { status: 500 },
    );
  }
}
