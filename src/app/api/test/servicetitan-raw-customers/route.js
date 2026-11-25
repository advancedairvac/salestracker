import { getAuthenticatedUser } from "@/lib/auth";
import { serviceTitanRequest } from "@/lib/integrations/servicetitan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================================================
// ServiceTitan RAW Customer Diagnostic
// READ ONLY
//
// Purpose:
// - Inspect the raw Customer API response
// - Identify all name/company-related fields
// - Determine whether Company Name exists separately
//
// No create, update, or delete operations.
// =====================================================

// =====================================================
// HELPER: Extract name-related fields recursively
// =====================================================

function extractNameRelatedFields(value, path = "", result = {}) {
  if (!value || typeof value !== "object") {
    return result;
  }

  if (Array.isArray(value)) {
    return result;
  }

  for (const [key, item] of Object.entries(value)) {
    const currentPath = path ? `${path}.${key}` : key;

    const normalizedKey = key.toLowerCase();

    const isNameRelated =
      normalizedKey.includes("name") ||
      normalizedKey.includes("company") ||
      normalizedKey.includes("business") ||
      normalizedKey.includes("organization");

    if (
      isNameRelated &&
      (typeof item === "string" ||
        typeof item === "number" ||
        item === null)
    ) {
      result[currentPath] = item;
    }

    if (item && typeof item === "object") {
      extractNameRelatedFields(item, currentPath, result);
    }
  }

  return result;
}

// =====================================================
// HELPER: Collect all raw field paths
// =====================================================

function collectFieldPaths(value, path = "", fields = []) {
  if (!value || typeof value !== "object") {
    return fields;
  }

  if (Array.isArray(value)) {
    return fields;
  }

  for (const [key, item] of Object.entries(value)) {
    const currentPath = path ? `${path}.${key}` : key;

    fields.push(currentPath);

    if (item && typeof item === "object") {
      collectFieldPaths(item, currentPath, fields);
    }
  }

  return fields;
}

// =====================================================
// HELPER: Analyze customer
// =====================================================

function analyzeRawCustomer(customer) {
  return {
    customerId: customer?.id ?? null,

    customerType: customer?.type ?? null,

    active: customer?.active ?? null,

    // Original ServiceTitan name field
    customerName: customer?.name ?? null,

    // Direct raw fields
    directNameFields: {
      name: customer?.name ?? null,
      businessName: customer?.businessName ?? null,
      companyName: customer?.companyName ?? null,
      firstName: customer?.firstName ?? null,
      lastName: customer?.lastName ?? null,
    },

    // Any other name/company-related fields
    nameRelatedFields: extractNameRelatedFields(customer),

    // All available field paths
    availableFieldPaths: collectFieldPaths(customer),

    // Address field names only
    addressFieldPaths: collectFieldPaths(
      customer?.address || {},
      "address",
    ),
  };
}

// =====================================================
// GET: Raw Customer Diagnostic
// =====================================================

export async function GET(request) {
  // ===================================================
  // 1. Authentication
  // ===================================================

  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  // ===================================================
  // 2. Permission Check
  // ===================================================

  if (!["ADMIN", "SALESPERSON"].includes(user.role)) {
    return Response.json(
      {
        success: false,
        message: "You do not have permission.",
      },
      { status: 403 },
    );
  }

  // ===================================================
  // 3. Query Parameters
  // ===================================================

  const searchParams = new URL(request.url).searchParams;

  const requestedPage = Number(searchParams.get("page"));
  const requestedPageSize = Number(searchParams.get("pageSize"));

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const pageSize =
    Number.isInteger(requestedPageSize) &&
    requestedPageSize > 0
      ? Math.min(requestedPageSize, 100)
      : 10;

  // ===================================================
  // 4. Fetch RAW ServiceTitan Customers
  // ===================================================

  try {
    const result = await serviceTitanRequest(
      "/crm/v2/tenant/{tenant}/customers",
      {
        page,
        pageSize,
        includeTotal: true,
      },
    );

    const rawCustomers = Array.isArray(result.data)
      ? result.data
      : [];

    // =================================================
    // 5. Analyze RAW customers
    // =================================================

    const analyzedCustomers = rawCustomers.map(
      analyzeRawCustomer,
    );

    // =================================================
    // 6. Collect all field paths across customers
    // =================================================

    const allFieldPaths = [
      ...new Set(
        rawCustomers.flatMap((customer) =>
          collectFieldPaths(customer),
        ),
      ),
    ];

    // =================================================
    // 7. Name/company field summary
    // =================================================

    const nameFieldSummary = {
      name: {
        exists: rawCustomers.some(
          (customer) => customer?.name !== undefined,
        ),
        populated: rawCustomers.some(
          (customer) => Boolean(customer?.name),
        ),
      },

      businessName: {
        exists: rawCustomers.some(
          (customer) =>
            customer?.businessName !== undefined,
        ),
        populated: rawCustomers.some(
          (customer) => Boolean(customer?.businessName),
        ),
      },

      companyName: {
        exists: rawCustomers.some(
          (customer) =>
            customer?.companyName !== undefined,
        ),
        populated: rawCustomers.some(
          (customer) => Boolean(customer?.companyName),
        ),
      },

      firstName: {
        exists: rawCustomers.some(
          (customer) =>
            customer?.firstName !== undefined,
        ),
        populated: rawCustomers.some(
          (customer) => Boolean(customer?.firstName),
        ),
      },

      lastName: {
        exists: rawCustomers.some(
          (customer) =>
            customer?.lastName !== undefined,
        ),
        populated: rawCustomers.some(
          (customer) => Boolean(customer?.lastName),
        ),
      },
    };

    // =================================================
    // 8. Response
    // =================================================

    return Response.json({
      success: true,

      diagnostic: true,

      readOnly: true,

      source: "ServiceTitan RAW Customer API",

      message:
        "Raw ServiceTitan customer data analyzed successfully.",

      summary: {
        page,
        pageSize,
        totalCount: result.totalCount ?? null,
        returnedCustomers: rawCustomers.length,
        hasMore: result.hasMore ?? false,
      },

      nameFieldSummary,

      allFieldPaths,

      customers: analyzedCustomers,
    });
  } catch (error) {
    console.error(
      "ServiceTitan Raw Customer Diagnostic Error:",
      error,
    );

    return Response.json(
      {
        success: false,
        diagnostic: true,
        readOnly: true,
        message:
          error instanceof Error
            ? error.message
            : "Unable to fetch raw ServiceTitan customers.",
      },
      { status: 502 },
    );
  }
}