
import { getAllEstimates } from "@/lib/integrations/servicetitan";

export async function GET() {
  try {
    const targetEstimateId = 34193;

    // Fetch estimates using the existing integration endpoint
    const estimates = await getAllEstimates({
      pageSize: 100,
      maxPages: 10,
    });

    // Find our target estimate
    const estimate = estimates.find(
      (item) => String(item.id) === String(targetEstimateId),
    );

    if (!estimate) {
      return Response.json({
        success: true,
        found: false,
        message: `Estimate ${targetEstimateId} was not found in the fetched pages.`,
        totalFetched: estimates.length,
      });
    }

    return Response.json({
      success: true,
      found: true,

      estimateDetails: {
        id: estimate.id,
        name: estimate.name,
        status: estimate.status,
        jobId: estimate.jobId,
        customerId: estimate.customerId,

        soldBy: estimate.soldBy ?? null,
        soldById: estimate.soldById ?? null,

        createdById: estimate.createdById ?? null,
        soldOn: estimate.soldOn ?? null,

        availableFields: Object.keys(estimate),
      },

      rawEstimate: estimate,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
