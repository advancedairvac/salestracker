
"use client";

import { cacheManager } from "./cache-manager";

const CACHE_KEY = "estimates:all";
const REFRESH_INTERVAL = 13 * 60 * 1000;

const GLOBAL_KEY = "__ADVANCED_SALES_ESTIMATES_CACHE_STATE__";

// ============================================
// GLOBAL STATE
// ============================================

function getState() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window[GLOBAL_KEY]) {
    window[GLOBAL_KEY] = {
      initialized: false,
      syncPromise: null,
      timer: null,
      visibilityHandler: null,
      status: "idle",
      lastError: null,
      statusListeners: new Set(),
      generation: 0,
    };
  }

  return window[GLOBAL_KEY];
}

// ============================================
// CACHE STATUS
// ============================================

function setStatus(status, error = null) {
  const state = getState();

  if (!state) return;

  state.status = status;
  state.lastError = error;

  state.statusListeners.forEach((callback) => {
    try {
      callback({
        status,
        error,
      });
    } catch (callbackError) {
      console.error("Estimates cache status listener error:", callbackError);
    }
  });
}

export function getEstimatesCacheStatus() {
  const state = getState();

  return {
    status: state?.status || "idle",
    error: state?.lastError || null,
  };
}

export function subscribeToEstimatesCacheStatus(callback) {
  const state = getState();

  if (!state) {
    return () => {};
  }

  state.statusListeners.add(callback);

  return () => {
    state.statusListeners.delete(callback);
  };
}

// ============================================
// FETCH ESTIMATES
// ============================================

async function fetchEstimates() {
  const startedAt = performance.now();

  try {
    const response = await fetch(
      "/api/servicetitan/estimates?sync=all",
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Estimates synchronization failed.",
      );
    }

    const estimates = Array.isArray(result.estimates)
      ? result.estimates
      : [];

    return {
      estimates,
      syncedAt: result.syncedAt || Date.now(),
      syncDurationMs: Math.round(performance.now() - startedAt),
      totalCount: estimates.length,
    };
  } catch (error) {
    throw new Error(
      error.message || "Estimates synchronization failed.",
    );
  }
}

// ============================================
// GET ESTIMATES CACHE
// ============================================

export async function getEstimatesCache() {
  const entry = await cacheManager.get(CACHE_KEY);

  return entry?.value || null;
}

// ============================================
// CACHE METADATA
// ============================================

export async function getEstimatesCacheMetadata() {
  const entry = await cacheManager.get(CACHE_KEY);

  if (!entry) {
    return null;
  }

  const cache = entry.value;

  return {
    updatedAt: entry.updatedAt || null,
    syncedAt: cache?.syncedAt || null,
    syncDurationMs: cache?.syncDurationMs ?? null,
    totalCount: Array.isArray(cache?.estimates)
      ? cache.estimates.length
      : 0,
    storage: "IndexedDB",
  };
}

// ============================================
// SYNC ESTIMATES
// ============================================

export function syncEstimates(forceRefresh = false) {
  const state = getState();

  if (!state) {
    return Promise.resolve(null);
  }

  if (!forceRefresh && state.syncPromise) {
    return state.syncPromise;
  }

  const generation = ++state.generation;

  setStatus("refreshing");

  const syncPromise = (
    forceRefresh
      ? cacheManager.refresh(CACHE_KEY, fetchEstimates)
      : cacheManager.request(CACHE_KEY, fetchEstimates)
  )
    .then((data) => {
      if (state.generation !== generation) {
        return data;
      }

      setStatus("available");

      return data;
    })
    .catch((error) => {
      if (state.generation === generation) {
        setStatus("error", error.message || "Estimates sync failed.");
      }

      console.error("Estimates synchronization failed:", error);

      throw error;
    })
    .finally(() => {
      if (state.syncPromise === syncPromise) {
        state.syncPromise = null;
      }
    });

  state.syncPromise = syncPromise;

  return syncPromise;
}

// ============================================
// BACKGROUND REFRESH
// ============================================

export function refreshEstimatesInBackground() {
  return syncEstimates(false);
}

function refreshIfNeeded() {
  cacheManager
    .get(CACHE_KEY)
    .then((entry) => {
      const cacheAge = Date.now() - (entry?.updatedAt || 0);

      if (!entry || cacheAge >= REFRESH_INTERVAL) {
        syncEstimates(false).catch(() => {
          // Preserve the previous cache if refresh fails.
        });
      }
    })
    .catch((error) => {
      console.error("Estimates cache age check failed:", error);
    });
}

