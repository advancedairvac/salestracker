
import { NextResponse } from "next/server";
import { getJobs } from "@/lib/integrations/servicetitan";

export const dynamic = "force-dynamic";

// ============================================
// HELPERS
// ============================================

function getJobDates(jobs = []) {
  return jobs.map((job) => ({
    id: job.id,
    jobNumber: job.jobNumber,
    jobStatus: job.jobStatus,
    completedOn: job.completedOn,
    total: job.total,
  }));
}

function checkDateRange(jobs, start, endExclusive) {
  return jobs.every((job) => {
    const date = new Date(job.completedOn);

    return (
      !Number.isNaN(date.getTime()) &&
      date >= start &&
      date < endExclusive
    );
  });
}

function checkDescendingOrder(jobs) {
  for (let i = 1; i < jobs.length; i += 1) {
    const previous = new Date(jobs[i - 1].completedOn).getTime();
    const current = new Date(jobs[i].completedOn).getTime();

    if (previous < current) {
      return false;
    }
  }

  return true;
}

// ============================================
// TEST API
// ============================================

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate") || "2026-11-01";
    const endDate = searchParams.get("endDate") || "2026-11-13";

    const start = new Date(`${startDate}T00:00:00`);
    const endExclusive = new Date(`${endDate}T00:00:00`);

    endExclusive.setDate(endExclusive.getDate() + 1);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(endExclusive.getTime()) ||
      start > endExclusive
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid date range." },
        { status: 400 },
      );
    }

    const commonParams = {
      page: 1,
      pageSize: 5,
      includeTotal: true,
      jobStatus: "Completed",
      completedOnOrAfter: startDate,
      completedBefore: endDate,
    };

    // ----------------------------------------
    // TEST 1: DATE FILTER
    // ----------------------------------------

    const dateFilterResult = await getJobs(commonParams);

    const dateFilterJobs = Array.isArray(dateFilterResult.data)
      ? dateFilterResult.data
      : [];

    // ----------------------------------------
    // TEST 2: DESCENDING SORT
    // ----------------------------------------

    let descendingResult = null;
    let descendingError = null;

    try {
      descendingResult = await getJobs({
        ...commonParams,
        sort: "-completedOn",
      });
    } catch (error) {
      descendingError = error.message;
    }

    const descendingJobs = Array.isArray(descendingResult?.data)
      ? descendingResult.data
      : [];

    // ----------------------------------------
    // TEST 3: ASCENDING SORT
    // ----------------------------------------

    let ascendingResult = null;
    let ascendingError = null;

    try {
      ascendingResult = await getJobs({
        ...commonParams,
        sort: "completedOn",
      });
    } catch (error) {
      ascendingError = error.message;
    }

    const ascendingJobs = Array.isArray(ascendingResult?.data)
      ? ascendingResult.data
      : [];

    // ----------------------------------------
    // RESPONSE
    // ----------------------------------------

    return NextResponse.json({
      success: true,
      environment: process.env.SERVICETITAN_ENV || "integration",

      requestedFilters: {
        jobStatus: "Completed",
        completedOnOrAfter: startDate,
        completedBefore: endDate,
        page: 1,
        pageSize: 5,
      },

      dateFilterTest: {
        totalCount: dateFilterResult.totalCount ?? null,
        returnedRecords: dateFilterJobs.length,
        hasMore: dateFilterResult.hasMore ?? null,
        allDatesWithinRange: checkDateRange(
          dateFilterJobs,
          start,
          endExclusive,
        ),
        jobs: getJobDates(dateFilterJobs),
      },

      descendingSortTest: {
        parameter: "sort=-completedOn",
        supported: !descendingError,
        error: descendingError,
        totalCount: descendingResult?.totalCount ?? null,
        isDescending: checkDescendingOrder(descendingJobs),
        jobs: getJobDates(descendingJobs),
      },

      ascendingSortTest: {
        parameter: "sort=completedOn",
        supported: !ascendingError,
        error: ascendingError,
        totalCount: ascendingResult?.totalCount ?? null,
        isAscending: ascendingJobs.every((job, index) => {
          if (index === 0) return true;

          return (
            new Date(ascendingJobs[index - 1].completedOn).getTime() <=
            new Date(job.completedOn).getTime()
          );
        }),
        jobs: getJobDates(ascendingJobs),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
