
import { getAuthenticatedUser } from "@/lib/auth";
import { getServiceTitanCustomers } from "@/lib/integrations/servicetitan";

export const runtime = "nodejs";

export async function GET(request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  const searchParams = new URL(request.url).searchParams;

  const search =
    searchParams.get("search")?.trim().toLowerCase() || "";

  const page = Math.max(
    1,
    Number(searchParams.get("page")) || 1
  );

  const pageSize = Math.min(
    100,
    Math.max(
      1,
      Number(searchParams.get("pageSize")) || 100
    )
  );

  try {
    const result = await getServiceTitanCustomers({
      page,
      pageSize,
    });

    const customers = result.customers || [];

    // Search by customer name, phone or email
    const filteredCustomers = search
      ? customers.filter((customer) => {
          return (
            customer.pocName.toLowerCase().includes(search) ||
            customer.phone.toLowerCase().includes(search) ||
            customer.email.toLowerCase().includes(search)
          );
        })
      : customers;

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
    console.error(
      "ServiceTitan customer request failed:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to fetch customers from ServiceTitan.",
      },
      { status: 502 }
    );
  }
}
