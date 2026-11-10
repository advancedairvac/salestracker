
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { getJobs, serviceTitanRequest } from "@/lib/integrations/servicetitan";

export const dynamic = "force-dynamic";

// ============================================
// SAFE LOOKUP HELPER
// ============================================

async function testEndpoint(name, path) {
  try {
    const result = await serviceTitanRequest(path);

    return {
      success: true,
      name,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      name,
      error: error.message,
    };
  }
}

// ============================================
// TEST JOB DETAILS
// ============================================

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const jobId = searchParams.get("jobId") || "2003";

    // ========================================
    // FETCH JOB
    // ========================================

    const jobResult = await getJobs({
      page: 1,
      pageSize: 1,
      ids: jobId,
      includeTotal: true,
    });

    const job = Array.isArray(jobResult.data)
      ? jobResult.data.find(
          (item) => String(item.id) === String(jobId),
        ) || jobResult.data[0]
      : null;

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: `Job ${jobId} not found.`,
          jobResult,
        },
        { status: 404 },
      );
    }

    // ========================================
    // LOOKUP CUSTOMER, LOCATION AND JOB TYPE
    // ========================================

    const [customer, location, jobType] = await Promise.all([
      testEndpoint(
        "Customer",
        `/crm/v2/tenant/{tenant}/customers/${job.customerId}`,
      ),

      testEndpoint(
        "Location",
        `/crm/v2/tenant/{tenant}/locations/${job.locationId}`,
      ),

      testEndpoint(
        "Job Type",
        `/jpm/v2/tenant/{tenant}/job-types/${job.jobTypeId}`,
      ),
    ]);

    // ========================================
    // RESPONSE
    // ========================================

    return NextResponse.json({
      success: true,

      job: {
        id: job.id,
        jobNumber: job.jobNumber,
        summary: job.summary,
        summaryOfWork: job.summaryOfWork,
        customerId: job.customerId,
        locationId: job.locationId,
        jobTypeId: job.jobTypeId,
        total: job.total,
        jobStatus: job.jobStatus,
        createdOn: job.createdOn,
        completedOn: job.completedOn,
        raw: job,
      },

      lookups: {
        customer,
        location,
        jobType,
      },
    });
  } catch (error) {
    console.error("ServiceTitan Job Details Test:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
