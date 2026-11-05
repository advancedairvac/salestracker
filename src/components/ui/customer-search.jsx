
"use client";

import { useEffect, useState, useTransition } from "react";

import { searchCustomers } from "@/app/admin/opportunities/new/actions";

export default function CustomerSearch({
  onSelect,
  onClear,
}) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (selectedCustomer || query.trim().length < 2) {
      setCustomers([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const results = await searchCustomers(query.trim());
          setCustomers(results || []);
          setIsOpen(true);
        } catch (error) {
          console.error("Customer search failed:", error);
          setCustomers([]);
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedCustomer]);

  function handleSelect(customer) {
    setSelectedCustomer(customer);
    setQuery(customer.businessName);
    setCustomers([]);
    setIsOpen(false);

    onSelect?.(customer);
  }

  function handleClear() {
    setSelectedCustomer(null);
    setQuery("");
    setCustomers([]);
    setIsOpen(false);

    onClear?.();
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedCustomer(null);
            onClear?.();
          }}
          onFocus={() => {
            if (customers.length > 0 && !selectedCustomer) {
              setIsOpen(true);
            }
          }}
          placeholder="Search by Business Name or POC Name"
          autoComplete="off"
          className="h-[42px] w-full border border-[#d9d9d9] bg-white px-[10px] pr-10 text-[11px] text-black outline-none transition-colors placeholder:text-[#777] focus:border-black"
        />

        {isPending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#777]">
            Searching...
          </span>
        )}

        {!isPending && selectedCustomer && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear selected customer"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#777] hover:text-black"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && !selectedCustomer && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto border border-[#dedede] bg-white shadow-lg">
          {customers.length > 0 ? (
            customers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => handleSelect(customer)}
                className="flex w-full flex-col gap-1 border-b border-[#eee] px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-[#f7f7f7]"
              >
                <span className="text-[11px] font-semibold text-black">
                  {customer.businessName}
                </span>

                <span className="text-[10px] text-[#777]">
                  {customer.pocName || "No POC Name"}
                </span>

                <span className="text-[10px] text-[#999]">
                  {[customer.email, customer.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-[11px] text-[#777]">
              No existing customer found. You can create a new customer.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
