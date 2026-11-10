
"use client";

import { useState } from "react";

import JobCard from "@/components/settings/sales-configuration/job-card";
import TablePagination from "@/components/dashboard/table-pagination";

export default function JobCardsList({ jobs, salesmen }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = jobs.length;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const currentJobs = jobs.slice(startIndex, endIndex);

  function handlePageChange(page) {
    setCurrentPage(page);
  }

  function handlePageSizeChange(size) {
    setPageSize(size);
    setCurrentPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Job Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {currentJobs.map((job) => (
          <JobCard
            key={job.serviceTitanJobId}
            job={job}
            salesmen={salesmen}
          />
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
