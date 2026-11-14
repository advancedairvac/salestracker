
import { Suspense } from "react";

import { getSalesConfigurationData } from "@/lib/dashboard/sales-configuration-data";

import JobCardsList from "@/components/settings/sales-configuration/job-cards-list";

export const dynamic = "force-dynamic";

// ============================================
// JOB CARD SKELETON
// ============================================

function JobCardSkeleton() {
  return (
    <div className="animate-pulse border border-[#d5d5d5] bg-white p-4 sm:p-[18px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-3/4 rounded bg-[#e5e5e5]" />
          <div className="h-3 w-1/2 rounded bg-[#eeeeee]" />
        </div>

        <div className="size-8 shrink-0 rounded-full bg-[#eeeeee]" />
      </div>

      <div className="my-4 border-t border-[#ededed]" />

      {/* Customer and Value */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-2.5 w-16 rounded bg-[#e5e5e5]" />
          <div className="h-3.5 w-28 rounded bg-[#eeeeee]" />
        </div>

        <div className="space-y-2">
          <div className="h-2.5 w-16 rounded bg-[#e5e5e5]" />
          <div className="h-3.5 w-24 rounded bg-[#eeeeee]" />
        </div>
      </div>

      {/* Assignment */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#ededed] pt-3">
        <div className="space-y-2">
          <div className="h-2.5 w-12 rounded bg-[#e5e5e5]" />
          <div className="h-3.5 w-24 rounded bg-[#eeeeee]" />
        </div>

        <div className="space-y-2">
          <div className="h-2.5 w-16 rounded bg-[#e5e5e5]" />
          <div className="h-3.5 w-24 rounded bg-[#eeeeee]" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// JOB CARDS SKELETON
// ============================================

function JobCardsSkeleton() {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-black">
          ServiceTitan Jobs
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <JobCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

// ============================================
// SALES CONFIGURATION DATA SECTION
// ============================================

async function SalesConfigurationSection({ searchParams }) {
  try {
    const { jobs, salesmen, pagination } =
      await getSalesConfigurationData(searchParams);

    return (
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-black">
            ServiceTitan Jobs
          </h2>

          <span className="text-sm text-[#777]">
            {pagination.totalItems} Jobs
          </span>
        </div>

        {jobs.length > 0 ? (
          <JobCardsList
            jobs={jobs}
            salesmen={salesmen}
            currentPage={pagination.currentPage}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
          />
        ) : (
          <div className="border border-[#d5d5d5] bg-white px-5 py-12 text-center">
            <h2 className="text-[15px] font-bold uppercase tracking-wide text-[#171717]">
              No Jobs Found
            </h2>

            <p className="mt-2 text-[13px] text-[#737373]">
              No ServiceTitan Jobs are currently available.
            </p>
          </div>
        )}
      </section>
    );
  } catch (error) {
    console.error("Sales Configuration Page Error:", error);

    return (
      <div className="border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
        Unable to load ServiceTitan Jobs. Please try again later.
      </div>
    );
  }
}

// ============================================
// SALES CONFIGURATION PAGE
// ============================================

export default async function SalesConfigurationPage({ searchParams }) {
  const params = await searchParams;

  const tableKey = [
    params.page || "1",
    params.pageSize || "9",
  ].join("-");

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#929292]">
            Settings
          </p>

          <h1 className="mt-1 text-[23px] font-extrabold uppercase tracking-wide text-[#171717]">
            Sales Configuration
          </h1>

          <p className="mt-1 text-[13px] text-[#737373]">
            Manage job sources and salesperson assignments.
          </p>
        </div>
      </div>

      {/* JOB CARDS */}
      <Suspense
        key={tableKey}
        fallback={<JobCardsSkeleton />}
      >
        <SalesConfigurationSection searchParams={params} />
      </Suspense>
    </div>
  );
}
