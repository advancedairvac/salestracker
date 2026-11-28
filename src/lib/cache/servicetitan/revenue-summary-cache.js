import { cacheManager } from "./cache-manager";

const CACHE_KEY_PREFIX = "dashboard:revenue-summary:";
const requests = new Map();
let cacheGeneration = 0;

function getCacheKey(year) {
  return `${CACHE_KEY_PREFIX}${year}`;
}

export function getRevenueSummaryCache(year) {
  return cacheManager.get(getCacheKey(year));
}

export function subscribeToRevenueSummaryCache(year, callback) {
  return cacheManager.subscribe(getCacheKey(year), callback);
}

export function clearRevenueSummaryCacheOnLogout() {
  cacheGeneration += 1;
  return cacheManager.remove(getCacheKey(new Date().getFullYear()));
}

export function refreshRevenueSummary(year) {
  if (requests.has(year)) {
    return requests.get(year);
  }

  const generationAtStart = cacheGeneration;
  const request = (async () => {
    const response = await fetch("/api/dashboard/revenue-summary", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to refresh revenue summary.");
    }

    const summary = {
      year: result.year,
      todayRevenue: result.todayRevenue,
      monthRevenue: result.monthRevenue,
      yearRevenue: result.yearRevenue,
      refreshedAt: result.refreshedAt,
    };

    if (cacheGeneration === generationAtStart) {
      await cacheManager.set(getCacheKey(year), summary);
    }

    return summary;
  })().finally(() => {
    requests.delete(year);
  });

  requests.set(year, request);

  return request;
}
