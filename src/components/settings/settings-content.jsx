
"use client";

import { useEffect, useState } from "react";
import CacheCard from "./cache-card";

import {
  getCustomerCacheMetadata,
  getCustomerCacheStatus,
  subscribeToCustomerCacheStatus,
  resetCustomerCache,
} from "@/lib/cache/servicetitan/customer-cache";

// ============================================
// ACCORDION COMPONENT
// ============================================

function SettingsAccordion({ title, description, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="border-t border-[#e5e5e5] last:border-b">
      {/* DROPDOWN HEADER */}

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-bold uppercase tracking-wide text-black">
            {title}
          </h3>

          <p className="text-sm leading-relaxed text-[#777]">
            {description}
          </p>
        </div>

        {/* ARROW */}

        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`h-6 w-6 shrink-0 text-[#555] transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        >
          <path
            d="M9 5L16 12L9 19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* DROPDOWN CONTENT */}

      {isOpen && <div className="pb-5">{children}</div>}
    </section>
  );
}

// ============================================
// FOLLOW-UP CARD
// ============================================

function FollowUpCard({ title, description }) {
  return (
    <div className="border border-[#e5e5e5] bg-white p-4">
      <p className="text-xs font-medium uppercase text-[#777]">
        {title}
      </p>

      <p className="mt-2 text-base font-bold text-black">
        {description}
      </p>
    </div>
  );
}

// ============================================
// SETTINGS CONTENT
// ============================================

export default function SettingsContent() {
  const [customerMetadata, setCustomerMetadata] = useState(null);
  const [customerStatus, setCustomerStatus] = useState("idle");
  const [isResetting, setIsResetting] = useState(false);

  // --------------------------------------------
  // LOAD CUSTOMER CACHE INFORMATION
  // --------------------------------------------

  const loadCustomerMetadata = async () => {
    const metadata = await getCustomerCacheMetadata();
    setCustomerMetadata(metadata);
  };

  // --------------------------------------------
  // CUSTOMER CACHE SUBSCRIPTION
  // --------------------------------------------

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const metadata = await getCustomerCacheMetadata();
        const status = getCustomerCacheStatus();

        if (!mounted) return;

        setCustomerMetadata(metadata);
        setCustomerStatus(status);
      } catch (error) {
        console.error("Failed to load cache information:", error);
      }
    };

    initialize();

    const unsubscribe = subscribeToCustomerCacheStatus((status) => {
      if (!mounted) return;

      setCustomerStatus(status);

      if (status === "available") {
        loadCustomerMetadata().catch(console.error);
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  // --------------------------------------------
  // RESET CUSTOMER CACHE
  // --------------------------------------------

  const handleCustomerCacheReset = async () => {
    if (isResetting) return;

    try {
      setIsResetting(true);
      setCustomerStatus("refreshing");

      await resetCustomerCache();

      await loadCustomerMetadata();

      setCustomerStatus("available");
    } catch (error) {
      console.error("Customer cache reset failed:", error);
      setCustomerStatus("error");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* ========================================
          GENERAL SETTINGS
      ======================================== */}

      <section className="w-full space-y-3">
        {/* SECTION HEADING */}

        <div className="space-y-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-black">
            General Settings
          </h2>

          <p className="text-sm text-[#777]">
            Configure common application settings and preferences.
          </p>
        </div>

        {/* ========================================
            FOLLOW-UP SETTINGS
        ======================================== */}

        <SettingsAccordion
          title="Follow-up Settings"
          description="Configure automatic follow-up reminders for estimates."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FollowUpCard
              title="First Follow-up"
              description="24 Hours"
            />

            <FollowUpCard
              title="Second Follow-up"
              description="3 Days"
            />

            <FollowUpCard
              title="Third Follow-up"
              description="1 Week"
            />
          </div>
        </SettingsAccordion>

        {/* ========================================
            SERVICETITAN INTEGRATION
        ======================================== */}

        <SettingsAccordion
          title="ServiceTitan Integration"
          description="Manage your ServiceTitan connection and integration preferences."
        >
          <div className="border border-[#e5e5e5] bg-white px-4">
            {["Customers", "Estimates", "Jobs"].map((item, index) => (
              <div
                key={item}
                className={`flex items-center justify-between gap-3 py-4 ${
                  index !== 2 ? "border-b border-[#e5e5e5]" : ""
                }`}
              >
                <span className="text-sm font-medium text-neutral-800">
                  {item}
                </span>

                <span className="text-xs text-[#777]">
                  ServiceTitan
                </span>
              </div>
            ))}
          </div>
        </SettingsAccordion>

        {/* ========================================
            CACHE MANAGEMENT - SEPARATE DROPDOWN
        ======================================== */}

        <SettingsAccordion
          title="Cache Management"
          description="View, reset, and refresh locally stored application data."
        >
          <div className="space-y-5">
            {/* SECTION HEADER */}

            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wide text-black">
                Local Cache
              </h3>

              <p className="text-sm leading-relaxed text-[#777]">
                Manage locally cached data used to improve application
                performance and reduce unnecessary API requests.
              </p>
            </div>

            {/* CACHE CARDS */}

            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {/* CUSTOMER CACHE */}

              <CacheCard
                title="Customer Cache"
                description="Customer records stored locally for customer search and opportunity creation."
                status={customerStatus}
                updatedAt={
                  customerMetadata?.updatedAt ||
                  customerMetadata?.syncedAt
                }
                totalCount={customerMetadata?.totalCount}
                syncDurationMs={customerMetadata?.syncDurationMs}
                storage="IndexedDB"
                onRefresh={handleCustomerCacheReset}
              />

              {/* JOBS CACHE */}

              <CacheCard
                title="Jobs Cache"
                description="Locally stored job records for faster access and lookup."
                status="idle"
                storage="IndexedDB"
                placeholder
              />

              {/* ESTIMATES CACHE */}

              <CacheCard
                title="Estimates Cache"
                description="Locally stored estimate records for sales and follow-up workflows."
                status="idle"
                storage="IndexedDB"
                placeholder
              />
            </div>

            {/* CACHE INFORMATION */}

            <div className="border border-[#e5e5e5] bg-[#fafafa] p-4">
              <h4 className="text-sm font-bold text-black">
                Cache Information
              </h4>

              <p className="mt-2 text-sm leading-relaxed text-[#777]">
                Customer data is stored locally in IndexedDB and
                refreshed in the background. The application uses this
                local data to provide faster search and a smoother
                experience without waiting for API requests.
              </p>
            </div>
          </div>
        </SettingsAccordion>

        {/* ========================================
            NOTIFICATIONS
        ======================================== */}

        <SettingsAccordion
          title="Notifications"
          description="Manage system notifications and sales team alerts."
        >
          <div className="border border-[#e5e5e5] bg-white p-4">
            <p className="text-sm leading-relaxed text-[#777]">
              Notification preferences will be available here.
            </p>
          </div>
        </SettingsAccordion>
      </section>
    </div>
  );
}
