
import { NextResponse } from "next/server";
import { getJobs } from "@/lib/integrations/servicetitan";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filters = {
      pageSize: 5,
      includeTotal: true,
      jobStatus: "Completed",
      completedOnOrAfter: "2026-11-01",
      completedBefore: "2026-11-13",
    };

    const [page1, page2, page3] = await Promise.all([
      getJobs({ ...filters, page: 1 }),
      getJobs({ ...filters, page: 2 }),
      getJobs({ ...filters, page: 3 }),
    ]);

    const jobs1 = Array.isArray(page1.data) ? page1.data : [];
    const jobs2 = Array.isArray(page2.data) ? page2.data : [];
    const jobs3 = Array.isArray(page3.data) ? page3.data : [];

    const ids1 = new Set(jobs1.map((job) => String(job.id)));
    const ids2 = new Set(jobs2.map((job) => String(job.id)));
    const ids3 = new Set(jobs3.map((job) => String(job.id)));

    const hasDuplicateRecords =
      jobs2.some((job) => ids1.has(String(job.id))) ||
      jobs3.some(
        (job) => ids1.has(String(job.id)) || ids2.has(String(job.id)),
      );

    return NextResponse.json({
      success: true,
      environment: process.env.SERVICETITAN_ENV || "integration",

      metadata: {
        totalCount: page1.totalCount ?? null,
        pageSize: filters.pageSize,
      },

      page1: {
        page: page1.page ?? 1,
        returnedRecords: jobs1.length,
        hasMore: page1.hasMore ?? null,
        jobs: jobs1.map((job) => ({
          id: job.id,
          completedOn: job.completedOn,
        })),
      },

      page2: {
        page: page2.page ?? 2,
        returnedRecords: jobs2.length,
        hasMore: page2.hasMore ?? null,
        jobs: jobs2.map((job) => ({
          id: job.id,
          completedOn: job.completedOn,
        })),
      },

      page3: {
        page: page3.page ?? 3,
        returnedRecords: jobs3.length,
        hasMore: page3.hasMore ?? null,
        jobs: jobs3.map((job) => ({
          id: job.id,
          completedOn: job.completedOn,
        })),
      },

      validation: {
        pagesHaveDifferentRecords: !hasDuplicateRecords,
        page1AndPage2Distinct:
          !jobs2.some((job) => ids1.has(String(job.id))),
        page2AndPage3Distinct:
          !jobs3.some((job) => ids2.has(String(job.id))),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
