import { getEstimates } from "@/lib/integrations/servicetitan";

const PAGE_SIZE = 500;
const PAGE_CONCURRENCY = 4;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_STALE_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 8;
const estimatesCache = new Map();

function validateDateRange({ start, endExclusive }) {
  if (
    !(start instanceof Date) ||
    !(endExclusive instanceof Date) ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(endExclusive.getTime()) ||
    start >= endExclusive
  ) {
    throw new Error("Invalid Dashboard Estimate date range.");
  }
}

function validateEstimateResponse(response, page) {
  if (!response || !Array.isArray(response.data)) {
    throw new Error(`Invalid ServiceTitan Estimates response on page ${page}`);
  }

  return response.data;
}

async function fetchEstimatesInRange({ start, endExclusive }) {
  const startedAt = performance.now();
  const filters = {
    createdOnOrAfter: start.toISOString(),
    createdBefore: endExclusive.toISOString(),
  };

  const firstResponse = await getEstimates({
    page: 1,
    pageSize: PAGE_SIZE,
    includeTotal: true,
    ...filters,
  });
  const firstPageData = validateEstimateResponse(firstResponse, 1);
  const totalCount = Number(firstResponse.totalCount);

  if (!Number.isFinite(totalCount) || totalCount < firstPageData.length) {
    throw new Error("Invalid Estimates totalCount from ServiceTitan.");
  }

  const estimates = [...firstPageData];
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  for (
    let batchStart = 2;
    batchStart <= totalPages;
    batchStart += PAGE_CONCURRENCY
  ) {
    const batchEnd = Math.min(batchStart + PAGE_CONCURRENCY - 1, totalPages);
    const pageNumbers = Array.from(
      { length: batchEnd - batchStart + 1 },
      (_, index) => batchStart + index,
    );
    const responses = await Promise.all(
      pageNumbers.map((page) =>
        getEstimates({
          page,
          pageSize: PAGE_SIZE,
          includeTotal: false,
          ...filters,
        }),
      ),
    );

    responses.forEach((response, index) => {
      estimates.push(...validateEstimateResponse(response, pageNumbers[index]));
    });
  }

  if (estimates.length !== totalCount) {
    throw new Error(
      `Estimates count mismatch. Expected ${totalCount}, fetched ${estimates.length}.`,
    );
  }

  const uniqueEstimates = new Map();
  for (const estimate of estimates) {
    if (estimate?.id !== undefined && estimate?.id !== null) {
      uniqueEstimates.set(String(estimate.id), estimate);
    }
  }

  if (uniqueEstimates.size !== totalCount) {
    throw new Error(
      `Duplicate or missing ServiceTitan estimates detected. Expected ${totalCount}, received ${uniqueEstimates.size}.`,
    );
  }

  console.log(
    `[ServiceTitan Estimates] API data fetched: ${((performance.now() - startedAt) / 1000).toFixed(2)} sec`,
  );

  return [...uniqueEstimates.values()];
}

function startEstimatesRefresh(key, entry, dateRange) {
  if (entry.promise) return entry.promise;

  entry.expiresAt = Number.POSITIVE_INFINITY;
  entry.promise = fetchEstimatesInRange(dateRange)
    .then((estimates) => {
      entry.value = estimates;
      entry.rowCount = estimates.length;
      entry.updatedAt = Date.now();
      entry.expiresAt = entry.updatedAt + CACHE_TTL_MS;
      entry.promise = null;
      return estimates;
    })
    .catch((error) => {
      if (entry.value === undefined) {
        if (estimatesCache.get(key) === entry) estimatesCache.delete(key);
      } else {
        entry.expiresAt = Date.now() + 5000;
        entry.promise = null;
      }
      throw error;
    });

  estimatesCache.set(key, entry);
  while (estimatesCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = estimatesCache.keys().next().value;
    if (oldestKey === key) break;
    estimatesCache.delete(oldestKey);
  }

  return entry.promise;
}

export async function getDashboardEstimatesForRange({ start, endExclusive }) {
  validateDateRange({ start, endExclusive });

  const key = `${start.toISOString()}|${endExclusive.toISOString()}`;
  const now = Date.now();

  for (const [cachedKey, entry] of estimatesCache) {
    if (
      !entry.promise &&
      entry.updatedAt &&
      entry.updatedAt + MAX_STALE_MS <= now
    ) {
      estimatesCache.delete(cachedKey);
    }
  }

  const cached = estimatesCache.get(key);

  if (cached?.value !== undefined) {
    if (cached.expiresAt > now) return cached.value;

    if (!cached.promise) {
      startEstimatesRefresh(key, cached, { start, endExclusive }).catch(
        (error) => {
          console.error("Background ServiceTitan estimates refresh failed:", error);
        },
      );
    }

    return cached.value;
  }

  if (cached?.promise) return cached.promise;

  return startEstimatesRefresh(
    key,
    { value: undefined, promise: null, expiresAt: Number.POSITIVE_INFINITY },
    { start, endExclusive },
  );
}

export function clearDashboardEstimateSummaryCache() {
  const removedCount = estimatesCache.size;
  estimatesCache.clear();
  return { removedCount };
}

export async function getDashboardEstimateSummary({ start, endExclusive }) {
  const estimates = await getDashboardEstimatesForRange({ start, endExclusive });
  let totalValueInCents = 0;
  let totalCount = 0;

  for (const estimate of estimates) {
    if (String(estimate.status?.name || "").toLowerCase() !== "open") continue;

    const subtotal = Number(estimate.subtotal ?? 0);
    const tax = Number(estimate.tax ?? 0);

    if (!Number.isFinite(subtotal) || !Number.isFinite(tax)) {
      throw new Error(`Invalid Estimate amount. Estimate ID: ${estimate.id}`);
    }

    totalValueInCents += Math.round((subtotal + tax) * 100);
    totalCount += 1;
  }

  return {
    totalCount,
    totalValue: totalValueInCents / 100,
  };
}
