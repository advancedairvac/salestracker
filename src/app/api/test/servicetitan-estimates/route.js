
import { NextResponse } from "next/server";

import { getEstimates } from "@/lib/integrations/servicetitan";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = performance.now();

  try {
    // Fetch ONLY the first 10 estimates.
    const result = await getEstimates({
      page: 1,
      pageSize: 10,
      includeTotal: true,
    });

    if (!result || !Array.isArray(result.data)) {
      throw new Error("Invalid ServiceTitan Estimates response.");
    }

    const estimates = result.data;

    // Collect all available fields.
    const allFields = new Set();

    estimates.forEach((estimate) => {
      Object.keys(estimate || {}).forEach((key) => {
        allFields.add(key);
      });
    });

    const fieldTypes = {};

    for (const field of allFields) {
      const types = new Set();

      estimates.forEach((estimate) => {
        const value = estimate?.[field];

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

    const duration = (performance.now() - start) / 1000;

    console.log(
      `[Estimates Test API] First 10 records fetched in ${duration.toFixed(2)} sec`,
    );

    return NextResponse.json({
      success: true,

      summary: {
        totalRecordsInServiceTitan: result.totalCount ?? null,
        recordsFetched: estimates.length,
        requestedPageSize: 10,
        availableFields: [...allFields],
        totalUniqueFields: allFields.size,
        fieldTypes,
        executionTime: `${duration.toFixed(2)} sec`,
      },

      samples: estimates,
    });
  } catch (error) {
    const duration = (performance.now() - start) / 1000;

    console.error("[Estimates Test API]", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        executionTime: `${duration.toFixed(2)} sec`,
      },
      { status: 500 },
    );
  }
}
