"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import JobCard from "@/components/settings/sales-configuration/job-card";
import TablePagination from "@/components/dashboard/table-pagination";

export default function JobCardsList({
  jobs = [],
  salesmen = [],
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updatePagination(page, size) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("page", String(page));
    params.set("pageSize", String(size));

    router.push(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  function handlePageChange(page) {
    updatePagination(page, pageSize);
  }

  function handlePageSizeChange(size) {
    updatePagination(1, size);
  }

  return (
    <div className="space-y-4">
      {/* Job Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <JobCard key={job.serviceTitanJobId} job={job} salesmen={salesmen} />
        ))}
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
