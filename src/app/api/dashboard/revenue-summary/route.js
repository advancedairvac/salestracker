import { getAuthenticatedUser } from "@/lib/auth";
import { getRevenueJobsForRange } from "@/lib/dashboard/servicetitan-jobs";
import { getRevenueMetrics } from "@/lib/dashboard/dashboard-metrics";
import { getRevenueDateRanges } from "@/lib/date/date-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { success: false, message: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const dateRanges = getRevenueDateRanges();
    const jobs = await getRevenueJobsForRange({
      start: dateRanges.yearStart,
      endExclusive: dateRanges.nextYearStart,
    });
    const { todayRevenue, monthRevenue, yearRevenue } = getRevenueMetrics({
      jobs,
      dateRanges,
    });

    return Response.json(
      {
        success: true,
        year: dateRanges.yearStart.getFullYear(),
        todayRevenue,
        monthRevenue,
        yearRevenue,
        refreshedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Dashboard revenue summary failed:", error);

    return Response.json(
      { success: false, message: "Unable to load the revenue summary." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
