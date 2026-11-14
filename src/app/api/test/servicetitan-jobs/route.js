
import { NextResponse } from "next/server";

import { getJobs } from "@/lib/integrations/servicetitan";
import { getRevenueDateRanges } from "@/lib/date/date-utils";

export const dynamic = "force-dynamic";

// ============================================
// CONFIGURATION
// ============================================

const PAGE_SIZE = 500;
const PAGE_CONCURRENCY = 4;

// ============================================
// FETCH RAW YTD COMPLETED JOBS
// ============================================

async function fetchYtdRawJobs(yearStartISO, nextYearStartISO) {
  const filters = {
    pageSize: PAGE_SIZE,
    jobStatus: "Completed",
    completedOnOrAfter: yearStartISO,
    completedBefore: nextYearStartISO,
  };

  // Fetch first page.
  const firstPage = await getJobs({
    ...filters,
    page: 1,
    includeTotal: true,
  });

  if (!firstPage || !Array.isArray(firstPage.data)) {
    throw new Error("Unable to fetch ServiceTitan YTD jobs.");
  }

  const totalCount = Number(firstPage.totalCount);

  if (!Number.isFinite(totalCount) || totalCount < 0) {
    throw new Error("Invalid ServiceTitan jobs totalCount.");
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const jobs = [...firstPage.data];

  // Fetch remaining pages with controlled concurrency.
  for (
    let startPage = 2;
    startPage <= totalPages;
    startPage += PAGE_CONCURRENCY
  ) {
    const pageNumbers = Array.from(
      {
        length: Math.min(
          PAGE_CONCURRENCY,
          totalPages - startPage + 1,
        ),
      },
      (_, index) => startPage + index,
    );

    const pageResults = await Promise.all(
      pageNumbers.map((page) =>
        getJobs({
          ...filters,
          page,
          includeTotal: false,
        }),
      ),
    );

    for (const result of pageResults) {
      if (!result || !Array.isArray(result.data)) {
        throw new Error("Unable to fetch ServiceTitan jobs page.");
      }

      jobs.push(...result.data);
    }
  }

  // Verify the API returned the expected number of jobs.
  if (jobs.length !== totalCount) {
    throw new Error(
      `Incomplete ServiceTitan jobs data. Expected ${totalCount}, received ${jobs.length}.`,
    );
  }

  // Remove duplicate jobs.
  const uniqueJobs = [];
  const seenJobIds = new Set();

  for (const job of jobs) {
    if (job?.id === undefined || job?.id === null) {
      continue;
    }

    const jobId = String(job.id);

    if (seenJobIds.has(jobId)) {
      continue;
    }

    seenJobIds.add(jobId);
    uniqueJobs.push(job);
  }

  if (uniqueJobs.length !== totalCount) {
    throw new Error(
      `Duplicate or missing ServiceTitan jobs detected. Expected ${totalCount}, received ${uniqueJobs.length}.`,
    );
  }

  return uniqueJobs;
}

// ============================================
// ANALYZE JOB FIELDS
// ============================================

function analyzeJobFields(jobs) {
  const allFields = new Set();

  jobs.forEach((job) => {
    Object.keys(job || {}).forEach((key) => {
      allFields.add(key);
    });
  });

  const fieldTypes = {};

  for (const field of allFields) {
    const types = new Set();

    jobs.forEach((job) => {
      const value = job?.[field];

      if (value === null) {
        types.add("null");
      } else if (value === undefined) {
        types.add("undefined");
      } else if (Array.isArray(value)) {
        types.add("array");
      } else {
        types.add(typeof value);
      }
    });

    fieldTypes[field] = [...types];
  }

  const possibleUpdateFields = [...allFields].filter((field) =>
    /modified|updated|last.?update|change.?date/i.test(field),
  );

  return {
    uniqueFields: [...allFields],
    totalUniqueFields: allFields.size,
    fieldTypes,
    possibleUpdateFields,
  };
}

// ============================================
// GET API RESPONSE
// ============================================

export async function GET() {
  try {
    const { yearStart, nextYearStart } = getRevenueDateRanges();

    const startTime = performance.now();

    const jobs = await fetchYtdRawJobs(
      yearStart.toISOString(),
      nextYearStart.toISOString(),
    );

    const duration = (
      (performance.now() - startTime) /
      1000
    ).toFixed(2);

    const analysis = analyzeJobFields(jobs);

    return NextResponse.json({
      success: true,

      summary: {
        totalJobsLoaded: jobs.length,
        ...analysis,
        fetchDurationSeconds: Number(duration),
      },

      samples: jobs.slice(0, 5),

      firstJob: jobs[0] || null,

      lastJob: jobs[jobs.length - 1] || null,
    });
  } catch (error) {
    console.error("[ServiceTitan Raw Jobs Test]", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unable to fetch ServiceTitan jobs.",
      },
      {
        status: 500,
      },
    );
  }
}
