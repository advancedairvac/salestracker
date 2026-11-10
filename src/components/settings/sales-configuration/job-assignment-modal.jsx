"use client";

import { useEffect, useState, useTransition } from "react";
import { saveJobAssignment } from "@/app/admin/settings/sales-configuration/actions";

const SOURCE_OPTIONS = [
  {
    value: "SELF_GENERATED",
    label: "Self Generated",
  },
  {
    value: "COMPANY_GENERATED",
    label: "Company Generated",
  },
];

export default function JobAssignmentModal({
  isOpen,
  onClose,
  job,
  salesmen = [],
  onSaved,
}) {
  const [source, setSource] = useState("");
  const [salesmanId, setSalesmanId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen || !job) return;

    setSource(job.source || "");
    setSalesmanId(job.salesmanId || "");
    setError("");
    setSuccessMessage("");
  }, [isOpen, job]);

  if (!isOpen || !job) return null;

  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!source) {
      setError("Please select a Source.");
      return;
    }

    startTransition(async () => {
      const result = await saveJobAssignment({
        serviceTitanJobId: job.serviceTitanJobId,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        saleValue: job.saleValue,
        completedOn: job.completedOn,
        source,
        salesmanId: salesmanId || null,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccessMessage(result.message);

      onSaved?.({
        source,
        salesmanId: salesmanId || null,
        salesmanName:
          salesmen.find((item) => item.id === salesmanId)?.name || null,
      });

      setTimeout(() => {
        onClose();
      }, 500);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[480px] rounded-xl border border-[#e5e5e5] bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-4">
          <div>
            <h2 className="text-[17px] font-extrabold uppercase tracking-wide text-[#171717]">
              Assign Job
            </h2>

            <p className="mt-1 text-[12px] text-[#737373]">
              Job #{job.jobNumber || job.serviceTitanJobId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#737373] transition hover:bg-[#f3f3f3] hover:text-black disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {/* Job Information */}
          <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-4">
            <p className="text-[13px] font-bold text-[#171717]">
              {job.title}
            </p>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] text-[#737373]">
                Customer
              </span>

              <span className="text-right text-[12px] font-semibold text-[#404040]">
                {job.customerName || "—"}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[12px] text-[#737373]">
                Job Value
              </span>

              <span className="text-[13px] font-bold text-[#171717]">
                {Number(job.saleValue || 0).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </span>
            </div>
          </div>

          {/* Source */}
          <div>
            <label
              htmlFor="job-source"
              className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-[#404040]"
            >
              Source <span className="text-red-500">*</span>
            </label>

            <select
              id="job-source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              required
              className="h-11 w-full rounded-lg border border-[#d5d5d5] bg-white px-3 text-[13px] text-[#171717] outline-none transition focus:border-[#171717]"
            >
              <option value="">Select Source</option>

              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Salesman */}
          <div>
            <label
              htmlFor="job-salesman"
              className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-[#404040]"
            >
              Salesman
            </label>

            <select
              id="job-salesman"
              value={salesmanId}
              onChange={(event) => setSalesmanId(event.target.value)}
              className="h-11 w-full rounded-lg border border-[#d5d5d5] bg-white px-3 text-[13px] text-[#171717] outline-none transition focus:border-[#171717]"
            >
              <option value="">Unassigned</option>

              {salesmen.map((salesman) => (
                <option key={salesman.id} value={salesman.id}>
                  {salesman.name}
                </option>
              ))}
            </select>
          </div>

          {/* Feedback */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[12px] text-green-700">
              {successMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-[#e5e5e5] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-10 rounded-lg border border-[#d5d5d5] px-5 text-[12px] font-bold uppercase tracking-wide text-[#404040] transition hover:bg-[#f5f5f5] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="h-10 rounded-lg bg-[#171717] px-6 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}