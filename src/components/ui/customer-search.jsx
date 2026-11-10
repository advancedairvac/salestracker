"use client";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/ui/input";

export default function CustomerSearch({ value = "", onChange, onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);

  const wrapperRef = useRef(null);

  // Fetch customer data only once
  useEffect(() => {
    const controller = new AbortController();

    async function fetchCustomers() {
      try {
        setLoading(true);

        const response = await fetch(
          "/api/servicetitan/customers?page=1&pageSize=100",
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load customers.");
        }

        setCustomers(result.customers || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Customer loading error:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchCustomers();

    return () => controller.abort();
  }, []);

  // Close dropdown when clicking outside
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

  // Instant local search
  const searchTerm = value.trim().toLowerCase();

  const filteredCustomers =
    searchTerm.length >= 2
      ? customers
          .filter((customer) => {
            return (
              customer.pocName?.toLowerCase().includes(searchTerm) ||
              customer.phone?.toLowerCase().includes(searchTerm) ||
              customer.email?.toLowerCase().includes(searchTerm)
            );
          })
          .slice(0, 10)
      : [];

  function handleInputChange(event) {
    setSelected(false);
    onChange(event);
    setOpen(true);
  }

  function handleSelect(customer) {
    setSelected(true);
    setOpen(false);
    onSelect(customer);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        name="pocName"
        label="POC Name"
        value={value}
        onChange={handleInputChange}
        autoComplete="off"
        required
      />

      {open && !selected && searchTerm.length >= 2 && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-[280px] w-full overflow-y-auto border border-[#d9d9d9] bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-4 text-xs text-[#666666]">
              Loading customers...
            </div>
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => handleSelect(customer)}
                className="flex w-full flex-col gap-1 border-b border-[#eeeeee] px-3 py-3 text-left transition-colors hover:bg-[#f7f7f7]"
              >
                <span className="text-xs font-semibold text-[#111111]">
                  {customer.pocName}
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
            ))
          ) : (
            <div className="px-3 py-4 text-xs text-[#666666]">
              No matching customers found. You can enter the details manually.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
