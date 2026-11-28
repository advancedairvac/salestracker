async function requestCacheApi({ method = "GET", body } = {}) {
  const response = await fetch("/api/admin/cache", {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to update cache.");
  }

  return result;
}

export function getAdminCacheMetadata() {
  return requestCacheApi();
}

export function resetServiceTitanCache(collection) {
  return requestCacheApi({
    method: "POST",
    body: { target: "servicetitan", collection },
  });
}

export function resetPostgresCache() {
  return requestCacheApi({
    method: "POST",
    body: { target: "database" },
  });
}
