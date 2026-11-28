
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import {
  getJobs,
  getEstimates,
} from "@/lib/integrations/servicetitan";

export const dynamic = "force-dynamic";

const SAMPLE_SIZE = 10;

// ============================================
// HELPERS
// ============================================


function parseDateRange(startDate, endDate) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (
    !datePattern.test(startDate || "") ||
    !datePattern.test(endDate || "")
  ) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }

  const [startYear, startMonth, startDay] = startDate
    .split("-")
    .map(Number);

  const [endYear, endMonth, endDay] = endDate
    .split("-")
    .map(Number);

  // Local timezone dates
  const start = new Date(
    startYear,
    startMonth - 1,
    startDay,
    0, 0, 0, 0
  );

  const end = new Date(
    endYear,
    endMonth - 1,
    endDay,
    0, 0, 0, 0
  );

  // Validate actual calendar dates
  const validStart =
    start.getFullYear() === startYear &&
    start.getMonth() === startMonth - 1 &&
    start.getDate() === startDay;

  const validEnd =
    end.getFullYear() === endYear &&
    end.getMonth() === endMonth - 1 &&
    end.getDate() === endDay;

  if (!validStart || !validEnd || start > end) {
    throw new Error("Invalid date range.");
  }

  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);

  return {
    start,
    endExclusive,
  };
}


function sanitize(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (typeof value === "object") {
    if (typeof value.toJSON === "function") {
      const jsonValue = value.toJSON();

      if (
        jsonValue !== value &&
        (typeof jsonValue !== "object" || jsonValue === null)
      ) {
        return jsonValue;
      }
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitize(item),
      ]),
    );
  }

  return value;
}

function getFieldSummary(records = []) {
  const fields = new Set();

  records.forEach((record) => {
    Object.keys(record || {}).forEach((key) => {
      fields.add(key);
    });
  });

  const fieldTypes = {};

  for (const field of fields) {
    const types = new Set();

    records.forEach((record) => {
      const value = record?.[field];

      if (value === undefined) {
        types.add("undefined");
      } else if (value === null) {
        types.add("null");
      } else if (Array.isArray(value)) {
        types.add("array");
      } else if (value instanceof Date) {
        types.add("date");
      } else {
        types.add(typeof value);
      }
    });

    fieldTypes[field] = [...types];
  }

  return {
    fields: [...fields],
    totalUniqueFields: fields.size,
    fieldTypes,
  };
}

function getUniqueIds(values) {
  return [...new Set(
    values
      .filter((value) => value !== null && value !== undefined)
      .map(String),
  )];
}

// ============================================
// GET REPORT DIAGNOSTIC DATA
// ============================================