// ============================================
// INITIALIZE ESTIMATES CACHE
// ============================================

export function initializeEstimatesCache() {
  const state = getState();

  if (!state || state.initialized) {
    return;
  }

  state.initialized = true;

  // Initial cache check.
  (async () => {
    try {
      const entry = await cacheManager.get(CACHE_KEY);

      if (!entry) {
        syncEstimates(false).catch(() => {});
        return;
      }

      // Existing cache is immediately available.
      setStatus("available");

      const cacheAge = Date.now() - (entry.updatedAt || 0);

      if (cacheAge >= REFRESH_INTERVAL) {
        syncEstimates(false).catch(() => {});
      }
    } catch (error) {
      console.error("Estimates cache initialization failed:", error);

      setStatus(
        "error",
        error.message || "Estimates cache initialization failed.",
      );
    }
  })();

  // Periodic refresh.
  state.timer = window.setInterval(() => {
    refreshIfNeeded();
  }, REFRESH_INTERVAL);

  // Refresh when the user returns to the app.
  state.visibilityHandler = () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    refreshIfNeeded();
  };

  document.addEventListener(
    "visibilitychange",
    state.visibilityHandler,
  );
}

// ============================================
// RESET ESTIMATES CACHE
// ============================================

export async function resetEstimatesCache() {
  const state = getState();

  if (!state) {
    return false;
  }

  try {
    await syncEstimates(true);

    return true;
  } catch (error) {
    setStatus(
      "error",
      error.message || "Estimates refresh failed.",
    );

    console.error("Estimates cache refresh failed:", error);

    return false;
  }
}

// ============================================
// LOGOUT CLEANUP
// ============================================

export async function clearEstimatesCacheOnLogout() {
  const state = getState();

  if (state) {
    // Stop periodic refresh.
    if (state.timer) {
      window.clearInterval(state.timer);
      state.timer = null;
    }

    // Remove visibility listener.
    if (state.visibilityHandler) {
      document.removeEventListener(
        "visibilitychange",
        state.visibilityHandler,
      );

      state.visibilityHandler = null;
    }

    state.generation += 1;
    state.initialized = false;
    state.syncPromise = null;

    setStatus("idle");
  }

  return cacheManager.remove(CACHE_KEY);
}

// ============================================
// LOCAL ESTIMATE FILTERING
// ============================================

function getEstimateDate(estimate) {
  const date =
    estimate?.createdOn ||
    estimate?.createdAt ||
    estimate?.creationDate ||
    estimate?.date;

  if (!date) {
    return null;
  }

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEstimateValue(estimate) {
  const subtotal = Number(
    estimate?.subtotal ??
      estimate?.subTotal ??
      estimate?.total ??
      estimate?.amount ??
      0,
  );

  const tax = Number(estimate?.tax ?? estimate?.salesTax ?? 0);

  return subtotal + tax;
}

export function filterCachedEstimates(
  estimates,
  start,
  endExclusive,
) {
  if (!Array.isArray(estimates)) {
    return [];
  }

  const startDate = start ? new Date(start) : null;
  const endDate = endExclusive ? new Date(endExclusive) : null;

  return estimates.filter((estimate) => {
    const estimateDate = getEstimateDate(estimate);

    if (!estimateDate) {
      return false;
    }

    if (startDate && estimateDate < startDate) {
      return false;
    }

    if (endDate && estimateDate >= endDate) {
      return false;
    }

    return true;
  });
}

// ============================================
// ESTIMATE SUMMARY
// ============================================

export function getCachedEstimateSummary(
  estimatesCache,
  start,
  endExclusive,
) {
  const estimates = Array.isArray(estimatesCache?.estimates)
    ? estimatesCache.estimates
    : [];

  const filteredEstimates = filterCachedEstimates(
    estimates,
    start,
    endExclusive,
  );

  const totalValue = filteredEstimates.reduce(
    (sum, estimate) => sum + getEstimateValue(estimate),
    0,
  );

  return {
    totalCount: filteredEstimates.length,
    totalValue,
    estimates: filteredEstimates,
  };
}

// ============================================
// LOCAL ESTIMATE ACCESS
// ============================================

export function getCachedEstimates(estimatesCache) {
  return Array.isArray(estimatesCache?.estimates)
    ? estimatesCache.estimates
    : [];
}

// ============================================
// CACHE SUBSCRIPTION
// ============================================

export function subscribeToEstimatesCache(callback) {
  return cacheManager.subscribe(CACHE_KEY, callback);
}
