"use client";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/ui/input";

export default function CustomerSearch({ value = "", onChange, onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const [error, setError] = useState("");

  const wrapperRef = useRef(null);

  const searchTerm = value.trim();

  // Search ServiceTitan customers.
  useEffect(() => {
    if (searchTerm.length < 2 || selected) {
      setCustomers([]);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    const isFirstPage = page === 1;

    const timeout = setTimeout(async () => {
      try {
        if (isFirstPage) {
          setLoading(true);
          setCustomers([]);
        } else {
          setLoadingMore(true);
        }

        setError("");

        const params = new URLSearchParams({
          search: searchTerm,
          page: String(page),
          pageSize: "50",
        });

        const response = await fetch(
          `/api/servicetitan/customers?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to search customers.");
        }

        const fetchedCustomers = result.customers || [];

        setCustomers((previous) =>
          isFirstPage ? fetchedCustomers : [...previous, ...fetchedCustomers],
        );

        setHasMore(Boolean(result.hasMore));
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Customer search error:", error);
          setError(error.message || "Unable to search customers.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchTerm, page, selected]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Handle Business Name input.
  function handleInputChange(event) {
    setSelected(false);
    setPage(1);
    setOpen(true);
    onChange(event);
  }

  // Select customer and use customer name as Business Name.
  function handleSelect(customer) {
    const businessName =
      customer.businessName || customer.pocName || customer.name || "";

    setSelected(true);
    setOpen(false);
    setHasMore(false);

    onSelect({
      ...customer,
      businessName,
      // Do not automatically use the customer name as POC.
      pocName: "",
    });
  }

  // Load more customers.
  function handleLoadMore() {
    if (!loadingMore && hasMore) {
      setPage((previous) => previous + 1);
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        name="businessName"
        label="Business Name"
        value={value}
        onChange={handleInputChange}
        autoComplete="off"
      />

      {open && !selected && searchTerm.length >= 2 && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-[320px] w-full overflow-y-auto border border-[#d9d9d9] bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-4 text-xs text-[#666666]">
              Searching customers...
            </div>
          ) : error ? (
            <div className="px-3 py-4 text-xs text-red-600">{error}</div>
          ) : customers.length > 0 ? (
            <>
              {customers.map((customer) => {
                const customerName =
                  customer.businessName ||
                  customer.pocName ||
                  customer.name ||
                  "Unnamed Customer";

                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelect(customer)}
                    className="flex w-full flex-col gap-1 border-b border-[#eeeeee] px-3 py-3 text-left transition-colors hover:bg-[#f7f7f7]"
                  >
                    {/* CUSTOMER / BUSINESS NAME */}
                    <span className="text-xs font-semibold text-[#111111]">
                      {customerName}
                    </span>

                    {/* CONTACT DETAILS */}
                    <span className="text-[11px] text-[#666666]">
                      {customer.phone || "No phone"}
                      {customer.email ? ` · ${customer.email}` : ""}
                    </span>

                    {/* LOCATION */}
                    {customer.location && (
                      <span className="text-[11px] text-[#888888]">
                        {customer.location}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* LOAD MORE */}
              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full px-3 py-3 text-xs font-medium text-[#333333] transition-colors hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load more customers"}
                </button>
              )}
            </>
          ) : (
            <div className="px-3 py-4 text-xs text-[#666666]">
              No matching customers found. You can enter the business name
              manually.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
