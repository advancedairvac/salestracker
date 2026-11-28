import { cacheManager } from "./cache-manager";

const CACHE_KEY = "jobs:all";

// ============================================
// LOGOUT CLEANUP
// ============================================

export async function clearJobsCacheOnLogout() {
  return cacheManager.remove(CACHE_KEY);
}
