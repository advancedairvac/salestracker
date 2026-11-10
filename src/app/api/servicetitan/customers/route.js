import { getAuthenticatedUser } from "@/lib/auth";
import { getServiceTitanCustomers } from "@/lib/integrations/servicetitan";

export const runtime = "nodejs";

export async function GET(request) {
  // 1. Authentication
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

  // 2. Query parameters
  const searchParams = new URL(request.url).searchParams;

  const search = (searchParams.get("search") || "").trim().toLowerCase();

  const requestedPage = Number(searchParams.get("page"));
  const requestedPageSize = Number(searchParams.get("pageSize"));

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 100)
      : 100;

  try {
    // 3. Fetch customers from ServiceTitan
    const result = await getServiceTitanCustomers({
      page,
      pageSize,
    });

    const customers = result.customers || [];

    // 4. Search customers by name, phone, or email
    const filteredCustomers = search
      ? customers.filter((customer) => {
          const name = String(customer.pocName || "").toLowerCase();
          const phone = String(customer.phone || "").toLowerCase();
          const email = String(customer.email || "").toLowerCase();

          return (
            name.includes(search) ||
            phone.includes(search) ||
            email.includes(search)
          );
        })
      : customers;

    // 5. API response
    return Response.json({
      success: true,
      message: "Customers fetched successfully.",
      page: result.page ?? page,
      pageSize: result.pageSize ?? pageSize,
      hasMore: result.hasMore ?? false,
      totalCount: result.totalCount ?? customers.length,
      search,
      customers: filteredCustomers,
    });
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
      { status: 502 },
    );
  }
}
