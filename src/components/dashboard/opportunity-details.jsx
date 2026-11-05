
"use client";

import Link from "next/link";

import OpportunityActions from "@/components/dashboard/opportunity-actions";

// ============================================
// HELPERS
// ============================================

function formatDate(date) {
  if (!date) return "Not scheduled";

  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

// ============================================
// OPPORTUNITY DETAILS
// ============================================

export default function OpportunityDetails({ opportunity, schedule }) {
  return (
    <section className="w-full max-w-3xl text-black">
      {/* HEADER */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg font-bold uppercase leading-tight tracking-tight sm:text-xl">
            {opportunity.customer?.businessName || "Business Name"}
          </h1>

          <p className="text-sm font-medium uppercase leading-5 text-neutral-600">
            {opportunity.jobType}
          </p>
        </div>

        {/* EDIT BUTTON */}

        {opportunity.status === "OPEN" && (
          <Link
            href={`/admin/opportunities/${opportunity.id}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition-colors hover:border-black hover:bg-neutral-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
            </svg>

            Edit Opportunity
          </Link>
        )}
      </div>

      {/* OPPORTUNITY VALUE */}

      <div className="mt-5">
        <span className="inline-flex items-center bg-black px-2.5 py-1 text-sm font-semibold leading-5 text-white">
          {formatCurrency(opportunity.value)}
        </span>
      </div>

      {/* CUSTOMER INFORMATION */}

      <div className="mt-6 space-y-1 text-sm leading-5 text-neutral-700">
        {opportunity.customer?.pocName && (
          <p className="font-medium uppercase text-neutral-900">
            {opportunity.customer.pocName}
          </p>
        )}

        {opportunity.customer?.phone && (
          <p>{opportunity.customer.phone}</p>
        )}

        {opportunity.customer?.email && (
          <p className="break-all">{opportunity.customer.email}</p>
        )}

        {opportunity.customer?.location && (
          <p>{opportunity.customer.location}</p>
        )}
      </div>

      {/* OPPORTUNITY MESSAGE */}

      {opportunity.textMessage && (
        <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-neutral-700">
          {opportunity.textMessage}
        </p>
      )}

      {/* OPPORTUNITY ACTIONS */}

      <OpportunityActions
        opportunity={opportunity}
        schedule={schedule}
      />
    </section>
  );
}
