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
// OAUTH AUTHENTICATION
// ============================================

async function getAccessToken() {
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

  return result.access_token;
}

// ============================================
// SHARED API REQUEST
// ============================================

export async function serviceTitanRequest(path, params = {}) {
  const tenantId = getRequiredEnv("SERVICETITAN_TENANT_ID");
  const appKey = getRequiredEnv("SERVICETITAN_APP_KEY");

  const accessToken = await getAccessToken();

  const resolvedPath = path.replace("{tenant}", encodeURIComponent(tenantId));

  const url = new URL(`${SERVICE_TITAN_CONFIG.baseUrl}${resolvedPath}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "ST-App-Key": appKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result) {
    throw new Error(
      `ServiceTitan API request failed (${response.status}): ${
        result?.title || result?.message || "Unable to fetch ServiceTitan data."
      }`,
    );
  }

  return result;
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
// JOBS / REVENUE
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
      "/jpm/v2/tenant/{tenant}/job-types/{jobTypeId}".replace(
        "{jobTypeId}",
        encodeURIComponent(String(jobTypeId)),
      ),
    );
  } catch (error) {
    console.error(`ServiceTitan Job Type Fetch Error (${jobTypeId}):`, error);

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
// FORMAT CUSTOMER DATA
// ============================================

function formatCustomer(customer, contacts) {
  const customerContacts = contacts.filter(
    (contact) => String(contact.customerId) === String(customer.id),
  );

  const phone = customerContacts.find((contact) => contact.type === "Phone");

  const email = customerContacts.find((contact) => contact.type === "Email");

  const fax = customerContacts.find((contact) => contact.type === "Fax");

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

    email: email?.value || "",
    phone: phone?.value || "",
    fax: fax?.value || "",

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

  const formattedCustomers = customers.map((customer) =>
    formatCustomer(customer, contacts),
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
  return fetchAllPages(
    async (page, size) => {
      return getServiceTitanCustomers({
        page,
        pageSize: size,
      });
    },
    { pageSize, maxPages },
  );
}
