"use client";

import { useState } from "react";
import JobAssignmentModal from "./job-assignment-modal";
import { formatCurrency } from "@/lib/format/currency";

function getSourceLabel(source) {
  if (source === "SELF_GENERATED") return "Self Generated";
  if (source === "COMPANY") return "Company";
  return "Not Assigned";
}

function InfoItem({ label, value, prominent = false }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#929292]">
        {label}
      </p>

      <p
        className={`mt-1 truncate ${
          prominent
            ? "text-[13px] font-bold text-[#171717]"
            : "text-[13px] font-semibold text-[#404040]"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export default function JobCard({ job, salesmen = [] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [assignment, setAssignment] = useState({
    source: job.source || null,
    salesmanId: job.salesmanId || null,
    salesmanName: job.salesmanName || null,
    commissionEstimate: Number(job.commissionEstimate || 0),
  });

  const handleSaved = (updatedAssignment) => {
    setAssignment(updatedAssignment);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="group flex w-full flex-col border border-[#d5d5d5] bg-white p-4 text-left transition-all duration-200 hover:border-[#777] sm:p-[18px]"
      >
        {/* Header */}
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-snug text-[#171717] sm:text-[16px]">
            {job.title}
          </h3>

          <p className="mt-1.5 text-[12px] text-[#737373]">
            ServiceTitan Job #{job.jobNumber || job.serviceTitanJobId}
          </p>
        </div>

        {/* Job Value */}
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#929292]">
            Estimated Job Value
          </p>

          <p className="mt-1 text-[24px] font-extrabold tracking-tight text-[#171717]">
            {formatCurrency(job.saleValue)}
          </p>
        </div>

        {/* Information */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[#ededed] pt-4">
          <InfoItem label="Customer" value={job.customerName} />

          <InfoItem label="Source" value={getSourceLabel(assignment.source)} />

          <InfoItem
            label="Salesman"
            value={assignment.salesmanName || "Unassigned"}
          />

          <InfoItem
            label="Commission Estimate"
            value={formatCurrency(assignment.commissionEstimate)}
            prominent
          />
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-[#ededed] pt-3">
          <span className="text-[11px] font-medium text-[#737373] transition-colors group-hover:text-[#171717]">
            Configure Assignment
          </span>

          {/* Single diagonal arrow - same style as Opportunity Card */}
          <span className="flex items-center justify-center text-[#737373] transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#171717]">
            <svg
              width="20"
              height="20"
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
      </button>

      {/* Assignment Modal */}
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
