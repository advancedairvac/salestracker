
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";

import {
  getPipelinePageData,
  getPipelineFollowUpsData,
  getPipelineEstimatesData,
} from "@/lib/dashboard/pipeline-data";

import PageTagline from "@/components/ui/page-tagline";
import Breadcrumbs from "@/components/ui/breadcrumbs";

import PipelineFilter from "@/components/dashboard/pipeline-filter";
import FollowUpsTable from "@/components/dashboard/followUps-table";
import EstimatesTable from "@/components/dashboard/estimates-table";

import TableSkeleton from "@/components/ui/skeleton/table-skeleton";

export const metadata = {
  title: "In The Pipeline",
};

export const dynamic = "force-dynamic";

// ============================================
// FOLLOW-UPS SECTION
// ============================================

async function PipelineFollowUpsSection({
  selectedFilter,
  currentUserId,
}) {
  const followUpData = await getPipelineFollowUpsData({
    selectedFilter,
  });

  return (
    <section className="mt-7 w-full">
      <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
        Follow-ups
      </h2>

      <FollowUpsTable
        followUps={followUpData}
        currentUserId={currentUserId}
      />
    </section>
  );
}

// ============================================
// ESTIMATES SECTION
// ============================================

async function PipelineEstimatesSection({
  requestedPage,
  requestedPageSize,
}) {
  const {
    estimates,
    pagination,
    isServerPaginated,
  } = await getPipelineEstimatesData({
    requestedPage,
    requestedPageSize,
  });

  return (
    <section className="w-full">
      <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
        Estimates
      </h2>

      <EstimatesTable
        estimates={estimates}
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        serverPaginated={isServerPaginated}
      />
    </section>
  );
}

// ============================================
// SECTION DIVIDER
// ============================================

function SectionDivider() {
  return (
    <div className="my-8 flex w-full items-center">
      <div className="h-[4px] w-8 shrink-0 rounded-full bg-black" />

      <div className="h-[4px] flex-1 rounded-full bg-[#eeeeee]" />
    </div>
  );
}

// ============================================
// SALESPERSON PIPELINE PAGE
// ============================================

export default async function SalespersonPipelinePage({
  searchParams,
}) {
  // ============================================
  // AUTHENTICATION & ROLE VALIDATION
  // ============================================

  const authenticatedUser = await getAuthenticatedUser();

  if (!authenticatedUser) {
    redirect("/login");
  }

  if (authenticatedUser.role === "ADMIN") {
    redirect("/admin/pipeline");
  }

  if (authenticatedUser.role !== "SALESPERSON") {
    redirect("/login");
  }

  // ============================================
  // SEARCH PARAMS
  // ============================================

  const params = (await searchParams) || {};

  // ============================================
  // FILTER
  // ============================================

  const requestedFilter =
    typeof params.filter === "string"
      ? params.filter
      : "ALL";

  // ============================================
  // PAGINATION
  // ============================================

  const requestedPage =
    typeof params.page === "string"
      ? params.page
      : "1";

  const requestedPageSize =
    typeof params.pageSize === "string"
      ? params.pageSize
      : "10";

  // ============================================
  // FETCH FILTER OPTIONS
  // ============================================

  const {
    users,
    selectedFilter,
  } = await getPipelinePageData({
    requestedFilter,
  });

  // ============================================
  // SUSPENSE KEYS
  // ============================================

  const followUpsKey = selectedFilter;

  const estimatesKey = [
    requestedPage,
    requestedPageSize,
  ].join("-");

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="w-full">
      {/* BREADCRUMBS */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/salesperson",
          },
        ]}
        currentPage="In The Pipeline"
      />

      {/* PIPELINE FILTER */}

      <PipelineFilter
        users={users}
        selectedFilter={selectedFilter}
      />

      {/* FOLLOW-UPS */}

      <Suspense
        key={followUpsKey}
        fallback={
          <section className="mt-7 w-full">
            <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
              Follow-ups
            </h2>

            <TableSkeleton rows={5} columns={5} />
          </section>
        }
      >
        <PipelineFollowUpsSection
          selectedFilter={selectedFilter}
          currentUserId={authenticatedUser.id}
        />
      </Suspense>

      <SectionDivider />

      {/* ESTIMATES */}

      <Suspense
        key={estimatesKey}
        fallback={
          <section className="w-full">
            <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
              Estimates
            </h2>

            <TableSkeleton rows={10} columns={5} />
          </section>
        }
      >
        <PipelineEstimatesSection
          requestedPage={requestedPage}
          requestedPageSize={requestedPageSize}
        />
      </Suspense>

      <SectionDivider />

      {/* PAGE TAGLINE */}

      <PageTagline>
        Drive thy business, or it will drive thee. 
      </PageTagline>
    </div>
  );
}
