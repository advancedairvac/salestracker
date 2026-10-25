
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 25;

const RESOURCE_COLUMNS = {
  customers: [
    { key: "Id", label: "ID" },
    { key: "DisplayName", label: "Customer Name" },
    { key: "CompanyName", label: "Company" },
    { key: "PrimaryEmailAddr.Address", label: "Email" },
    { key: "PrimaryPhone.FreeFormNumber", label: "Phone" },
    { key: "Active", label: "Active" },
    { key: "Balance", label: "Balance" },
  ],
  vendors: [
    { key: "Id", label: "ID" },
    { key: "DisplayName", label: "Vendor Name" },
    { key: "CompanyName", label: "Company" },
    { key: "PrimaryEmailAddr.Address", label: "Email" },
    { key: "PrimaryPhone.FreeFormNumber", label: "Phone" },
    { key: "Active", label: "Active" },
    { key: "Balance", label: "Balance" },
  ],
  items: [
    { key: "Id", label: "ID" },
    { key: "Name", label: "Item Name" },
    { key: "Sku", label: "SKU" },
    { key: "Type", label: "Type" },
    { key: "UnitPrice", label: "Unit Price" },
    { key: "QtyOnHand", label: "Qty On Hand" },
    { key: "Active", label: "Active" },
  ],
  invoices: [
    { key: "Id", label: "Invoice ID" },
    { key: "DocNumber", label: "Invoice Number" },
    { key: "CustomerRef.name", label: "Customer" },
    { key: "TxnDate", label: "Date" },
    { key: "DueDate", label: "Due Date" },
    { key: "TotalAmt", label: "Total" },
    { key: "Balance", label: "Balance Due" },
  ],
  estimates: [
    { key: "Id", label: "Estimate ID" },
    { key: "DocNumber", label: "Estimate Number" },
    { key: "CustomerRef.name", label: "Customer" },
    { key: "TxnDate", label: "Date" },
    { key: "ExpirationDate", label: "Expiration" },
    { key: "TotalAmt", label: "Total" },
    { key: "TxnStatus", label: "Status" },
  ],
  salesreceipts: [
    { key: "Id", label: "Receipt ID" },
    { key: "DocNumber", label: "Receipt Number" },
    { key: "CustomerRef.name", label: "Customer" },
    { key: "TxnDate", label: "Date" },
    { key: "TotalAmt", label: "Total" },
    { key: "PaymentMethodRef.name", label: "Payment Method" },
  ],
  payments: [
    { key: "Id", label: "Payment ID" },
    { key: "CustomerRef.name", label: "Customer" },
    { key: "TxnDate", label: "Date" },
    { key: "TotalAmt", label: "Total" },
    { key: "UnappliedAmt", label: "Unapplied Amount" },
    { key: "PaymentMethodRef.name", label: "Payment Method" },
  ],
  bills: [
    { key: "Id", label: "Bill ID" },
    { key: "DocNumber", label: "Bill Number" },
    { key: "VendorRef.name", label: "Vendor" },
    { key: "TxnDate", label: "Date" },
    { key: "DueDate", label: "Due Date" },
    { key: "TotalAmt", label: "Total" },
    { key: "Balance", label: "Balance Due" },
  ],
  accounts: [
    { key: "Id", label: "Account ID" },
    { key: "Name", label: "Account Name" },
    { key: "AccountType", label: "Account Type" },
    { key: "AccountSubType", label: "Account Subtype" },
    { key: "CurrentBalance", label: "Current Balance" },
    { key: "Active", label: "Active" },
  ],
  employees: [
    { key: "Id", label: "Employee ID" },
    { key: "DisplayName", label: "Name" },
    { key: "GivenName", label: "First Name" },
    { key: "FamilyName", label: "Last Name" },
    { key: "PrimaryEmailAddr.Address", label: "Email" },
    { key: "PrimaryPhone.FreeFormNumber", label: "Phone" },
    { key: "Active", label: "Active" },
  ],
  creditmemos: [
    { key: "Id", label: "Credit Memo ID" },
    { key: "DocNumber", label: "Credit Memo Number" },
    { key: "CustomerRef.name", label: "Customer" },
    { key: "TxnDate", label: "Date" },
    { key: "TotalAmt", label: "Total" },
    { key: "RemainingCredit", label: "Remaining Credit" },
  ],
  purchaseorders: [
    { key: "Id", label: "Purchase Order ID" },
    { key: "DocNumber", label: "PO Number" },
    { key: "VendorRef.name", label: "Vendor" },
    { key: "TxnDate", label: "Date" },
    { key: "DueDate", label: "Due Date" },
    { key: "TotalAmt", label: "Total" },
    { key: "POStatus", label: "Status" },
  ],
  journalentries: [
    { key: "Id", label: "Journal Entry ID" },
    { key: "DocNumber", label: "Entry Number" },
    { key: "TxnDate", label: "Date" },
    { key: "PrivateNote", label: "Memo" },
    { key: "TotalAmt", label: "Total" },
  ],
  taxcodes: [
    { key: "Id", label: "Tax Code ID" },
    { key: "Name", label: "Tax Code" },
    { key: "Description", label: "Description" },
    { key: "Active", label: "Active" },
  ],
  purchases: [
    { key: "Id", label: "Purchase ID" },
    { key: "PaymentType", label: "Payment Type" },
    { key: "TxnDate", label: "Date" },
    { key: "TotalAmt", label: "Total" },
    { key: "AccountRef.name", label: "Account" },
    { key: "EntityRef.name", label: "Payee" },
  ],
};

