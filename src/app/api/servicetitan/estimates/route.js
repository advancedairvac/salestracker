import { getAuthenticatedUser } from "@/lib/auth";
import { getEstimates } from "@/lib/integrations/servicetitan";

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

  const requestedPage = Number(searchParams.get("page"));
  const requestedPageSize = Number(searchParams.get("pageSize"));

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 100)
      : 50;

  try {
    // 3. Fetch estimates from ServiceTitan
    const result = await getEstimates({
      page,
      pageSize,
      includeTotal: true,
    });

    // 4. API response
    return Response.json({
      success: true,
      totalCount: result.totalCount ?? null,
      hasMore: result.hasMore ?? false,
      page: result.page ?? page,
      pageSize: result.pageSize ?? pageSize,
      estimates: Array.isArray(result.data) ? result.data : [],
    });
  } catch (error) {
    console.error("ServiceTitan estimates API error:", error);

    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to fetch estimates from ServiceTitan.",
      },
      { status: 502 },
    );
  }
}
