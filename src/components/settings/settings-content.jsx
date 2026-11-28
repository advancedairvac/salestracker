
"use client";

import { useEffect, useState } from "react";
import SvgIcon from "@/components/icons/svg-icons";
import CacheCard from "./cache-card";

import {
  getCustomerCacheMetadata,
  getCustomerCacheStatus,
  subscribeToCustomerCacheStatus,
  resetCustomerCache,
} from "@/lib/cache/servicetitan/customer-cache";
import {
  getAdminCacheMetadata,
  resetPostgresCache,
  resetServiceTitanCache,
} from "@/lib/cache/admin-cache-client";
import { invalidateRevenueSummaryCache } from "@/lib/cache/servicetitan/revenue-summary-cache";

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

        <SvgIcon
          name="chevronDown"
          className={`h-6 w-6 shrink-0 text-[#555] transition-transform duration-200 ease-in-out ${
            isOpen ? "rotate-180" : ""
          }`}
        />
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

export default function SettingsContent({ role = "ADMIN" }) {
  const canManageCache = role === "ADMIN";
  const [customerMetadata, setCustomerMetadata] = useState(null);
  const [customerStatus, setCustomerStatus] = useState("idle");
  const [estimatesStatus, setEstimatesStatus] = useState("idle");
  const [serviceTitanMetadata, setServiceTitanMetadata] = useState(null);
  const [jobsStatus, setJobsStatus] = useState("idle");
  const [databaseMetadata, setDatabaseMetadata] = useState(null);
  const [databaseStatus, setDatabaseStatus] = useState("idle");

  // --------------------------------------------
  // LOAD CUSTOMER CACHE INFORMATION
  // --------------------------------------------

  const loadCustomerMetadata = async () => {
    const metadata = await getCustomerCacheMetadata();
    setCustomerMetadata(metadata);
  };

  const loadServerMetadata = async () => {
    const result = await getAdminCacheMetadata();
    setServiceTitanMetadata(result.serviceTitan);
    setDatabaseMetadata(result.database);
    setEstimatesStatus(result.serviceTitan?.estimates?.status || "idle");
    setJobsStatus(result.serviceTitan?.jobs?.status || "idle");
    setDatabaseStatus(result.database?.status || "idle");
  };

  // --------------------------------------------
  // CUSTOMER CACHE SUBSCRIPTION
  // --------------------------------------------

  useEffect(() => {
    if (!canManageCache) return undefined;

    let mounted = true;

    const initialize = async () => {
      try {
        const customer = await getCustomerCacheMetadata();
        const server = await getAdminCacheMetadata();

        if (!mounted) return;

        setCustomerMetadata(customer);
        setCustomerStatus(getCustomerCacheStatus().status);
        setServiceTitanMetadata(server.serviceTitan);
        setDatabaseMetadata(server.database);
        setEstimatesStatus(server.serviceTitan?.estimates?.status || "idle");
        setJobsStatus(server.serviceTitan?.jobs?.status || "idle");
        setDatabaseStatus(server.database?.status || "idle");
      } catch (error) {
        console.error("Failed to load cache information:", error);
      }
    };

    const updateCustomerStatus = ({ status }) => {
      if (!mounted) return;

      setCustomerStatus(status);

      if (status === "available") {
        loadCustomerMetadata().catch(console.error);
      }
    };

    const unsubscribeCustomer = subscribeToCustomerCacheStatus(updateCustomerStatus);

    initialize();

    return () => {
      mounted = false;
      unsubscribeCustomer?.();
    };
  }, [canManageCache]);

  // --------------------------------------------
  // RESET CUSTOMER CACHE
  // --------------------------------------------

  const handleCustomerCacheReset = async () => {
    try {
      setCustomerStatus("refreshing");
      const refreshed = await resetCustomerCache();
      if (!refreshed) throw new Error("Customer cache refresh failed.");
      await loadCustomerMetadata();
      setCustomerStatus("available");
    } catch (error) {
      console.error("Customer cache reset failed:", error);
      setCustomerStatus("error");
      throw error;
    }
  };

  const handleEstimatesCacheReset = async () => {
    try {
      setEstimatesStatus("refreshing");
      const result = await resetServiceTitanCache("estimates");
      const refreshedAt = new Date().toISOString();

      setServiceTitanMetadata((previous) => ({
        ...previous,
        estimates: {
          ...result.estimatesCache,
          updatedAt: refreshedAt,
          storage: "Server memory",
        },
      }));
      setEstimatesStatus("available");
    } catch (error) {
      console.error("Estimates cache reset failed:", error);
      setEstimatesStatus("error");
      throw error;
    }
  };

  const handleJobsCacheReset = async () => {
    try {
      setJobsStatus("refreshing");
      await resetServiceTitanCache("jobs");
      await invalidateRevenueSummaryCache();
      await loadServerMetadata();
      setJobsStatus("available");
    } catch (error) {
      console.error("Jobs cache reset failed:", error);
      setJobsStatus("error");
      throw error;
    }
  };

  const handleDatabaseCacheReset = async () => {
    try {
      setDatabaseStatus("refreshing");
      await resetPostgresCache();
      await loadServerMetadata();
    } catch (error) {
      console.error("PostgreSQL cache reset failed:", error);
      setDatabaseStatus("error");
      throw error;
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

        {canManageCache && (
          <SettingsAccordion
            title="Cache Management"
            description="View, reset, and refresh cached ServiceTitan and PostgreSQL data."
          >
          <div className="space-y-5">

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
                description="ServiceTitan job results used by dashboard and revenue views."
                status={jobsStatus}
                updatedAt={serviceTitanMetadata?.jobs?.updatedAt}
                totalCount={serviceTitanMetadata?.jobs?.totalCount}
                syncDurationMs={serviceTitanMetadata?.jobs?.syncDurationMs}
                storage="Server memory"
                onRefresh={handleJobsCacheReset}
              />

              {/* ESTIMATES CACHE */}

              <CacheCard
                title="Estimates Cache"
                description="Estimate records used by pipeline and follow-up views."
                status={estimatesStatus}
                updatedAt={
                  serviceTitanMetadata?.estimates?.updatedAt
                }
                totalCount={serviceTitanMetadata?.estimates?.totalCount}
                syncDurationMs={serviceTitanMetadata?.estimates?.syncDurationMs}
                storage="Server memory"
                onRefresh={handleEstimatesCacheReset}
              />

              {/* POSTGRESQL CACHE */}

              <CacheCard
                title="PostgreSQL Cache"
                description="Cached database reads for dashboards, lists, and reports. Writes invalidate affected cached results."
                status={databaseStatus}
                updatedAt={databaseMetadata?.updatedAt}
                totalCount={databaseMetadata?.totalCount}
                syncDurationMs={databaseMetadata?.syncDurationMs}
                storage="Server memory"
                onRefresh={handleDatabaseCacheReset}
                actionLabel="Reset PostgreSQL Cache"
              />
            </div>

            {/* CACHE INFORMATION */}

            <div className="border border-[#e5e5e5] bg-[#fafafa] p-4">
              <h4 className="text-sm font-bold text-black">
                Cache Information
              </h4>

              <p className="mt-2 text-sm leading-relaxed text-[#777]">
                Customer searches and revenue summaries refresh in the
                background. A completed refresh replaces saved data only after
                the full fetch succeeds; a failure keeps the last complete
                copy. PostgreSQL query results stay in server memory briefly
                and clear automatically after a database write.
              </p>
            </div>
          </div>
          </SettingsAccordion>
        )}

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
