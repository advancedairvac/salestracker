"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ResourceDataTab from "./resource-data-tab";

const tabs = [
  { id: "company", label: "Company Info", type: "company" },
  { id: "customers", label: "Customers", resource: "customers" },
  { id: "vendors", label: "Vendors", resource: "vendors" },
  { id: "items", label: "Items", resource: "items" },
  { id: "invoices", label: "Invoices", resource: "invoices" },
  { id: "estimates", label: "Estimates", resource: "estimates" },
  { id: "salesreceipts", label: "Sales Receipts", resource: "salesreceipts" },
  { id: "payments", label: "Payments", resource: "payments" },
  { id: "bills", label: "Bills", resource: "bills" },
  { id: "purchases", label: "Purchases", resource: "purchases" },
  { id: "accounts", label: "Accounts", resource: "accounts" },
  { id: "employees", label: "Employees", resource: "employees" },
  { id: "creditmemos", label: "Credit Memos", resource: "creditmemos" },
  {
    id: "purchaseorders",
    label: "Purchase Orders",
    resource: "purchaseorders",
  },
  {
    id: "journalentries",
    label: "Journal Entries",
    resource: "journalentries",
  },
  { id: "taxcodes", label: "Tax Codes", resource: "taxcodes" },
];

const statusMessages = {
  connected: {
    title: "QuickBooks connected",
    message: "Authorization succeeded and the company API was verified.",
    style: "border-green-200 bg-green-50 text-green-800",
  },
  "connected-unverified": {
    title: "Authorization saved, verification incomplete",
    message:
      "The authorization was saved, but company information could not be verified. Refresh the company profile to check again.",
    style: "border-amber-200 bg-amber-50 text-amber-800",
  },
  "authorization-denied": {
    title: "Authorization cancelled",
    message: "QuickBooks access was denied or cancelled.",
    style: "border-amber-200 bg-amber-50 text-amber-800",
  },
  "invalid-state": {
    title: "Authorization could not be verified",
    message:
      "The OAuth state was missing or did not match. Please connect again.",
    style: "border-red-200 bg-red-50 text-red-800",
  },
  "missing-authorization-details": {
    title: "Authorization details missing",
    message: "QuickBooks did not return all required authorization details.",
    style: "border-red-200 bg-red-50 text-red-800",
  },
  "connection-failed": {
    title: "Connection failed",
    message: "The connection could not be completed. Check the server logs.",
    style: "border-red-200 bg-red-50 text-red-800",
  },
  disconnected: {
    title: "Local connection removed",
    message:
      "The local connection was removed. This does not necessarily revoke authorization at Intuit.",
    style: "border-amber-200 bg-amber-50 text-amber-800",
  },
};

function formatDate(value) {
  if (!value) return "Not provided";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleString();
}

function formatAddress(address) {
  if (!address) return null;

  return [
    address.Line1,
    address.Line2,
    address.Line3,
    address.City,
    address.CountrySubDivisionCode,
    address.PostalCode,
    address.Country,
  ]
    .filter(Boolean)
    .join(", ");
}

function InfoField({ label, value }) {
  const displayValue =
    value === null || value === undefined || value === ""
      ? "Not provided"
      : String(value);

  return (
    <div className="min-w-0 rounded-lg border border-black/10 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#0d0d0d]">
        {displayValue}
      </p>
    </div>
  );
}

