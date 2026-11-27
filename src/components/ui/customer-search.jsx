"use client";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/ui/input";

import {
  getCustomersCache,
  searchCustomers,
  subscribeToCustomerCache,
} from "@/lib/cache/servicetitan/customer-cache";

const PAGE_SIZE = 50;

export default function CustomerSearch({ value = "", onChange, onSelect }) {
  const [allCustomers, setAllCustomers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const [error, setError] = useState("");
  const [cacheReady, setCacheReady] = useState(false);

  const wrapperRef = useRef(null);
  const cacheRevisionRef = useRef(0);

  const searchTerm = String(value || "").trim();

  // =========================================
  // LOAD CACHE + SUBSCRIBE TO CACHE UPDATES
  // =========================================
  useEffect(() => {
    let active = true;

    async function loadCache() {
      const revisionAtStart = cacheRevisionRef.current;

      try {
        const cache = await getCustomersCache();

        if (!active) return;

        // Prevent an older IndexedDB read from overwriting
        // a newer cache subscription update.
        if (revisionAtStart !== cacheRevisionRef.current) {
          return;
        }

        if (cache && Array.isArray(cache.customers)) {
          setAllCustomers(cache.customers);
          setCacheReady(true);
          setError("");
        } else {
          setAllCustomers([]);
          setCacheReady(false);
        }
      } catch (error) {
        if (!active) return;

        console.error("Customer cache read failed:", error);

        setError("Unable to read the customer database.");
      }
    }

    const unsubscribe = subscribeToCustomerCache((cache) => {
      if (!active) return;

      cacheRevisionRef.current += 1;

      const nextCustomers = cache?.customers;

      if (!Array.isArray(nextCustomers)) {
        setAllCustomers([]);
        setCacheReady(false);
        setCustomers([]);
        setHasMore(false);
        return;
      }

      setAllCustomers(nextCustomers);
      setCacheReady(true);
      setError("");
    });

    loadCache();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // =========================================
  // LOCAL SEARCH
  // =========================================
  useEffect(() => {
    if (searchTerm.length < 2 || selected) {
      setCustomers([]);
      setHasMore(false);
      setLoading(false);
      setError("");
      return;
    }

    if (!cacheReady) {
      setCustomers([]);
      setHasMore(false);
      setLoading(true);
      return;
    }

    setLoading(true);

    const timeout = window.setTimeout(() => {
      const result = searchCustomers(allCustomers, searchTerm, page, PAGE_SIZE);

      setCustomers((previous) => {
        if (page === 1) {
          return result.customers;
        }

        const existingIds = new Set(previous.map((customer) => customer.id));

        const newCustomers = result.customers.filter(
          (customer) => !existingIds.has(customer.id),
        );

        return [...previous, ...newCustomers];
      });

      setHasMore(result.hasMore);
      setLoading(false);
      setError("");
    }, 100);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchTerm, page, selected, allCustomers, cacheReady]);

  // =========================================
  // RESET RESULTS WHEN SEARCH CHANGES
  // =========================================
  useEffect(() => {
    setPage(1);
    setCustomers([]);
    setHasMore(false);
  }, [searchTerm]);

  // =========================================
  // CLOSE DROPDOWN ON OUTSIDE CLICK
  // =========================================
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

  // =========================================
  // INPUT CHANGE
  // =========================================
  function handleInputChange(event) {
    setSelected(false);
    setPage(1);
    setCustomers([]);
    setHasMore(false);
    setError("");
    setOpen(true);

    onChange?.(event);
  }

  // =========================================
  // CUSTOMER SELECT
  // =========================================
  function handleSelect(customer) {
    const businessName =
      customer.businessName || customer.pocName || customer.name || "";

    setSelected(true);
    setOpen(false);
    setCustomers([]);
    setHasMore(false);
    setError("");

    onSelect?.({
      ...customer,
      businessName,
      pocName: "",
    });
  }

  // =========================================
  // LOAD MORE
  // =========================================
  function handleLoadMore() {
    if (!hasMore || loading) return;

    setPage((previous) => previous + 1);
  }

  // =========================================
  // CUSTOMER DISPLAY NAME
  // =========================================
  function getCustomerName(customer) {
    return (
      customer.businessName ||
      customer.pocName ||
      customer.name ||
      "Unnamed Customer"
    );
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
          {/* CACHE LOADING */}
          {!cacheReady && loading && (
            <div className="px-3 py-4 text-xs text-[#666666]">
              Preparing customer database...
            </div>
          )}

          {/* CACHE ERROR */}
          {!cacheReady && error && (
            <div className="px-3 py-4 text-xs text-red-600">{error}</div>
          )}

          {/* SEARCH RESULTS */}
          {cacheReady && customers.length > 0 && (
            <>
              {customers.map((customer, index) => (
                <button
                  key={customer.id ?? `${customer.businessName}-${index}`}
                  type="button"
                  onClick={() => handleSelect(customer)}
                  className="flex w-full flex-col gap-1 border-b border-[#eeeeee] px-3 py-3 text-left transition-colors hover:bg-[#f7f7f7]"
                >
                  <span className="text-xs font-semibold text-[#111111]">
                    {getCustomerName(customer)}
                  </span>

                  <span className="text-[11px] text-[#666666]">
                    {customer.phone || "No phone"}
                    {customer.email ? ` · ${customer.email}` : ""}
                  </span>

                  {customer.location && (
                    <span className="text-[11px] text-[#888888]">
                      {customer.location}
                    </span>
                  )}
                </button>
              ))}

              {/* LOAD MORE */}
              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full px-3 py-3 text-xs font-medium text-[#333333] transition-colors hover:bg-[#f7f7f7] disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load more customers"}
                </button>
              )}
            </>
          )}

          {/* LOADING MORE */}
          {cacheReady && customers.length > 0 && loading && (
            <div className="px-3 py-2 text-center text-[11px] text-[#666666]">
              Loading more customers...
            </div>
          )}

          {/* NO RESULTS */}
          {cacheReady && customers.length === 0 && !loading && (
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
