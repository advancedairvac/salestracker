"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import TablePagination from "@/components/dashboard/table-pagination";

// ============================================
// HELPERS
// ============================================

function formatCurrency(amount, currency = "$") {
  return `${currency}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)}`;
}

function formatDueDate(date) {
  const value = new Date(date);

  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(value);

  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(value);

  const day = value.getDate();

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);

  return `${weekday} / ${month} ${day}\n${time}`;
}

function getFollowUpStatus(dueAt) {
  const due = new Date(dueAt);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return "Next Week";

  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const followingMonthStart = new Date(
    today.getFullYear(),
    today.getMonth() + 2,
    1,
  );

  if (dueDate >= nextMonthStart && dueDate < followingMonthStart) {
    return "Next Month";
  }

  if (dueDate >= followingMonthStart) {
    return "Beyond";
  }

  return "Next Month";
}

function formatType(type) {
  if (!type) return "—";

  const labels = {
    CALL: "Call",
    EMAIL: "Email",
    TEXT: "Text",
    MEETING: "Meeting",
    OTHER: "Other",
  };

  return labels[type] || type;
}

// ============================================
// FOLLOW-UPS TABLE
// ============================================

export default function FollowUpsTable({
  followUps = [],
  currency = "$",
  className = "",
  showSalesman = true,
}) {
  // ============================================
  // PAGINATION STATE
  // ============================================

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = followUps.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  useEffect(() => {
    if (currentPage > Math.max(1, totalPages)) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  function handlePageSizeChange(size) {
    setPageSize(size);
    setCurrentPage(1);
  }

  // ============================================
  // PAGINATED DATA
  // ============================================

  const paginatedFollowUps = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return followUps.slice(startIndex, startIndex + pageSize);
  }, [followUps, currentPage, pageSize]);

  // ============================================
  // RENDER
  // ============================================

  const columnCount = showSalesman ? 6 : 5;

  return (
    <section className={`w-full ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[650px] border-collapse text-left">
          <thead>
            <tr className="bg-[#d9d9d9]">
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Date
              </th>

              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Customer/Opp.
              </th>

              {showSalesman && (
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-black sm:text-xs">
                  Salesman
                </th>
              )}

              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Status
              </th>

              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Type
              </th>

              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Comm. Est.
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedFollowUps.length > 0 ? (
              paginatedFollowUps.map((followUp) => {
                const opportunity = followUp.opportunity;
                const customer = opportunity?.customer;

                const customerName =
                  customer?.businessName?.trim() ||
                  customer?.pocName?.trim() ||
                  "—";

                const jobType = opportunity?.jobType?.trim();

                const salesman = followUp.assignedTo;

                return (
                  <tr
                    key={followUp.id}
                    className="border-b border-[#d9d9d9] transition-colors hover:bg-[#f8f8f8]"
                  >
                    {/* DATE */}

                    <td className="whitespace-pre-line px-3 py-2 text-xs leading-tight text-[#333] lg:text-sm">
                      {formatDueDate(followUp.dueAt)}
                    </td>

                    {/* CUSTOMER / OPPORTUNITY */}

                    <td className="px-3 py-2 text-xs leading-tight text-black lg:text-sm">
                      {opportunity?.id ? (
                        <Link
                          href={`/admin/opportunities/${opportunity.id}`}
                          className="underline underline-offset-2"
                        >
                          <span className="font-bold">{customerName}</span>

                          <br />

                          <span className="font-normal">{jobType || "—"}</span>
                        </Link>
                      ) : (
                        customerName
                      )}
                    </td>

                    {/* SALESMAN */}

                    {showSalesman && (
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-black lg:text-sm">
                        {salesman?.id ? (
                          <Link
                            href={`/admin/salesmen/${salesman.id}`}
                            className="underline underline-offset-2"
                          >
                            {salesman.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}

                    {/* STATUS */}

                    <td className="whitespace-nowrap px-3 py-2 text-xs text-black lg:text-sm">
                      {getFollowUpStatus(followUp.dueAt)}
                    </td>

                    {/* TYPE */}

                    <td className="whitespace-nowrap px-3 py-2 text-xs text-black lg:text-sm">
                      {formatType(followUp.type)}
                    </td>

                    {/* COMMISSION ESTIMATE */}

                    <td className="whitespace-nowrap px-3 py-2 text-xs text-black lg:text-sm">
                      {formatCurrency(
                        followUp.commissionEstimate || 0,
                        currency,
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-3 py-8 text-center text-xs text-[#777]"
                >
                  No follow-ups found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}

      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />
    </section>
  );
}
