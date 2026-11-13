import { getPipelineData } from "@/lib/dashboard/pipeline-data";

import PageTagline from "@/components/ui/page-tagline";
import Breadcrumbs from "@/components/ui/breadcrumbs";

import PipelineFilter from "@/components/dashboard/pipeline-filter";
import FollowUpsTable from "@/components/dashboard/followUps-table";
import EstimatesTable from "@/components/dashboard/estimates-table";

export const metadata = {
  title: "In The Pipeline",
};

export const dynamic = "force-dynamic";

// ============================================
// PIPELINE PAGE
// ============================================

export default async function PipelinePage({ searchParams }) {
  const params = await searchParams;

  const requestedFilter =
    typeof params?.filter === "string" ? params.filter : "ALL";

  const requestedPage = typeof params?.page === "string" ? params.page : 1;

  const requestedPageSize =
    typeof params?.pageSize === "string" ? params.pageSize : 10;

  // ============================================
  // FETCH PIPELINE DATA
  // ============================================

  const {
    users,
    selectedFilter,
    followUpData,
    estimates,
    pagination,
    isServerPaginated,
  } = await getPipelineData({
    requestedFilter,
    requestedPage,
    requestedPageSize,
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="w-full">
      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
        ]}
        currentPage="In The Pipeline"
      />

      <PipelineFilter users={users} selectedFilter={selectedFilter} />

      {/* Follow-ups */}

      <section className="mt-7 w-full">
        <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
          Follow-ups
        </h2>

        <FollowUpsTable followUps={followUpData} />
      </section>

      <div className="my-8 flex w-full items-center">
        <div className="h-[4px] w-8 shrink-0 rounded-full bg-black" />
        <div className="h-[4px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      {/* ServiceTitan Estimates */}

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

      <div className="my-8 flex w-full items-center">
        <div className="h-[4px] w-8 shrink-0 rounded-full bg-black" />
        <div className="h-[4px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      <PageTagline>Drive thy business, or it will drive thee.</PageTagline>
    </div>
  );
}
