// Date-filtered dashboard reads are reused across requests. Writes still clear
// this cache, so a short one-minute TTL reduces repeat reads without delaying
// updates made inside the application.
const CACHE_TTL_MS = 60 * 1000;
const MAX_CACHE_ENTRIES = 1200;
const GLOBAL_KEY = "__ADVANCED_SALES_TRACKER_DATABASE_CACHE__";

function getState() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = {
      entries: new Map(),
      hits: 0,
      misses: 0,
      lastDurationMs: null,
    };
  }

  return globalThis[GLOBAL_KEY];
}

export function stableSerialize(value) {
  if (value instanceof Date) return `date:${value.toISOString()}`;
  if (typeof value === "bigint") return `bigint:${value.toString()}`;
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`;
}

function countRows(value) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value?._count === "number") return value._count;
  if (typeof value?._count?._all === "number") return value._count._all;
  return value === null || value === undefined ? 0 : 1;
}

function startLoad(state, key, loader, entry = null) {
  const target = entry || {
    value: undefined,
    updatedAt: null,
    expiresAt: Number.POSITIVE_INFINITY,
    promise: null,
    rowCount: 0,
  };

  target.expiresAt = Number.POSITIVE_INFINITY;
  const startedAt = performance.now();

  target.promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      target.value = value;
      target.updatedAt = Date.now();
      target.expiresAt = target.updatedAt + CACHE_TTL_MS;
      target.rowCount = countRows(value);
      target.promise = null;
      state.lastDurationMs = Math.round(performance.now() - startedAt);

      return value;
    })
    .catch((error) => {
      if (target.value === undefined) {
        if (state.entries.get(key) === target) state.entries.delete(key);
      } else {
        // Keep the last complete value and retry after a short backoff.
        target.expiresAt = Date.now() + 5 * 1000;
        target.promise = null;
      }

      throw error;
    });

  state.entries.set(key, target);

  while (state.entries.size > MAX_CACHE_ENTRIES) {
    const oldestKey = state.entries.keys().next().value;
    if (oldestKey === key) break;
    state.entries.delete(oldestKey);
  }

  return target.promise;
}

export function getCachedDatabaseRead({ key, loader, bypass = false }) {
  if (bypass) return loader();

  const state = getState();
  const now = Date.now();
  const entry = state.entries.get(key);

  if (!entry) {
    state.misses += 1;
    return startLoad(state, key, loader);
  }

  if (entry.expiresAt > now) {
    state.entries.delete(key);
    state.entries.set(key, entry);

    if (entry.promise) {
      state.hits += 1;
      return entry.promise;
    }

    state.hits += 1;
    return Promise.resolve(entry.value);
  }

  // Serve the last complete result while a fresh copy loads in the background.
  if (entry.value !== undefined) {
    state.hits += 1;

    if (!entry.promise) {
      startLoad(state, key, loader, entry).catch((error) => {
        console.error("Background PostgreSQL cache refresh failed:", error);
      });
    }

    return Promise.resolve(entry.value);
  }

  state.misses += 1;
  return startLoad(state, key, loader, entry);
}

export function clearDatabaseCache() {
  const state = getState();
  const removedCount = state.entries.size;

  state.entries.clear();
  state.hits = 0;
  state.misses = 0;
  state.lastDurationMs = null;

  return {
    removedCount,
    ...getDatabaseCacheMetadata(),
  };
}

export function getDatabaseCacheMetadata() {
  const state = getState();
  const entries = [...state.entries.values()];

  return {
    status: entries.some((entry) => entry.promise)
      ? "refreshing"
      : entries.length > 0
        ? "available"
        : "idle",
    updatedAt: entries.reduce(
      (latest, entry) => Math.max(latest, entry.updatedAt || 0),
      0,
    ) || null,
    totalCount: entries.reduce((total, entry) => total + entry.rowCount, 0),
    queryCount: entries.length,
    syncDurationMs: state.lastDurationMs,
    storage: "Server memory",
    hits: state.hits,
    misses: state.misses,
  };
}

export function invalidateDatabaseCache() {
  getState().entries.clear();
}
