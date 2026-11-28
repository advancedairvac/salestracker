"use client";

import { cacheManager } from "./cache-manager";
import { resetServiceTitanCache } from "@/lib/cache/admin-cache-client";

const CACHE_KEY = "customers:all";
export const CUSTOMER_CACHE_TTL_MS = 13 * 60 * 1000;

const GLOBAL_KEY = "__ADVANCED_SALES_CUSTOMER_CACHE_STATE__";

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

  state.statusListeners?.forEach((callback) => {
    try {
      callback({
        status,
        error,
      });
    } catch (callbackError) {
      console.error("Customer cache status listener error:", callbackError);
    }
  });
}

export function getCustomerCacheStatus() {
  const state = getState();

  return {
    status: state?.status || "idle",
    error: state?.lastError || null,
  };
}

export function subscribeToCustomerCacheStatus(callback) {
  const state = getState();

  if (!state) return () => {};

  state.statusListeners.add(callback);

  return () => {
    state.statusListeners.delete(callback);
  };
}

// ============================================
// FETCH CUSTOMERS
// ============================================

async function fetchCustomers() {
  const startedAt = performance.now();

  setStatus("refreshing");

  try {
    const response = await fetch("/api/servicetitan/customers?sync=all", {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Customer synchronization failed.");
    }

    const syncDurationMs = Math.round(performance.now() - startedAt);

    return {
      customers: Array.isArray(result.customers) ? result.customers : [],
      syncedAt: result.syncedAt || Date.now(),
      syncDurationMs,
    };
  } catch (error) {
    setStatus("error", error.message || "Customer sync failed.");

    throw error;
  }
}

// ============================================
// GET CUSTOMER CACHE
// ============================================

export async function getCustomersCache() {
  const entry = await cacheManager.get(CACHE_KEY);

  return entry?.value || null;
}

// ============================================
// CACHE METADATA
// ============================================

export async function getCustomerCacheMetadata() {
  const entry = await cacheManager.get(CACHE_KEY);

  if (!entry) {
    return null;
  }

  const cache = entry.value;

  return {
    updatedAt: entry.updatedAt || null,
    syncedAt: cache?.syncedAt || null,
    syncDurationMs: cache?.syncDurationMs ?? null,
    totalCount: Array.isArray(cache?.customers) ? cache.customers.length : 0,
    storage: "IndexedDB",
  };
}

// ============================================
// SYNC CUSTOMERS
// ============================================

export function syncCustomers(forceRefresh = false) {
  const state = getState();

  if (!state) {
    return Promise.resolve(null);
  }

  if (state.syncPromise) {
    return state.syncPromise;
  }

  setStatus("refreshing");

  const syncPromise = (
    forceRefresh
      ? cacheManager.refresh(CACHE_KEY, fetchCustomers)
      : cacheManager.request(CACHE_KEY, fetchCustomers)
  )
    .then((data) => {
      setStatus("available");

      return data;
    })
    .catch((error) => {
      setStatus("error", error.message || "Customer sync failed.");

      console.error("Customer synchronization failed:", error);

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

export function refreshCustomersInBackground() {
  return syncCustomers();
}

function refreshIfNeeded() {
  cacheManager
    .get(CACHE_KEY)
    .then((entry) => {
      const cacheAge = Date.now() - (entry?.updatedAt || 0);

      if (!entry || cacheAge >= CUSTOMER_CACHE_TTL_MS) {
        syncCustomers().catch(() => {
          // Preserve the previous cache if refresh fails.
        });
      }
    })
    .catch((error) => {
      console.error("Customer cache age check failed:", error);
    });
}

// ============================================
// INITIALIZE CUSTOMER CACHE
// ============================================

export function initializeCustomerCache() {
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
        // Initial sync only when cache does not exist.
        syncCustomers().catch(() => {});
        return;
      }

      // Existing cache stays immediately available.
      setStatus("available");

      const cacheAge = Date.now() - (entry.updatedAt || 0);

      // Refresh in background if expired.
      if (cacheAge >= CUSTOMER_CACHE_TTL_MS) {
        syncCustomers().catch(() => {});
      }
    } catch (error) {
      console.error("Customer cache initialization failed:", error);
      setStatus("error", error.message);
    }
  })();

  // Periodic background refresh.
  state.timer = window.setInterval(() => {
    refreshIfNeeded();
  }, CUSTOMER_CACHE_TTL_MS);

  // Refresh when user returns to the app.
  state.visibilityHandler = () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    refreshIfNeeded();
  };

  document.addEventListener("visibilitychange", state.visibilityHandler);
}

// ============================================
// RESET CUSTOMER CACHE
// ============================================

export async function resetCustomerCache() {
  const state = getState();

  if (!state) {
    return false;
  }

  // Do NOT delete the existing cache.
  // Existing customers remain searchable during refresh.
  try {
    await resetServiceTitanCache("customers");
    await syncCustomers(true);

    return true;
  } catch (error) {
    // Old cache remains intact if API request fails.
    setStatus("error", error.message || "Customer refresh failed.");

    console.error("Customer cache refresh failed:", error);

    return false;
  }
}

// ============================================
// LOGOUT CLEANUP
// ============================================

export async function clearCustomerCacheOnLogout() {
  const state = getState();

  if (state) {
    // Stop periodic refresh.
    if (state.timer) {
      window.clearInterval(state.timer);
      state.timer = null;
    }

    // Remove visibility listener.
    if (state.visibilityHandler) {
      document.removeEventListener("visibilitychange", state.visibilityHandler);

      state.visibilityHandler = null;
    }

    state.initialized = false;
    state.syncPromise = null;

    setStatus("idle");
  }

  // Logout still removes customer cache.
  return cacheManager.remove(CACHE_KEY);
}

// ============================================
// LOCAL CUSTOMER SEARCH
// ============================================

export function searchCustomers(customers, search, page = 1, pageSize = 50) {
  const term = String(search || "")
    .trim()
    .toLowerCase();

  if (term.length < 2 || !Array.isArray(customers)) {
    return {
      customers: [],
      totalCount: 0,
      hasMore: false,
    };
  }

  const filtered = customers.filter((customer) => {
    const fields = [
      customer.pocName,
      customer.businessName,
      customer.phone,
      customer.email,
      customer.location,
    ];

    return fields.some((field) =>
      String(field || "")
        .toLowerCase()
        .includes(term),
    );
  });

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;

  return {
    customers: filtered.slice(start, start + safePageSize),
    totalCount: filtered.length,
    hasMore: start + safePageSize < filtered.length,
  };
}

// ============================================
// CACHE SUBSCRIPTION
// ============================================

export function subscribeToCustomerCache(callback) {
  return cacheManager.subscribe(CACHE_KEY, callback);
}
