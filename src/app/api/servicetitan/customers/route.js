import { getAuthenticatedUser } from "@/lib/auth";
import { getAllServiceTitanCustomers } from "@/lib/integrations/servicetitan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_CUSTOMER_PAGES = 100;

async function authorize() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      response: Response.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  if (!["ADMIN", "SALESPERSON"].includes(user.role)) {
    return {
      response: Response.json(
        {
          success: false,
          message: "You do not have permission.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  return { user };
}

async function fetchCustomers() {
  return getAllServiceTitanCustomers({
    pageSize: 100,
    maxPages: MAX_CUSTOMER_PAGES,
  });
}

function filterCustomers(customers, search) {
  return customers.filter((customer) => {
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
        .includes(search),
    );
  });
}

export async function GET(request) {
  const authorization = await authorize();

  if (authorization.response) {
    return authorization.response;
  }

  const searchParams = new URL(request.url).searchParams;

  // ========================================
  // FULL CUSTOMER CACHE SYNC
  // ========================================
  if (searchParams.get("sync") === "all") {
    try {
      const customers = await fetchCustomers();

      return Response.json(
        {
          success: true,
          message: "Customer database synchronized.",
          totalCount: customers.length,
          customers,
          syncedAt: Date.now(),
        },
        {
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    } catch (error) {
      console.error("ServiceTitan customer sync failed:", error);

      return Response.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Unable to synchronize customers.",
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }
  }

  // ========================================
  // EXISTING CUSTOMER SEARCH API
  // ========================================

  const search = (searchParams.get("search") || "").trim().toLowerCase();

  const requestedPage = Number(searchParams.get("page"));

  const requestedPageSize = Number(searchParams.get("pageSize"));

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  if (search.length < 2) {
    return Response.json(
      {
        success: true,
        message: "Enter at least two characters to search customers.",
        page,
        pageSize,
        hasMore: false,
        totalCount: 0,
        search,
        customers: [],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  try {
    const customers = await fetchCustomers();

    const filteredCustomers = filterCustomers(customers, search);

    const startIndex = (page - 1) * pageSize;

    const paginatedCustomers = filteredCustomers.slice(
      startIndex,
      startIndex + pageSize,
    );

    const hasMore = startIndex + pageSize < filteredCustomers.length;

    return Response.json(
      {
        success: true,
        message: "Customers fetched successfully.",
        page,
        pageSize,
        hasMore,
        totalCount: filteredCustomers.length,
        search,
        customers: paginatedCustomers,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("ServiceTitan customer request failed:", error);

    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to fetch customers from ServiceTitan.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
