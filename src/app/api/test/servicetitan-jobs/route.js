
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
// FETCH YTD COMPLETED JOBS
// ============================================

async function fetchYtdJobs(yearStartISO, nextYearStartISO) {
  const filters = {
    pageSize: PAGE_SIZE,
    jobStatus: "Completed",
    completedOnOrAfter: yearStartISO,
    completedBefore: nextYearStartISO,
  };

  // Fetch first page
  const firstPage = await getJobs({
    ...filters,
    page: 1,
    includeTotal: true,
  });

  if (!firstPage || !Array.isArray(firstPage.data)) {
    throw new Error("Unable to fetch ServiceTitan jobs.");
  }

  const totalCount = Number(firstPage.totalCount);

  if (!Number.isFinite(totalCount) || totalCount < 0) {
    throw new Error("Invalid ServiceTitan totalCount.");
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const jobs = [...firstPage.data];

  // ============================================
  // FETCH REMAINING PAGES
  // ============================================

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

  // ============================================
  // REMOVE DUPLICATES
  // ============================================

  const uniqueJobs = [];
  const seenJobIds = new Set();

  for (const job of jobs) {
    if (job?.id == null) continue;

    const jobId = String(job.id);

    if (seenJobIds.has(jobId)) continue;

    seenJobIds.add(jobId);
    uniqueJobs.push(job);
  }

  return {
    jobs: uniqueJobs,
    totalCount,
    totalPages,
    fetchedCount: jobs.length,
    uniqueCount: uniqueJobs.length,
  };
}

// ============================================
// ANALYZE JOB FIELDS
// ============================================

function analyzeJobFields(jobs) {
  const fields = new Set();

  for (const job of jobs) {
    Object.keys(job || {}).forEach((key) => fields.add(key));
  }

  const fieldTypes = {};

  for (const field of fields) {
    const types = new Set();

    for (const job of jobs) {
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
    }

    fieldTypes[field] = [...types];
  }

  const possibleUpdateFields = [...fields].filter((field) =>
    /modified|updated|last.?update|change.?date/i.test(field),
  );

  return {
    uniqueFields: [...fields],
    totalUniqueFields: fields.size,
    fieldTypes,
    possibleUpdateFields,
  };
}

// ============================================
// ANALYZE TAG DATA
// ============================================

function analyzeTags(jobs) {
  const tagIds = new Map();

  for (const job of jobs) {
    const tags = job?.tagTypeIds;

    if (!Array.isArray(tags)) continue;

    for (const tagId of tags) {
      const id = String(tagId);

      tagIds.set(id, (tagIds.get(id) || 0) + 1);
    }
  }

  return {
    jobsWithTagTypeIds: jobs.filter(
      (job) => Array.isArray(job?.tagTypeIds),
    ).length,

    jobsWithoutTagTypeIds: jobs.filter(
      (job) => !Array.isArray(job?.tagTypeIds),
    ).length,

    uniqueTagTypeIds: [...tagIds.entries()].map(([id, count]) => ({
      tagTypeId: id,
      jobCount: count,
    })),
  };
}

// ============================================
// GET API
// ============================================

export async function GET() {
  try {
    const startTime = performance.now();

    const { yearStart, nextYearStart } = getRevenueDateRanges();

    const result = await fetchYtdJobs(
      yearStart.toISOString(),
      nextYearStart.toISOString(),
    );

    const jobs = result.jobs;

    const analysis = analyzeJobFields(jobs);
    const tagAnalysis = analyzeTags(jobs);

    const duration = Number(
      ((performance.now() - startTime) / 1000).toFixed(2),
    );

    return NextResponse.json({
      success: true,

      environment: process.env.SERVICETITAN_ENV || "integration",

      dateRange: {
        yearStart: yearStart.toISOString(),
        nextYearStart: nextYearStart.toISOString(),
      },

      summary: {
        totalCountFromApi: result.totalCount,
        totalPages: result.totalPages,
        fetchedCount: result.fetchedCount,
        uniqueJobsCount: result.uniqueCount,
        fetchDurationSeconds: duration,
        ...analysis,
        ...tagAnalysis,
      },

      samples: jobs.slice(0, 5),

      firstJob: jobs[0] || null,

      lastJob: jobs[jobs.length - 1] || null,

      // Full raw data for testing
      jobs,
    });
  } catch (error) {
    console.error("[ServiceTitan Test API]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          "Unable to fetch ServiceTitan jobs.",
      },
      { status: 500 },
    );
  }
}
