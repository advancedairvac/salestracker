"use client";

// ============================================
// PAGE NUMBERS
// ============================================

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "...",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

// ============================================
// TABLE PAGINATION
// ============================================

export default function TablePagination({
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
}) {
  // ============================================
  // PAGINATION CALCULATIONS
  // ============================================

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const endItem = Math.min(currentPage * pageSize, totalItems);

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col gap-4 border-t border-[#d9d9d9] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      {/* ITEMS PER PAGE */}

      <div className="flex items-center gap-2 text-sm text-neutral-700">
        <label htmlFor="table-page-size" className="whitespace-nowrap">
          Items per page:
        </label>

        <select
          id="table-page-size"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-9 border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none transition-colors focus:border-black"
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* PAGE INFORMATION AND NAVIGATION */}

      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        {/* ITEM RANGE */}

        <p className="whitespace-nowrap text-xs text-neutral-500 sm:text-sm">
          {startItem}–{endItem} of {totalItems}
        </p>

        {/* PAGE NAVIGATION */}

        <div className="flex items-center gap-1">
          {/* PREVIOUS */}

          <button
            type="button"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex size-9 items-center justify-center border border-neutral-300 text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          {/* PAGE NUMBERS */}

          {pageNumbers.map((page, index) =>
            page === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="flex size-9 items-center justify-center text-sm text-neutral-500"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
                onClick={() => onPageChange(page)}
                className={`flex size-9 items-center justify-center border text-sm transition-colors ${
                  currentPage === page
                    ? "border-black bg-black font-semibold text-white"
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {page}
              </button>
            ),
          )}

          {/* NEXT */}

          <button
            type="button"
            aria-label="Next page"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex size-9 items-center justify-center border border-neutral-300 text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
