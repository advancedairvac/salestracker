import { getAuthenticatedUser } from "@/lib/auth";
import {
  clearDatabaseCache,
  getDatabaseCacheMetadata,
} from "@/lib/cache/database-cache";
import {
  clearServiceTitanApiCache,
  getServiceTitanApiCacheMetadata,
} from "@/lib/integrations/servicetitan";
import {
  clearRevenueJobsCache,
  getRevenueJobsCacheMetadata,
  getYtdRevenueJobs,
} from "@/lib/dashboard/servicetitan-jobs";
import { clearDashboardEstimateSummaryCache } from "@/lib/dashboard/servicetitan-estimates";
import { getEstimates } from "@/lib/integrations/servicetitan";
import { clearServiceTitanCustomerCache } from "@/lib/dashboard/customer-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function authorizeAdmin() {
  const user = await getAuthenticatedUser();

  if (!user) return json({ success: false, message: "Unauthorized." }, 401);
  if (user.role !== "ADMIN") {
    return json({ success: false, message: "Admin access required." }, 403);
  }

  return null;
}

export async function GET() {
  const denial = await authorizeAdmin();
  if (denial) return denial;

  const serviceTitanJobs = getServiceTitanApiCacheMetadata("jobs");
  const revenueJobs = getRevenueJobsCacheMetadata();
  let estimates = getServiceTitanApiCacheMetadata("estimates");

  // The estimate summary cache is separate from paginated estimate responses.
  // A one-row unfiltered request gives Settings the real total without
  // downloading the full estimate list. ServiceTitan's request cache reuses it.
  try {
    await getEstimates({ page: 1, pageSize: 1, includeTotal: true });
    estimates = getServiceTitanApiCacheMetadata("estimates");
  } catch (error) {
    console.error("Estimate cache metadata initialization failed:", error);
  }

  return json({
    success: true,
    database: getDatabaseCacheMetadata(),
    serviceTitan: {
      customers: getServiceTitanApiCacheMetadata("customers"),
      estimates,
      jobs: {
        status:
          serviceTitanJobs.status === "refreshing" ||
          revenueJobs.status === "refreshing"
            ? "refreshing"
            : serviceTitanJobs.status === "available" ||
                revenueJobs.status === "available"
            ? "available"
            : "idle",
        updatedAt: Math.max(
          serviceTitanJobs.updatedAt || 0,
          revenueJobs.updatedAt || 0,
        ) || null,
        totalCount: Math.max(
          serviceTitanJobs.totalCount || 0,
          revenueJobs.totalCount || 0,
        ),
        queryCount: serviceTitanJobs.queryCount + revenueJobs.queryCount,
        storage: "Server memory",
        syncDurationMs: revenueJobs.syncDurationMs,
      },
    },
  });
}

export async function POST(request) {
  const denial = await authorizeAdmin();
  if (denial) return denial;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, message: "Invalid request body." }, 400);
  }

  if (body?.target === "database") {
    return json({
      success: true,
      target: "database",
      ...clearDatabaseCache(),
    });
  }

  if (body?.target === "servicetitan") {
    const collection = String(body.collection || "all").toLowerCase();
    const allowedCollections = ["all", "customers", "estimates", "jobs"];

    if (!allowedCollections.includes(collection)) {
      return json({ success: false, message: "Invalid cache collection." }, 400);
    }

    const apiCache = clearServiceTitanApiCache(collection);
    const result = { target: "servicetitan", collection, apiCache };

    if (collection === "all" || collection === "customers") {
      result.customerLookups = clearServiceTitanCustomerCache();
    }

    if (collection === "all" || collection === "jobs") {
      result.revenueJobs = clearRevenueJobsCache();
    }

    if (collection === "all" || collection === "estimates") {
      result.estimateSummaries = clearDashboardEstimateSummaryCache();
    }

    if (collection === "jobs") {
      const startedAt = performance.now();
      const jobs = await getYtdRevenueJobs();
      result.jobsCache = {
        status: "available",
        totalCount: jobs.length,
        syncDurationMs: Math.round(performance.now() - startedAt),
      };
    }

    if (collection === "estimates") {
      const startedAt = performance.now();
      const estimates = await getEstimates({
        page: 1,
        pageSize: 1,
        includeTotal: true,
      });
      result.estimatesCache = {
        status: "available",
        totalCount:
          estimates.totalCount !== undefined && estimates.totalCount !== null &&
          Number.isFinite(Number(estimates.totalCount))
            ? Number(estimates.totalCount)
            : Array.isArray(estimates.data)
              ? estimates.data.length
              : 0,
        syncDurationMs: Math.round(performance.now() - startedAt),
      };
    }

    return json({ success: true, ...result });
  }

  return json({ success: false, message: "Invalid cache target." }, 400);
}