function getNestedValue(record, path) {
  return path.split(".").reduce((value, key) => {
    if (value === null || value === undefined) return undefined;
    return value[key];
  }, record);
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "object") {
    if ("value" in value && Object.keys(value).length <= 2) {
      return String(value.value ?? "—");
    }

    return JSON.stringify(value);
  }

  return String(value);
}

function getRecordColumns(resource, records) {
  const configured = RESOURCE_COLUMNS[resource];

  if (configured) {
    // Show the useful columns first, but only when at least one record
    // contains that field. Keep a small set of available columns.
    const available = configured.filter((column) =>
      records.some((record) => getNestedValue(record, column.key) !== undefined)
    );

    if (available.length > 0) return available;
  }

  // Generic fallback for resources without a specific column layout.
  const keys = Array.from(
    new Set(records.flatMap((record) => Object.keys(record)))
  ).slice(0, 7);

  return keys.map((key) => ({ key, label: key }));
}

export default function ResourceDataTab({ resource, title }) {
  const [records, setRecords] = useState([]);
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRawJson, setShowRawJson] = useState(false);
  const [startPosition, setStartPosition] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        startPosition: String(startPosition),
        maxResults: String(PAGE_SIZE),
      });

      const response = await fetch(
        `/api/quickbooks/data/${resource}?${params.toString()}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load QuickBooks data.");
      }

      const nextRecords = Array.isArray(data.records) ? data.records : [];

      setRecords(nextRecords);
      setRawData(data.raw || data);
      setHasMore(nextRecords.length === PAGE_SIZE);
    } catch (err) {
      setRecords([]);
      setRawData(null);
      setHasMore(false);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [resource, startPosition]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo(
    () => getRecordColumns(resource, records),
    [resource, records]
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#0d0d0d]">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">
            QuickBooks API resource: {resource}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="rounded-lg bg-[#0d0d0d] px-4 py-2 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh data"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">API request failed</p>
          <p className="mt-1 break-words">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <p className="text-sm text-gray-500">Records on this page</p>
          <p className="mt-2 text-2xl font-semibold">{records.length}</p>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <p className="text-sm text-gray-500">Starting position</p>
          <p className="mt-2 text-2xl font-semibold">{startPosition}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="whitespace-nowrap px-4 py-3 font-medium"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5">
              {loading && records.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length, 1)}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Loading QuickBooks data...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length, 1)}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {error
                      ? "No data loaded."
                      : "No records returned for this resource."}
                  </td>
                </tr>
              ) : (
                records.map((record, index) => (
                  <tr key={`${record.Id || "record"}-${index}`}>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="max-w-xs px-4 py-3 align-top text-gray-700"
                      >
                        <span className="block break-words">
                          {formatValue(getNestedValue(record, column.key))}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Showing {records.length} records · Page starts at {startPosition}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || startPosition <= 1}
            onClick={() =>
              setStartPosition((position) =>
                Math.max(1, position - PAGE_SIZE)
              )
            }
            className="rounded-lg border border-black/10 px-3 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={loading || !hasMore}
            onClick={() => setStartPosition((position) => position + PAGE_SIZE)}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <button
          type="button"
          onClick={() => setShowRawJson((visible) => !visible)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-gray-50"
        >
          Raw JSON response
          <span>{showRawJson ? "−" : "+"}</span>
        </button>

        {showRawJson && (
          <pre className="max-h-[500px] overflow-auto border-t border-black/10 bg-gray-950 p-4 text-xs leading-5 text-green-300">
            {rawData
              ? JSON.stringify(rawData, null, 2)
              : "No JSON response available."}
          </pre>
        )}
      </div>
    </section>
  );
}
