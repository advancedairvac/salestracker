import { readCache, writeCache, deleteCache } from "./indexed-db";

const PREFIX = "servicetitan:";
const GLOBAL_KEY = "__ADVANCED_SALES_ST_CACHE__";

function createManager() {
  const listeners = new Map();
  const requests = new Map();
  const generations = new Map();
  const operations = new Map();

  // ============================================
  // GENERATION
  // ============================================

  function getGeneration(key) {
    return generations.get(key) || 0;
  }

  function invalidateRequest(key) {
    generations.set(key, getGeneration(key) + 1);
    requests.delete(key);
  }

  // ============================================
  // NOTIFY SUBSCRIBERS
  // ============================================

  function emit(key, value) {
    const subscribers = listeners.get(key);

    if (!subscribers) return;

    subscribers.forEach((callback) => {
      try {
        callback(value);
      } catch (error) {
        console.error("Cache subscriber error:", error);
      }
    });
  }

  // ============================================
  // SUBSCRIBE
  // ============================================

  function subscribe(key, callback) {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }

    listeners.get(key).add(callback);

    return () => {
      const subscribers = listeners.get(key);

      subscribers?.delete(callback);

      if (subscribers?.size === 0) {
        listeners.delete(key);
      }
    };
  }

  // ============================================
  // SERIALIZE CACHE OPERATIONS
  // ============================================

  function enqueue(key, operation) {
    const previous = operations.get(key) || Promise.resolve();

    const current = previous.catch(() => {}).then(operation);

    operations.set(key, current);

    current
      .finally(() => {
        if (operations.get(key) === current) {
          operations.delete(key);
        }
      })
      .catch(() => {});

    return current;
  }

  // ============================================
  // GET CACHE
  // ============================================

  async function get(key) {
    try {
      return await readCache(`${PREFIX}${key}`);
    } catch (error) {
      console.error("Cache read failed:", error);
      return null;
    }
  }

  // ============================================
  // SET CACHE
  // ============================================

  function set(key, value) {
    return enqueue(key, async () => {
      await writeCache(`${PREFIX}${key}`, value);

      emit(key, value);

      return true;
    }).catch((error) => {
      console.error("Cache write failed:", error);
      return false;
    });
  }

  // ============================================
  // FETCH + SAVE CACHE
  // ============================================

  function request(key, fetcher) {
    if (requests.has(key)) {
      return requests.get(key);
    }

    return createRequest(key, fetcher);
  }

  // ============================================
  // FORCE REFRESH
  // ============================================

  function refresh(key, fetcher) {
    // Invalidate an existing request without deleting
    // the currently saved cache.
    invalidateRequest(key);

    return createRequest(key, fetcher);
  }

  // ============================================
  // CREATE REQUEST
  // ============================================

  function createRequest(key, fetcher) {
    const generation = getGeneration(key);

    const promise = Promise.resolve()
      .then(fetcher)
      .then((data) =>
        enqueue(key, async () => {
          // Ignore requests that are no longer valid.
          if (getGeneration(key) !== generation) {
            return data;
          }

          // New data is written only after the fetcher
          // successfully returns the complete dataset.
          await writeCache(`${PREFIX}${key}`, data);

          // Notify only after IndexedDB transaction commits.
          emit(key, data);

          return data;
        }),
      )
      .finally(() => {
        if (requests.get(key) === promise) {
          requests.delete(key);
        }
      });

    requests.set(key, promise);

    return promise;
  }

  // ============================================
  // REMOVE CACHE
  // ============================================

  function remove(key) {
    // Invalidate pending requests.
    invalidateRequest(key);

    // Notify subscribers immediately.
    emit(key, null);

    // Delete serialized with other cache operations.
    return enqueue(key, async () => {
      await deleteCache(`${PREFIX}${key}`);

      return true;
    }).catch((error) => {
      console.error("Cache delete failed:", error);
      return false;
    });
  }

  return {
    get,
    set,
    request,
    refresh,
    subscribe,
    remove,
  };
}

// ============================================
// GLOBAL CACHE MANAGER
// ============================================

function getManager() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window[GLOBAL_KEY]) {
    window[GLOBAL_KEY] = createManager();
  }

  return window[GLOBAL_KEY];
}

export const cacheManager = {
  get(key) {
    return getManager()?.get(key) ?? Promise.resolve(null);
  },

  set(key, value) {
    return getManager()?.set(key, value) ?? Promise.resolve(false);
  },

  request(key, fetcher) {
    return getManager()?.request(key, fetcher) ?? Promise.resolve(null);
  },

  refresh(key, fetcher) {
    return getManager()?.refresh(key, fetcher) ?? Promise.resolve(null);
  },

  subscribe(key, callback) {
    return getManager()?.subscribe(key, callback) ?? (() => {});
  },

  remove(key) {
    return getManager()?.remove(key) ?? Promise.resolve(false);
  },
};
