const DB_NAME = "advanced-sales-tracker";
const DB_VERSION = 1;
const STORE_NAME = "cache";

let dbPromise = null;

function openDB() {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is unavailable."));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "key",
        });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error("Unable to open IndexedDB."));
    };

    request.onblocked = () => {
      console.warn("IndexedDB upgrade is blocked.");
    };
  });

  return dbPromise;
}

// ============================================
// READ CACHE
// ============================================

export async function readCache(key) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error || new Error("Cache read failed."));
    };

    transaction.onabort = () => {
      reject(transaction.error || new Error("Cache read aborted."));
    };
  });
}

// ============================================
// WRITE CACHE
// ============================================

export async function writeCache(key, value) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.put({
      key,
      value,
      updatedAt: Date.now(),
    });

    transaction.oncomplete = () => {
      resolve(true);
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("Cache write failed."));
    };

    transaction.onabort = () => {
      reject(transaction.error || new Error("Cache write aborted."));
    };
  });
}

// ============================================
// DELETE CACHE
// ============================================

export async function deleteCache(key) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);

    transaction.oncomplete = () => {
      resolve(true);
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("Cache delete failed."));
    };

    transaction.onabort = () => {
      reject(transaction.error || new Error("Cache delete aborted."));
    };
  });
}

// ============================================
// CLEAR ALL CACHE
// ============================================

export async function clearCache() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();

    transaction.oncomplete = () => {
      resolve(true);
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("Cache clear failed."));
    };

    transaction.onabort = () => {
      reject(transaction.error || new Error("Cache clear aborted."));
    };
  });
}
