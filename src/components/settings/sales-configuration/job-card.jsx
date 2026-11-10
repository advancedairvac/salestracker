"use client";

import { useState } from "react";
import JobAssignmentModal from "./job-assignment-modal";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function getSourceLabel(source) {
  if (source === "SELF_GENERATED") return "Self Generated";
  if (source === "COMPANY_GENERATED") return "Company Generated";
  return "Not Assigned";
}

export default function JobCard({
  job,
  salesmen = [],
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [assignment, setAssignment] = useState({
    source: job.source || null,
    salesmanId: job.salesmanId || null,
    salesmanName: job.salesmanName || null,
  });

  const handleSaved = (updatedAssignment) => {
    setAssignment(updatedAssignment);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="group w-full border border-[#d5d5d5] bg-white p-4 text-left transition-colors duration-200 hover:border-[#171717] sm:p-[18px]"
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold uppercase leading-snug tracking-wide text-[#171717] sm:text-[16px]">
              {job.title}
            </h3>

            <p className="mt-1.5 text-[12px] text-[#737373]">
              ServiceTitan Job #{job.jobNumber || job.serviceTitanJobId}
            </p>
          </div>

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e5e5e5] text-[#737373] transition-all duration-200 group-hover:border-[#171717] group-hover:bg-[#171717] group-hover:text-white">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17 17 7M7 7h10v10" />
            </svg>
          </span>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-[#ededed]" />

        {/* Customer and Value */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#929292]">
              Customer
            </p>

            <p className="mt-1 truncate text-[13px] font-semibold text-[#404040]">
              {job.customerName || "—"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#929292]">
              Job Value
            </p>

            <p className="mt-1 text-[13px] font-bold text-[#171717]">
              {formatCurrency(job.saleValue)}
            </p>
          </div>
        </div>

        {/* Assignment Information */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#ededed] pt-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#929292]">
              Source
            </p>

            <p className="mt-1 text-[12px] font-semibold text-[#404040]">
              {getSourceLabel(assignment.source)}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#929292]">
              Salesman
            </p>

            <p className="mt-1 truncate text-[12px] font-semibold text-[#404040]">
              {assignment.salesmanName || "Unassigned"}
            </p>
          </div>
        </div>
      </button>

      <JobAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        job={{
          ...job,
          ...assignment,
        }}
        salesmen={salesmen}
        onSaved={handleSaved}
      />
    </>
  );
}