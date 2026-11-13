
import { NextResponse } from "next/server";

import { getEstimates } from "@/lib/integrations/servicetitan";
import { getDateBounds } from "@/lib/date/date-utils";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const startedAt = performance.now();

  try {
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          message: "startDate and endDate are required.",
        },
        { status: 400 },
      );
    }

    const { start, endExclusive } = getDateBounds(
      startDate,
      endDate,
    );

    // ------------------------------------------
    // BASELINE REQUEST
    // No date filter
    // ------------------------------------------

    const baseline = await getEstimates({
      page: 1,
      pageSize: 5,
      includeTotal: true,
    });

    // ------------------------------------------
    // FILTERED REQUEST
    // Test createdOn date filters
    // ------------------------------------------

    const filtered = await getEstimates({
      page: 1,
      pageSize: 5,
      includeTotal: true,
      createdOnOrAfter: start.toISOString(),
      createdBefore: endExclusive.toISOString(),
    });

    if (
      !Array.isArray(baseline?.data) ||
      !Array.isArray(filtered?.data)
    ) {
      throw new Error("Invalid ServiceTitan Estimates response.");
    }

    const sample = filtered.data[0] || null;

    const duration = (performance.now() - startedAt) / 1000;

    return NextResponse.json({
      success: true,

      requestedDateRange: {
        start: start.toISOString(),
        endExclusive: endExclusive.toISOString(),
      },

      baseline: {
        totalCount: baseline.totalCount ?? null,
        recordsFetched: baseline.data.length,
      },

      filtered: {
        totalCount: filtered.totalCount ?? null,
        recordsFetched: filtered.data.length,
      },

      sample: sample
        ? {
            fields: Object.keys(sample),

            types: Object.fromEntries(
              Object.entries(sample).map(([key, value]) => [
                key,
                value === null
                  ? "null"
                  : Array.isArray(value)
                    ? "array"
                    : typeof value,
              ]),
            ),

            data: sample,
          }
        : null,

      performance: {
        totalDurationSeconds: Number(duration.toFixed(2)),
      },
    });
  } catch (error) {
    const duration = (performance.now() - startedAt) / 1000;

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        durationSeconds: Number(duration.toFixed(2)),
      },
      { status: 500 },
    );
  }
}