function CompanyInfoTab() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  const searchParams = useSearchParams();

  const status = searchParams.get("qb_status");
  const statusInfo = statusMessages[status];

  const loadCompany = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/quickbooks/company", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 404) {
          setCompany(null);
          return;
        }

        throw new Error(data.message || "Unable to load company information.");
      }

      setCompany(data);
    } catch (err) {
      setError(err.message || "Company lookup failed.");
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  async function disconnectCompany() {
    if (!company?.realmId) {
      setError("Refresh the company profile before disconnecting.");
      return;
    }

    const confirmed = window.confirm(
      "Remove this QuickBooks connection from the local application? This action may not revoke authorization at Intuit.",
    );

    if (!confirmed) return;

    setDisconnecting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("realmId", company.realmId);

      const response = await fetch("/api/quickbooks/disconnect", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to disconnect QuickBooks.");
      }

      setCompany(null);

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("qb_status", "disconnected");

      window.history.replaceState({}, "", nextUrl);
    } catch (err) {
      setError(err.message || "Disconnect failed.");
    } finally {
      setDisconnecting(false);
    }
  }

  const profile = company?.company;

  const connected =
    company?.connected === true && company?.apiVerified === true;

  return (
    <section className="space-y-5">
      {statusInfo && (
        <div
          role="status"
          className={`rounded-lg border p-4 text-sm ${statusInfo.style}`}
        >
          <p className="font-semibold">{statusInfo.title}</p>
          <p className="mt-1">{statusInfo.message}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#0d0d0d]">
            QuickBooks Company Profile
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Connect a company, verify its profile, and inspect its API data.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/api/quickbooks/connect"
            className="inline-flex items-center rounded-lg bg-[#0690c8] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Connect QuickBooks
          </a>

          <button
            type="button"
            onClick={loadCompany}
            disabled={loading || disconnecting}
            className="rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-medium text-[#0d0d0d] disabled:opacity-50"
          >
            {loading ? "Checking..." : "Refresh Profile"}
          </button>

          {connected && (
            <button
              type="button"
              onClick={disconnectCompany}
              disabled={disconnecting || loading}
              className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">QuickBooks request failed</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {company && profile ? (
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#0d0d0d]">
                {profile.companyName || "Unnamed QuickBooks Company"}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {profile.legalName || "Legal name not provided"}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                connected
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {connected ? "Connected & Verified" : "Not verified"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Environment" value={company.environment} />
            <InfoField label="Realm ID" value={company.realmId} />
            <InfoField label="Country" value={profile.country} />
            <InfoField label="Email" value={profile.email} />
            <InfoField label="Phone" value={profile.phone} />
            <InfoField label="Website" value={profile.website} />

            <InfoField
              label="Company Address"
              value={formatAddress(profile.companyAddress)}
            />

            <InfoField
              label="Legal Address"
              value={formatAddress(profile.legalAddress)}
            />

            <InfoField
              label="Fiscal Year Starts"
              value={profile.fiscalYearStartMonth}
            />

            <InfoField
              label="Company Start Date"
              value={profile.companyStartDate}
            />

            <InfoField
              label="Supported Languages"
              value={profile.supportedLanguages}
            />

            <InfoField label="Time Zone" value={profile.timeZone} />

            <InfoField
              label="Connection Created"
              value={formatDate(company.connectedAt)}
            />

            <InfoField
              label="Last Connection Update"
              value={formatDate(company.lastUpdatedAt)}
            />

            <InfoField
              label="API Verification"
              value={company.apiVerified ? "Successful" : "Not verified"}
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Verify the company name and Realm ID with the client before
            inspecting business records. Disconnect behavior depends on the
            server route and whether Intuit authorization is revoked.
          </p>

          <details className="mt-5 border-t border-black/10 pt-4">
            <summary className="cursor-pointer text-sm font-medium">
              View API Response JSON
            </summary>

            <pre className="mt-3 max-h-[500px] overflow-auto rounded-lg bg-gray-950 p-4 text-xs leading-5 text-green-300">
              {JSON.stringify(company, null, 2)}
            </pre>
          </details>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-black/20 bg-white p-8 text-center">
          <h3 className="font-semibold text-[#0d0d0d]">
            {loading
              ? "Checking QuickBooks connection..."
              : "No verified QuickBooks company loaded"}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Connect QuickBooks or refresh the profile to check the current
            connection.
          </p>
        </div>
      )}
    </section>
  );
}

function QuickBooksTabsContent() {
  const [activeTab, setActiveTab] = useState("company");

  const currentTab = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border-b border-black/10">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-[#0690c8] text-[#0690c8]"
                  : "border-transparent text-gray-500 hover:text-[#0d0d0d]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {currentTab?.type === "company" ? (
        <CompanyInfoTab />
      ) : currentTab?.resource ? (
        <ResourceDataTab
          key={currentTab.resource}
          resource={currentTab.resource}
          title={currentTab.label}
        />
      ) : null}
    </div>
  );
}

export default function QuickBooksTabs() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-black/10 bg-white p-6 text-sm text-gray-500">
          Loading QuickBooks integration...
        </div>
      }
    >
      <QuickBooksTabsContent />
    </Suspense>
  );
}
