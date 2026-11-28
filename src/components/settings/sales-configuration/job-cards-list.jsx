
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import JobCard from "@/components/settings/sales-configuration/job-card";
import TablePagination from "@/components/dashboard/table-pagination";
import Tabs from "@/components/ui/tabs";

export default function JobCardsList({
  jobs = [],
  salesmen = [],
  activeTab = "all",
  tabCounts = {},
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

  function handleTabChange(tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handlePageChange(page) {
    updatePagination(page, pageSize);
  }

  function handlePageSizeChange(size) {
    updatePagination(1, size);
  }

  // Job Cards
  const jobCards = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => (
        <JobCard
          key={job.serviceTitanJobId}
          job={job}
          salesmen={salesmen}
        />
      ))}
    </div>
  );

  // Configuration Tabs
  const tabs = [
    {
      id: "auto-assigned",
      label: "Auto Assigned",
      count: tabCounts["auto-assigned"] ?? 0,
    },
    {
      id: "source-assigned",
      label: "Source Assigned",
      count: tabCounts["source-assigned"] ?? 0,
    },
    {
      id: "salesman-assigned",
      label: "Salesman Assigned",
      count: tabCounts["salesman-assigned"] ?? 0,
    },
    {
      id: "unassigned",
      label: "Unassigned",
      count: tabCounts.unassigned ?? 0,
    },
    { id: "all", label: "All", count: tabCounts.all ?? 0 },
  ];

  const panels = {
    "auto-assigned": jobCards,
    "source-assigned": jobCards,
    "salesman-assigned": jobCards,
    unassigned: jobCards,
    all: jobCards,
  };

  return (
    <div className="space-y-5">
      {/* Tabs & Job Cards */}
      <Tabs
        tabs={tabs}
        defaultTab="all"
        selectedTab={activeTab}
        onTabChange={handleTabChange}
        countLabel="Jobs"
        panels={panels}
      />

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
