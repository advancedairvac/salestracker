const SERVICE_TITAN_CONFIG = {
  baseUrl:
    process.env.SERVICETITAN_ENV === "production"
      ? "https://api.servicetitan.io"
      : "https://api-integration.servicetitan.io",

  authUrl:
    process.env.SERVICETITAN_ENV === "production"
      ? "https://auth.servicetitan.io/connect/token"
      : "https://auth-integration.servicetitan.io/connect/token",
};

const API_CACHE_TTL_MS = 60 * 1000;
const CUSTOMER_LIST_CACHE_TTL_MS = 13 * 60 * 1000;
const API_CACHE_MAX_ENTRIES = 600;
const serviceTitanApiCache = new Map();
let allCustomersCache = null;
let allCustomersCacheExpiresAt = 0;
let allCustomersRequestPromise = null;
let allCustomersCacheGeneration = 0;

// ============================================
// ENVIRONMENT VARIABLES
// ============================================

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

// ============================================
// OAUTH TOKEN CACHE
// ============================================

let cachedAccessToken = null;
let tokenExpiresAt = 0;
let tokenRequestPromise = null;

// ============================================
// OAUTH AUTHENTICATION
// ============================================

async function getAccessToken() {
  const now = Date.now();

  if (cachedAccessToken && now < tokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  if (tokenRequestPromise) {
    return tokenRequestPromise;
  }

  tokenRequestPromise = (async () => {
    const clientId = getRequiredEnv("SERVICETITAN_CLIENT_ID");
    const clientSecret = getRequiredEnv("SERVICETITAN_CLIENT_SECRET");

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(SERVICE_TITAN_CONFIG.authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.access_token) {
      throw new Error(
        `ServiceTitan authentication failed (${response.status}): ${
          result?.error_description ||
          result?.error ||
          "Unable to obtain access token."
        }`,
      );
    }

    cachedAccessToken = result.access_token;

    const expiresIn = Number(result.expires_in) || 900;

    tokenExpiresAt = Date.now() + expiresIn * 1000;

    return cachedAccessToken;
  })();

  try {
    return await tokenRequestPromise;
  } finally {
    tokenRequestPromise = null;
  }
}

// ============================================
// INVALIDATE ACCESS TOKEN
// ============================================

function invalidateAccessToken(accessToken) {
  if (cachedAccessToken === accessToken) {
    cachedAccessToken = null;
    tokenExpiresAt = 0;
  }
}

// ============================================
// SHARED API REQUEST
// ============================================

function startCachedServiceTitanRequest(cacheKey, makeRequest, existing = null) {
  const entry = existing || {
    value: undefined,
    expiresAt: Number.POSITIVE_INFINITY,
    promise: null,
  };

  entry.expiresAt = Number.POSITIVE_INFINITY;
  const startedAt = performance.now();
  entry.promise = makeRequest()
    .then((result) => {
      entry.value = result;
      entry.updatedAt = Date.now();
      entry.syncDurationMs = Math.round(performance.now() - startedAt);
      entry.rowCount = Array.isArray(result?.data)
        ? result.data.length
        : Array.isArray(result?.customers)
          ? result.customers.length
          : 1;
      const reportedTotalCount =
        result?.totalCount === undefined || result?.totalCount === null
          ? Number.NaN
          : Number(result.totalCount);
      entry.reportedTotalCount = Number.isFinite(reportedTotalCount)
        ? reportedTotalCount
        : null;
      entry.expiresAt = Date.now() + API_CACHE_TTL_MS;
      entry.promise = null;
      return result;
    })
    .catch((error) => {
      if (entry.value === undefined) {
        if (serviceTitanApiCache.get(cacheKey) === entry) {
          serviceTitanApiCache.delete(cacheKey);
        }
      } else {
        entry.expiresAt = Date.now() + 5000;
        entry.promise = null;
      }

      throw error;
    });

  serviceTitanApiCache.set(cacheKey, entry);

  while (serviceTitanApiCache.size > API_CACHE_MAX_ENTRIES) {
    const oldestKey = serviceTitanApiCache.keys().next().value;
    if (oldestKey === cacheKey) break;
    serviceTitanApiCache.delete(oldestKey);
  }

  return entry.promise;
}

export function clearServiceTitanApiCache(collection = "all") {
  const selected = String(collection || "all").toLowerCase();
  let removedCount = 0;

  for (const key of serviceTitanApiCache.keys()) {
    let remove = selected === "all";

    if (!remove) {
      try {
        const pathname = new URL(key).pathname.toLowerCase();
        remove = pathname.split("/").includes(selected);
      } catch {
        remove = true;
      }
    }

    if (remove) {
      serviceTitanApiCache.delete(key);
      removedCount += 1;
    }
  }

  if (selected === "all" || selected === "customers") {
    allCustomersCacheGeneration += 1;
    allCustomersCache = null;
    allCustomersCacheExpiresAt = 0;
    allCustomersRequestPromise = null;
  }

  return { removedCount, collection: selected };
}

export function getServiceTitanApiCacheMetadata(collection = "all") {
  const selected = String(collection || "all").toLowerCase();
  const entries = [...serviceTitanApiCache.entries()]
    .filter(([key, entry]) => {
      if (entry.expiresAt <= Date.now() && !entry.promise) return false;
      if (selected === "all") return true;

      try {
        return new URL(key).pathname.toLowerCase().split("/").includes(selected);
      } catch {
        return false;
      }
    })
    .map(([, entry]) => entry);
  const latestEntry = entries.reduce(
    (latest, entry) =>
      !latest || (entry.updatedAt || 0) > (latest.updatedAt || 0)
        ? entry
        : latest,
    null,
  );

  return {
    status: entries.some((entry) => entry.promise)
      ? "refreshing"
      : entries.length
        ? "available"
        : "idle",
    updatedAt: entries.reduce(
      (latest, entry) => Math.max(latest, entry.updatedAt || 0),
      0,
    ) || null,
    totalCount:
      selected === "estimates"
        ? entries.reduce(
            (total, entry) =>
              Math.max(total, entry.reportedTotalCount || 0),
            0,
          )
        : entries.reduce((total, entry) => total + (entry.rowCount || 0), 0),
    queryCount: entries.length,
    storage: "Server memory",
    syncDurationMs: latestEntry?.syncDurationMs ?? null,
  };
}

export async function serviceTitanRequest(path, params = {}) {
  const tenantId = getRequiredEnv("SERVICETITAN_TENANT_ID");
  const appKey = getRequiredEnv("SERVICETITAN_APP_KEY");

  const resolvedPath = path.replace("{tenant}", encodeURIComponent(tenantId));

  const url = new URL(`${SERVICE_TITAN_CONFIG.baseUrl}${resolvedPath}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const orderedParams = [...url.searchParams.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  url.search = new URLSearchParams(orderedParams).toString();

  const cacheKey = url.toString();
  const now = Date.now();

  for (const [key, entry] of serviceTitanApiCache) {
    if (entry.expiresAt <= now) serviceTitanApiCache.delete(key);
  }

  const cached = serviceTitanApiCache.get(cacheKey);

  if (cached && cached.expiresAt > now && cached.value !== undefined) {
    return cached.value;
  }

  if (cached?.promise) {
    if (cached.value !== undefined) return cached.value;
    return cached.promise;
  }

  async function makeRequest(accessToken) {
    return fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "ST-App-Key": appKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  }

  const requestData = async () => {
    let accessToken = await getAccessToken();

    let response = await makeRequest(accessToken);

    if (response.status === 401) {
      invalidateAccessToken(accessToken);

      accessToken = await getAccessToken();

      response = await makeRequest(accessToken);
    }

    const result = await response.json().catch(() => null);

    if (!response.ok || !result) {
      throw new Error(
        `ServiceTitan API request failed (${response.status}): ${
          result?.title ||
          result?.message ||
          result?.error ||
          "Unable to fetch ServiceTitan data."
        }`,
      );
    }

    return result;
  };

  return startCachedServiceTitanRequest(cacheKey, requestData, cached);
}

// ============================================
// SHARED PAGINATION HELPER
// ============================================

async function fetchAllPages(fetchPage, { pageSize = 50, maxPages = 10 } = {}) {
  const allItems = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchPage(page, pageSize);

    const items = Array.isArray(result.data) ? result.data : [];

    allItems.push(...items);

    if (
      items.length === 0 ||
      result.hasMore === false ||
      (result.hasMore === undefined && items.length < pageSize)
    ) {
      break;
    }
  }

  return allItems;
}

// ============================================
// ESTIMATES
// ============================================

export async function getEstimates({
  page = 1,
  pageSize = 50,
  includeTotal = true,
  ...filters
} = {}) {
  return serviceTitanRequest("/sales/v2/tenant/{tenant}/estimates", {
    page,
    pageSize,
    includeTotal,
    ...filters,
  });
}

export async function getAllEstimates({
  pageSize = 50,
  maxPages = 10,
  ...filters
} = {}) {
  return fetchAllPages(
    (page, size) =>
      getEstimates({
        ...filters,
        page,
        pageSize: size,
        includeTotal: true,
      }),
    { pageSize, maxPages },
  );
}

// ============================================
// JOBS
// ============================================

export async function getJobs({
  page = 1,
  pageSize = 50,
  includeTotal = true,
  ...filters
} = {}) {
  return serviceTitanRequest("/jpm/v2/tenant/{tenant}/jobs", {
    page,
    pageSize,
    includeTotal,
    ...filters,
  });
}

// ============================================
// REVENUE JOB FIELDS
// Only 6 required fields.
// ============================================

function optimizeRevenueJob(job) {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    customerId: job.customerId,
    jobStatus: job.jobStatus,
    completedOn: job.completedOn,
    total: Number(job.total) || 0,
  };
}

// ============================================
// GET REVENUE JOBS
// ============================================

export async function getRevenueJobs({
  page = 1,
  pageSize = 50,
  includeTotal = true,
  ...filters
} = {}) {
  const result = await getJobs({
    page,
    pageSize,
    includeTotal,
    ...filters,
  });

  const jobs = Array.isArray(result.data) ? result.data : [];

  return {
    ...result,
    data: jobs.map(optimizeRevenueJob),
  };
}

// ============================================
// GET ALL JOBS
// ============================================

export async function getAllJobs({
  pageSize = 50,
  maxPages = 10,
  ...filters
} = {}) {
  return fetchAllPages(
    (page, size) =>
      getJobs({
        ...filters,
        page,
        pageSize: size,
        includeTotal: true,
      }),
    { pageSize, maxPages },
  );
}

// ============================================
// JOB TYPE
// ============================================

export async function getJobType(jobTypeId) {
  if (!jobTypeId) {
    return null;
  }

  try {
    return await serviceTitanRequest(
      `/jpm/v2/tenant/{tenant}/job-types/${encodeURIComponent(
        String(jobTypeId),
      )}`,
    );
  } catch {
    return null;
  }
}

// ============================================
// CUSTOMER CONTACTS
// ============================================

async function getCustomerContacts(customerIds) {
  if (!customerIds.length) {
    return [];
  }

  const result = await serviceTitanRequest(
    "/crm/v2/tenant/{tenant}/customers/contacts",
    {
      customerIds: customerIds.join(","),
      page: 1,
      pageSize: 100,
      includeTotal: true,
    },
  );

  return Array.isArray(result.data) ? result.data : [];
}

// ============================================
// GROUP CONTACTS BY CUSTOMER ID
// ============================================

function groupCustomerContacts(contacts) {
  const contactsByCustomerId = new Map();

  for (const contact of contacts) {
    const customerId = String(contact.customerId);

    if (!contactsByCustomerId.has(customerId)) {
      contactsByCustomerId.set(customerId, []);
    }

    contactsByCustomerId.get(customerId).push(contact);
  }

  return contactsByCustomerId;
}

// ============================================
// FORMAT CUSTOMER DATA
// ============================================

function formatCustomer(customer, contactsByCustomerId) {
  const customerContacts = contactsByCustomerId.get(String(customer.id)) || [];

  let phone = "";
  let email = "";
  let fax = "";

  for (const contact of customerContacts) {
    if (!phone && contact.type === "Phone") {
      phone = contact.value || "";
    }

    if (!email && contact.type === "Email") {
      email = contact.value || "";
    }

    if (!fax && contact.type === "Fax") {
      fax = contact.value || "";
    }

    if (phone && email && fax) {
      break;
    }
  }

  const address = customer.address || {};

  const location = [
    address.street,
    address.unit,
    address.city,
    address.state,
    address.zip,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: customer.id,
    stCustomerId: String(customer.id),

    pocName: customer.name || "",
    businessName: customer.businessName || "",

    email,
    phone,
    fax,

    location,
    address: customer.address || null,

    type: customer.type || "",
    active: customer.active ?? true,
  };
}

// ============================================
// CUSTOMERS
// ============================================

export async function getServiceTitanCustomers({
  page = 1,
  pageSize = 100,
} = {}) {
  const result = await serviceTitanRequest(
    "/crm/v2/tenant/{tenant}/customers",
    {
      page,
      pageSize,
      includeTotal: true,
    },
  );

  const customers = Array.isArray(result.data) ? result.data : [];

  if (!customers.length) {
    return {
      ...result,
      data: [],
      customers: [],
    };
  }

  const customerIds = customers.map((customer) => customer.id);

  const contacts = await getCustomerContacts(customerIds);

  // Create a customer contact lookup once.
  const contactsByCustomerId = groupCustomerContacts(contacts);

  // Format customers using O(1) contact lookup.
  const formattedCustomers = customers.map((customer) =>
    formatCustomer(customer, contactsByCustomerId),
  );

  return {
    ...result,
    data: formattedCustomers,
    customers: formattedCustomers,
  };
}

// ============================================
// GET ALL CUSTOMERS
// ============================================

export async function getAllServiceTitanCustomers({
  pageSize = 100,
  maxPages = 100,
} = {}) {
  const now = Date.now();

  if (allCustomersCache && now < allCustomersCacheExpiresAt) {
    return allCustomersCache;
  }

  if (allCustomersRequestPromise) {
    return allCustomersRequestPromise;
  }

  const generationAtStart = allCustomersCacheGeneration;
  let requestPromise;

  requestPromise = fetchAllServiceTitanCustomers({ pageSize, maxPages })
    .then((customers) => {
      if (allCustomersCacheGeneration === generationAtStart) {
        allCustomersCache = customers;
        allCustomersCacheExpiresAt = Date.now() + CUSTOMER_LIST_CACHE_TTL_MS;
      }
      return customers;
    })
    .finally(() => {
      if (allCustomersRequestPromise === requestPromise) {
        allCustomersRequestPromise = null;
      }
    });

  allCustomersRequestPromise = requestPromise;
  return requestPromise;
}

async function fetchAllServiceTitanCustomers({ pageSize, maxPages }) {
  const firstPage = await getServiceTitanCustomers({ page: 1, pageSize });
  const firstItems = Array.isArray(firstPage.data) ? firstPage.data : [];
  const reportedTotal = Number(firstPage.totalCount);

  if (!Number.isFinite(reportedTotal) || reportedTotal < firstItems.length) {
    const customers = [...firstItems];
    let page = 2;

    while (page <= maxPages) {
      const result = await getServiceTitanCustomers({ page, pageSize });
      const items = Array.isArray(result.data) ? result.data : [];
      customers.push(...items);

      if (
        items.length === 0 ||
        result.hasMore === false ||
        (result.hasMore === undefined && items.length < pageSize)
      ) {
        break;
      }
      page += 1;
    }

    return customers;
  }

  const pageCount = Math.min(maxPages, Math.ceil(reportedTotal / pageSize));
  const customers = [...firstItems];
  const pageConcurrency = 3;

  for (
    let firstPageNumber = 2;
    firstPageNumber <= pageCount;
    firstPageNumber += pageConcurrency
  ) {
    const pageNumbers = Array.from(
      { length: Math.min(pageConcurrency, pageCount - firstPageNumber + 1) },
      (_, index) => firstPageNumber + index,
    );
    const responses = await Promise.all(
      pageNumbers.map((page) => getServiceTitanCustomers({ page, pageSize })),
    );

    for (const response of responses) {
      if (!Array.isArray(response.data)) {
        throw new Error("Invalid ServiceTitan customers page response.");
      }
      customers.push(...response.data);
    }
  }

  return customers;
}
