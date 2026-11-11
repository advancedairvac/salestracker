import { getPipelineData } from "@/lib/dashboard/pipeline-data";

import PageTagline from "@/components/ui/page-tagline";
import Breadcrumbs from "@/components/ui/breadcrumbs";

import PipelineFilter from "@/components/dashboard/pipeline-filter";
import FollowUpsTable from "@/components/dashboard/followUps-table";
import EstimatesTable from "@/components/dashboard/estimates-table";

export const metadata = {
  title: "In The Pipeline",
};

// ============================================
// PIPELINE PAGE
// ============================================

export default async function PipelinePage({ searchParams }) {
  const params = await searchParams;

  const requestedFilter =
    typeof params?.filter === "string" ? params.filter : "ALL";

  // ============================================
  // FETCH PIPELINE DATA
  // ============================================

  const { users, selectedFilter, followUpData, estimates } =
    await getPipelineData({
      requestedFilter,
    });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="w-full">
      {/* Breadcrumb */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
        ]}
        currentPage="In The Pipeline"
      />

      {/* Pipeline Filter */}

      <PipelineFilter users={users} selectedFilter={selectedFilter} />

      {/* Follow-ups */}

      <section className="mt-7 w-full">
        <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
          Follow-ups
        </h2>

        <FollowUpsTable followUps={followUpData} />
      </section>

      {/* First Progress Separator */}

      <div className="my-8 flex w-full items-center">
        <div className="h-[4px] w-8 shrink-0 rounded-full bg-black" />
        <div className="h-[4px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      {/* ServiceTitan Estimates */}

      <section className="w-full">
        <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
          Estimates
        </h2>

        <EstimatesTable estimates={estimates} />
      </section>

      {/* Second Progress Separator */}

      <div className="my-8 flex w-full items-center">
        <div className="h-[4px] w-8 shrink-0 rounded-full bg-black" />
        <div className="h-[4px] flex-1 rounded-full bg-[#eeeeee]" />
      </div>

      {/* Page Tagline */}

      <PageTagline>Drive thy business, or it will drive thee.</PageTagline>
    </div>
  );
}
