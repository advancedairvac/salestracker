
import { NextResponse } from "next/server";
import { getEstimates } from "@/lib/integrations/servicetitan";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startTime = Date.now();

    const page = 1;
    const pageSize = 500;

    const response = await getEstimates({
      page,
      pageSize,
      includeTotal: true,
    });

    const estimates = Array.isArray(response?.data)
      ? response.data
      : [];

    // Keep only fields required for Pipeline Dashboard.
    const optimizedEstimates = estimates.map((estimate) => ({
      id: estimate.id,
      status: estimate.status?.name || "Unknown",
      statusValue: estimate.status?.value ?? null,
      subtotal: Number(estimate.subtotal) || 0,
      createdOn: estimate.createdOn,
    }));

    // Count estimates by actual status name.
    const statusCounts = {};

    for (const estimate of optimizedEstimates) {
      const status = estimate.status;

      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    // Calculate Open estimates.
    const openEstimates = optimizedEstimates.filter(
      (estimate) =>
        estimate.status.toLowerCase() === "open",
    );

    const openEstimateValue = openEstimates.reduce(
      (total, estimate) => total + estimate.subtotal,
      0,
    );

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,

      summary: {
        page,
        pageSize,
        totalCount: response.totalCount ?? null,
        returnedRecords: estimates.length,
        hasMore: response.hasMore ?? null,
        responseTime: `${responseTime}ms`,
      },

      statusCounts,

      openEstimateCount: openEstimates.length,

      openEstimateValue: Number(
        openEstimateValue.toFixed(2),
      ),

      returnedFields: Object.keys(
        optimizedEstimates[0] || {},
      ),

      estimates: optimizedEstimates,
    });
  } catch (error) {
    console.error("ServiceTitan Test Estimates API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch ServiceTitan estimates.",
        error: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
