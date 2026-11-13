
import { getRevenueJobs } from "@/lib/integrations/servicetitan";
import { getRevenueDateRanges } from "@/lib/date/date-utils";

// ============================================
// CONFIGURATION
// ============================================

const PAGE_SIZE = 500;
const PAGE_CONCURRENCY = 4;
const CACHE_TTL = 5 * 60 * 1000;

// ============================================
// SHARED YTD JOB CACHE
// ============================================

let ytdJobsCache = null;
let ytdJobsCacheExpiresAt = 0;
let ytdJobsFetchPromise = null;

// ============================================
// FETCH ALL YTD COMPLETED JOBS
// ============================================

async function fetchYtdCompletedJobs() {
  const { yearStart, nextYearStart } = getRevenueDateRanges();

  const jobFilters = {
    pageSize: PAGE_SIZE,
    jobStatus: "Completed",
    completedOnOrAfter: yearStart.toISOString(),
    completedBefore: nextYearStart.toISOString(),
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
        length: Math.min(
          PAGE_CONCURRENCY,
          totalPages - startPage + 1,
        ),
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
        throw new Error(
          "Unable to fetch ServiceTitan YTD jobs page.",
        );
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
    if (!job?.id) continue;

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
// GET SHARED CACHED YTD JOBS
// ============================================

export async function getCachedYtdRevenueJobs() {
  const now = Date.now();

  // Return valid cached data.
  if (ytdJobsCache && now < ytdJobsCacheExpiresAt) {
    return ytdJobsCache;
  }

  // Reuse an ongoing fetch.
  if (ytdJobsFetchPromise) {
    return ytdJobsFetchPromise;
  }

  ytdJobsFetchPromise = fetchYtdCompletedJobs();

  try {
    const jobs = await ytdJobsFetchPromise;

    ytdJobsCache = jobs;
    ytdJobsCacheExpiresAt = Date.now() + CACHE_TTL;

    return jobs;
  } catch (error) {
    ytdJobsCache = null;
    ytdJobsCacheExpiresAt = 0;

    throw error;
  } finally {
    ytdJobsFetchPromise = null;
  }
}
