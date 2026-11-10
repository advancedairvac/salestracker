
import { getAuthenticatedUser } from "@/lib/auth";
import { getJobs } from "@/lib/integrations/servicetitan";

export const runtime = "nodejs";

export async function GET(request) {
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

  const searchParams = new URL(request.url).searchParams;

  const page = Math.max(
    1,
    Number(searchParams.get("page")) || 1,
  );

  const pageSize = Math.min(
    100,
    Math.max(
      1,
      Number(searchParams.get("pageSize")) || 50,
    ),
  );

  try {
    const result = await getJobs({
      page,
      pageSize,
      includeTotal: true,
    });

    return Response.json({
      success: true,
      totalCount: result.totalCount ?? null,
      hasMore: result.hasMore ?? false,
      page: result.page ?? page,
      pageSize: result.pageSize ?? pageSize,
      jobs: Array.isArray(result.data) ? result.data : [],
    });
  } catch (error) {
    console.error("ServiceTitan jobs API error:", error);

    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to fetch jobs from ServiceTitan.",
      },
      { status: 502 },
    );
  }
}
