import { getEstimates } from "@/lib/integrations/servicetitan";

const PAGE_SIZE = 500;
const PAGE_CONCURRENCY = 4;

function measureTime(label, startTime) {
  const durationSeconds = ((performance.now() - startTime) / 1000).toFixed(2);

  console.log(`[Dashboard Estimates] ${label}: ${durationSeconds}s`);
}

function validateEstimateResponse(response, page) {
  if (!response || !Array.isArray(response.data)) {
    throw new Error(`Invalid ServiceTitan Estimates response on page ${page}`);
  }

  return response.data;
}

/**
 * Fetches only the summary required by the Dashboard.
 *
 * Value = subtotal + tax
 * Date field = createdOn
 */
export async function getDashboardEstimateSummary({ start, endExclusive }) {
  if (
    !(start instanceof Date) ||
    !(endExclusive instanceof Date) ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(endExclusive.getTime()) ||
    start >= endExclusive
  ) {
    throw new Error("Invalid Dashboard Estimate date range.");
  }

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

  if (!Number.isFinite(totalCount) || totalCount < 0) {
    throw new Error("Invalid Estimates totalCount from ServiceTitan.");
  }

  if (firstPageData.length > totalCount) {
    throw new Error("Estimates response count exceeds totalCount.");
  }

  // Store currency as integer cents to avoid floating-point errors.
  let totalValueInCents = 0;
  let fetchedCount = 0;

  function addPageToSummary(estimates) {
    for (const estimate of estimates) {
      const subtotal = Number(estimate.subtotal ?? 0);
      const tax = Number(estimate.tax ?? 0);

      if (!Number.isFinite(subtotal) || !Number.isFinite(tax)) {
        throw new Error(`Invalid Estimate amount. Estimate ID: ${estimate.id}`);
      }

      totalValueInCents += Math.round((subtotal + tax) * 100);
      fetchedCount += 1;
    }
  }

  addPageToSummary(firstPageData);

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
      const page = pageNumbers[index];
      const estimates = validateEstimateResponse(response, page);

      addPageToSummary(estimates);
    });
  }

  if (fetchedCount !== totalCount) {
    throw new Error(
      `Estimates count mismatch. Expected ${totalCount}, fetched ${fetchedCount}.`,
    );
  }

  measureTime("Summary fetched", startedAt);

  return {
    totalCount,
    totalValue: totalValueInCents / 100,
  };
}
