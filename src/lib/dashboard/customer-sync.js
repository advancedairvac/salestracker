
import { serviceTitanRequest } from "@/lib/integrations/servicetitan";

// ============================================
// CONFIGURATION
// ============================================

const CUSTOMER_CACHE_TTL = 5 * 60 * 1000;
const CUSTOMER_LOOKUP_CONCURRENCY = 10;

// ============================================
// CUSTOMER CACHE
// ============================================

const customerCache = new Map();
const customerRequests = new Map();

// ============================================
// GET CUSTOMER NAME
// ============================================

export function getCustomerName(customer) {
  if (!customer) {
    return "—";
  }

  return (
    customer.name ||
    customer.pocName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    customer.businessName ||
    "—"
  );
}

// ============================================
// FETCH ONE CUSTOMER
// ============================================

export async function getServiceTitanCustomerById(customerId) {
  if (customerId === undefined || customerId === null || customerId === "") {
    return null;
  }

  const id = String(customerId);
  const now = Date.now();

  // Return valid cached customer.
  const cached = customerCache.get(id);

  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  // Reuse an existing request for the same customer.
  if (customerRequests.has(id)) {
    return customerRequests.get(id);
  }

  const requestPromise = (async () => {
    try {
      const customer = await serviceTitanRequest(
        `/crm/v2/tenant/{tenant}/customers/${encodeURIComponent(id)}`,
      );

      if (!customer || String(customer.id) !== id) {
        return null;
      }

      customerCache.set(id, {
        data: customer,
        expiresAt: Date.now() + CUSTOMER_CACHE_TTL,
      });

      return customer;
    } finally {
      customerRequests.delete(id);
    }
  })();

  customerRequests.set(id, requestPromise);

  return requestPromise;
}

// ============================================
// FETCH MULTIPLE CUSTOMERS
// ============================================

export async function getServiceTitanCustomersByIds(customerIds = []) {
  const uniqueIds = [
    ...new Set(
      customerIds
        .filter((id) => id !== undefined && id !== null && id !== "")
        .map(String),
    ),
  ];

  const customerLookup = {};

  if (!uniqueIds.length) {
    return customerLookup;
  }

  let currentIndex = 0;

  async function worker() {
    while (currentIndex < uniqueIds.length) {
      const index = currentIndex;
      currentIndex += 1;

      const customerId = uniqueIds[index];

      try {
        const customer = await getServiceTitanCustomerById(customerId);

        if (customer) {
          customerLookup[customerId] = customer;
        }
      } catch (error) {
        // Customer details are optional for the table.
        // A failed lookup should not prevent the Revenue page from loading.
        console.error(
          `[Customer Sync] Failed to fetch customer ${customerId}:`,
          error.message,
        );
      }
    }
  }

  const workerCount = Math.min(
    CUSTOMER_LOOKUP_CONCURRENCY,
    uniqueIds.length,
  );

  await Promise.all(
    Array.from({ length: workerCount }, () => worker()),
  );

  return customerLookup;
}