export async function GET(request) {
  const startedAt = Date.now();

  try {
    // ------------------------------------------
    // AUTHENTICATION
    // ------------------------------------------

    const user = await getAuthenticatedUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required.",
        },
        { status: 403 },
      );
    }

    // ------------------------------------------
    // QUERY PARAMETERS
    // ------------------------------------------

    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const requestedSalesmanId =
      searchParams.get("salesmanId") || "ALL";

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          message: "startDate and endDate are required.",
          example:
            "/api/test/report-data?startDate=2026-11-01&endDate=2026-11-20",
        },
        { status: 400 },
      );
    }

    const { start, endExclusive } = parseDateRange(
      startDate,
      endDate,
    );

    // ------------------------------------------
    // SALESPERSON VALIDATION
    // ------------------------------------------

    let salesman = null;

    if (requestedSalesmanId !== "ALL") {
      salesman = await prisma.user.findFirst({
        where: {
          id: requestedSalesmanId,
          role: "SALESPERSON",
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      if (!salesman) {
        return NextResponse.json(
          {
            success: false,
            message: "Active salesperson not found.",
          },
          { status: 400 },
        );
      }
    }

    const salesmanId = salesman?.id || "ALL";

    // ------------------------------------------
    // SERVICETITAN FILTERS
    // ------------------------------------------

    const jobFilters = {
      completedOnOrAfter: start.toISOString(),
      completedBefore: endExclusive.toISOString(),
      jobStatus: "Completed",
      page: 1,
      pageSize: SAMPLE_SIZE,
      includeTotal: true,
    };

    const estimateFilters = {
      createdOnOrAfter: start.toISOString(),
      createdBefore: endExclusive.toISOString(),
      page: 1,
      pageSize: SAMPLE_SIZE,
      includeTotal: true,
    };

    // ------------------------------------------
    // FETCH SERVICETITAN DATA
    // ------------------------------------------

    const [jobsResult, estimatesResult] = await Promise.all([
      getJobs(jobFilters),
      getEstimates(estimateFilters),
    ]);

    const jobs = Array.isArray(jobsResult?.data)
      ? jobsResult.data
      : [];

    const estimates = Array.isArray(estimatesResult?.data)
      ? estimatesResult.data
      : [];

    const jobIds = getUniqueIds(
      jobs.map((job) => job.id),
    );

    const estimateIds = getUniqueIds(
      estimates.map((estimate) => estimate.id),
    );

    // ------------------------------------------
    // FETCH SALES ASSIGNMENTS
    // ------------------------------------------

    const sales = jobIds.length
      ? await prisma.sale.findMany({
          where: {
            serviceTitanJobId: {
              in: jobIds,
            },
            ...(salesmanId !== "ALL"
              ? {
                  salesmanId,
                }
              : {}),
          },
          take: SAMPLE_SIZE,
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            id: true,
            serviceTitanJobId: true,
            salesmanId: true,
            source: true,
            commissionEstimate: true,
            createdAt: true,
            updatedAt: true,
            salesman: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        })
      : [];

    // ------------------------------------------
    // FETCH OPPORTUNITIES
    // ------------------------------------------

    const opportunities = await prisma.opportunity.findMany({
      where: {
        opportunityDate: {
          gte: start,
          lt: endExclusive,
        },
        ...(salesmanId !== "ALL"
          ? {
              assignedToId: salesmanId,
            }
          : {}),
      },
      take: SAMPLE_SIZE,
      orderBy: {
        opportunityDate: "desc",
      },
      select: {
        id: true,
        titanEstimateId: true,
        titanJobId: true,
        customerId: true,
        opportunityDate: true,
        jobType: true,
        value: true,
        source: true,
        status: true,
        assignedToId: true,
        createdById: true,
        closedById: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            stCustomerId: true,
            businessName: true,
            pocName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        closedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // ------------------------------------------
    // MATCH ESTIMATES WITH OPPORTUNITIES
    // ------------------------------------------

    const estimateOpportunityMatches = estimateIds.length
      ? await prisma.opportunity.findMany({
          where: {
            titanEstimateId: {
              in: estimateIds,
            },
            ...(salesmanId !== "ALL"
              ? {
                  assignedToId: salesmanId,
                }
              : {}),
          },
          take: SAMPLE_SIZE,
          select: {
            id: true,
            titanEstimateId: true,
            titanJobId: true,
            opportunityDate: true,
            jobType: true,
            value: true,
            status: true,
            assignedToId: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];

    // ------------------------------------------
    // MAPPING DIAGNOSTICS
    // ------------------------------------------

    const assignedJobIds = new Set(
      sales.map((sale) => String(sale.serviceTitanJobId)),
    );

    const matchedEstimateIds = new Set(
      estimateOpportunityMatches
        .map((item) => String(item.titanEstimateId))
        .filter(Boolean),
    );

    const unmatchedJobIds = jobIds.filter(
      (id) => !assignedJobIds.has(id),
    );

    const unmatchedEstimateIds = estimateIds.filter(
      (id) => !matchedEstimateIds.has(id),
    );

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    const response = {
      success: true,

      requestedFilters: {
        startDate,
        endDate,
        start: start.toISOString(),
        endExclusive: endExclusive.toISOString(),
        salesmanId,
        salesperson: salesman,
        sampleSize: SAMPLE_SIZE,
      },

      serviceTitan: {
        jobs: {
          totalCount: jobsResult?.totalCount ?? null,
          recordsFetched: jobs.length,
          ...getFieldSummary(jobs),
          samples: jobs,
        },

        estimates: {
          totalCount: estimatesResult?.totalCount ?? null,
          recordsFetched: estimates.length,
          ...getFieldSummary(estimates),
          samples: estimates,
        },
      },

      database: {
        sales: {
          recordsFetched: sales.length,
          ...getFieldSummary(sales),
          samples: sales,
        },

        opportunities: {
          recordsFetched: opportunities.length,
          ...getFieldSummary(opportunities),
          samples: opportunities,
        },

        estimateOpportunityMatches: {
          recordsFetched: estimateOpportunityMatches.length,
          ...getFieldSummary(estimateOpportunityMatches),
          samples: estimateOpportunityMatches,
        },
      },

      mappingDiagnostics: {
        serviceTitanJobIds: jobIds,
        assignedJobIds: [...assignedJobIds],
        unmatchedJobIds,
        matchedSaleCount: sales.length,

        serviceTitanEstimateIds: estimateIds,
        matchedEstimateIds: [...matchedEstimateIds],
        unmatchedEstimateIds,
        matchedEstimateOpportunityCount:
          estimateOpportunityMatches.length,
      },

      performance: {
        durationMs: Date.now() - startedAt,
      },
    };

    return NextResponse.json(
      sanitize(response),
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("[Report Data Diagnostic]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Unable to fetch report data.",
        performance: {
          durationMs: Date.now() - startedAt,
        },
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
