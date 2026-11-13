import { unstable_cache } from "next/cache";

import { getRevenueJobs } from "@/lib/integrations/servicetitan";
import { getRevenueDateRanges } from "@/lib/date/date-utils";

// ============================================
// CONFIGURATION
// ============================================

const PAGE_SIZE = 500;
const PAGE_CONCURRENCY = 4;

const JOBS_CACHE_DURATION = 300; // 5 minutes

// ============================================
// FETCH YTD COMPLETED JOBS
// ============================================

async function fetchYtdCompletedJobs(yearStartISO, nextYearStartISO) {
  const jobFilters = {
    pageSize: PAGE_SIZE,
    jobStatus: "Completed",
    completedOnOrAfter: yearStartISO,
    completedBefore: nextYearStartISO,
  };

  const firstPage = await getRevenueJobs({
    ...jobFilters,
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

  // ------------------------------------------
  // CONTROLLED PARALLEL PAGINATION
  // ------------------------------------------

  for (
    let startPage = 2;
    startPage <= totalPages;
    startPage += PAGE_CONCURRENCY
  ) {
    const pageNumbers = Array.from(
      {
        length: Math.min(PAGE_CONCURRENCY, totalPages - startPage + 1),
      },
      (_, index) => startPage + index,
    );

    const pageResults = await Promise.all(
      pageNumbers.map((page) =>
        getRevenueJobs({
          ...jobFilters,
          page,
          includeTotal: false,
        }),
      ),
    );

    for (const result of pageResults) {
      if (!result || !Array.isArray(result.data)) {
        throw new Error("Unable to fetch ServiceTitan YTD jobs page.");
      }

      jobs.push(...result.data);
    }
  }

  // ------------------------------------------
  // VERIFY COMPLETE DATA
  // ------------------------------------------

  if (jobs.length !== totalCount) {
    throw new Error(
      `Incomplete ServiceTitan YTD jobs data. Expected ${totalCount}, received ${jobs.length}.`,
    );
  }

  // ------------------------------------------
  // REMOVE DUPLICATE JOB IDS
  // ------------------------------------------

  const uniqueJobs = [];
  const seenJobIds = new Set();

  for (const job of jobs) {
    if (job?.id === undefined || job?.id === null) continue;

    const jobId = String(job.id);

    if (seenJobIds.has(jobId)) continue;

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
// PERSISTENT SERVICETITAN JOBS CACHE
//
// Cache duration: 5 minutes
// Cache key includes the year date boundaries.
// ============================================

const getPersistentYtdJobs = unstable_cache(
  async (yearStartISO, nextYearStartISO) => {
    const start = performance.now();

    const jobs = await fetchYtdCompletedJobs(yearStartISO, nextYearStartISO);

    const duration = (performance.now() - start) / 1000;

    console.log(
      `[ServiceTitan Jobs] Fresh API data fetched: ${duration.toFixed(2)} sec`,
    );

    return jobs;
  },
  ["servicetitan-ytd-completed-jobs-v1"],
  {
    revalidate: JOBS_CACHE_DURATION,
    tags: ["servicetitan-ytd-completed-jobs"],
  },
);

// ============================================
// GET YTD REVENUE JOBS
// ALWAYS FETCH FRESH DATA
// ============================================

export async function getYtdRevenueJobs() {
  const { yearStart, nextYearStart } = getRevenueDateRanges();

  return fetchYtdCompletedJobs(
    yearStart.toISOString(),
    nextYearStart.toISOString(),
  );
}

// ============================================
// GET CACHED YTD REVENUE JOBS
//
// Persistent cache across server requests.
// Revalidates after 5 minutes.
// ============================================

export async function getCachedYtdRevenueJobs() {
  const { yearStart, nextYearStart } = getRevenueDateRanges();

  return getPersistentYtdJobs(
    yearStart.toISOString(),
    nextYearStart.toISOString(),
  );
}
