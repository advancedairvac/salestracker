import { getRevenueJobs } from "@/lib/integrations/servicetitan";
import { getRevenueDateRanges } from "@/lib/date/date-utils";

// ============================================
// CONFIGURATION
// ============================================

const PAGE_SIZE = 500;
const PAGE_CONCURRENCY = 4;
const CACHE_TTL_MS = 60 * 1000;
const MAX_STALE_MS = 5 * 60 * 1000;
const revenueJobsCache = new Map();

export function clearRevenueJobsCache() {
  const removedCount = revenueJobsCache.size;
  revenueJobsCache.clear();
  return { removedCount };
}

// ============================================
// FETCH YTD COMPLETED JOBS
// ============================================

async function fetchCompletedJobsInRange(startISO, endExclusiveISO) {
  const startedAt = performance.now();

  const jobFilters = {
    pageSize: PAGE_SIZE,
    jobStatus: "Completed",
    completedOnOrAfter: startISO,
    completedBefore: endExclusiveISO,
  };

  const firstPage = await getRevenueJobs({
    ...jobFilters,
    page: 1,
    includeTotal: true,
  });

  if (!firstPage || !Array.isArray(firstPage.data)) {
    throw new Error("Unable to fetch ServiceTitan completed jobs.");
  }

  const totalCount = Number(firstPage.totalCount);

  if (!Number.isFinite(totalCount) || totalCount < 0) {
    throw new Error("Invalid ServiceTitan jobs totalCount.");
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (totalPages > 1000) {
    throw new Error("ServiceTitan revenue pagination limit exceeded.");
  }

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

  const duration = (performance.now() - startedAt) / 1000;

  console.log(
    `[ServiceTitan Jobs] API data fetched: ${duration.toFixed(2)} sec`,
  );

  return uniqueJobs;
}

// ============================================
// GET COMPLETED REVENUE JOBS FOR A DATE RANGE
// Share in-flight and recent identical requests across dashboard and revenue
// page sections so a summary and its table do not fetch the same pages twice.
// ============================================

export async function getRevenueJobsForRange({
  start,
  endExclusive,
  waitForFresh = false,
} = {}) {
  if (
    !(start instanceof Date) ||
    !(endExclusive instanceof Date) ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(endExclusive.getTime()) ||
    start >= endExclusive
  ) {
    throw new Error("A valid ServiceTitan revenue date range is required.");
  }

  const startISO = start.toISOString();
  const endExclusiveISO = endExclusive.toISOString();
  const key = `${startISO}|${endExclusiveISO}`;
  const now = Date.now();

  for (const [cachedKey, entry] of revenueJobsCache) {
    if (
      !entry.promise &&
      (entry.value === undefined ||
        (entry.updatedAt && entry.updatedAt + MAX_STALE_MS <= now))
    ) {
      revenueJobsCache.delete(cachedKey);
    }
  }

  const cached = revenueJobsCache.get(key);

  if (cached?.value !== undefined) {
    if (cached.expiresAt > now) return Promise.resolve(cached.value);

    let refreshPromise = cached.promise;

    if (!cached.promise) {
      refreshPromise = startRevenueJobsRefresh(
        key,
        cached,
        startISO,
        endExclusiveISO,
      );

      refreshPromise.catch(
        (error) => {
          console.error("Background ServiceTitan jobs refresh failed:", error);
        },
      );
    }

    if (waitForFresh) return refreshPromise;
    return Promise.resolve(cached.value);
  }

  if (cached?.promise) return cached.promise;

  const cacheEntry = {
    value: undefined,
    promise: null,
    expiresAt: Number.POSITIVE_INFINITY,
  };
  return startRevenueJobsRefresh(key, cacheEntry, startISO, endExclusiveISO);
}

function startRevenueJobsRefresh(key, cacheEntry, startISO, endExclusiveISO) {
  if (cacheEntry.promise) return cacheEntry.promise;

  const startedAt = performance.now();
  const promise = fetchCompletedJobsInRange(startISO, endExclusiveISO)
    .then((jobs) => {
      cacheEntry.value = jobs;
      cacheEntry.updatedAt = Date.now();
      cacheEntry.rowCount = jobs.length;
      cacheEntry.syncDurationMs = Math.round(performance.now() - startedAt);
      cacheEntry.expiresAt = Date.now() + CACHE_TTL_MS;
      cacheEntry.promise = null;
      return jobs;
    })
    .catch((error) => {
      if (cacheEntry.value !== undefined) {
        cacheEntry.expiresAt = Date.now() + 5000;
        cacheEntry.promise = null;
      } else if (revenueJobsCache.get(key) === cacheEntry) {
        revenueJobsCache.delete(key);
      }

      throw error;
    });

  cacheEntry.promise = promise;
  revenueJobsCache.set(key, cacheEntry);
  return promise;
}

export function getRevenueJobsCacheMetadata() {
  const now = Date.now();
  const entries = [...revenueJobsCache.values()].filter(
    (entry) => entry.expiresAt > now || entry.promise,
  );

  const latestEntry = entries.reduce(
    (latest, entry) =>
      !latest || (entry.updatedAt || 0) > (latest.updatedAt || 0)
        ? entry
        : latest,
    null,
  );

  return {
    status: entries.some((entry) => entry.promise)
      ? "refreshing"
      : entries.length
        ? "available"
        : "idle",
    updatedAt: entries.reduce(
      (latest, entry) => Math.max(latest, entry.updatedAt || 0),
      0,
    ) || null,
    totalCount: entries.reduce((total, entry) => total + (entry.rowCount || 0), 0),
    queryCount: entries.length,
    storage: "Server memory",
    syncDurationMs: latestEntry?.syncDurationMs ?? null,
  };
}

export async function getYtdRevenueJobs({ waitForFresh = false } = {}) {
  const { yearStart, nextYearStart } = getRevenueDateRanges();

  return getRevenueJobsForRange({
    start: yearStart,
    endExclusive: nextYearStart,
    waitForFresh,
  });
}
