"use client";

import Link from "next/link";

import OpportunityActions from "@/components/dashboard/opportunity-actions";
import MobileEditAction from "@/components/layout/mobile-edit-action";
import { formatCurrency } from "@/lib/format/currency";
import { getOpportunityCustomer } from "@/lib/opportunities/opportunity-customer";

import {
  updateFollowUpMode as updateAdminFollowUpMode,
  updateOpportunityStatus as updateAdminOpportunityStatus,
} from "@/app/admin/opportunities/[id]/actions";

import {
  updateFollowUpMode as updateSalespersonFollowUpMode,
  updateOpportunityStatus as updateSalespersonOpportunityStatus,
} from "@/app/salesperson/opportunities/[id]/actions";

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

function formatTime(date) {
  if (!date) return "";

  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getNextFollowUp(followUps = []) {
  return (
    [...followUps]
      .filter(
        (item) => item.isActive && item.status === "PENDING" && item.dueAt,
      )
      .sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      )[0]?.dueAt || null
  );
}

// ============================================
// OPPORTUNITY DETAILS
// ============================================

export default function OpportunityDetails({
  opportunity,
  schedule,
  role = "ADMIN",
  canManage: canManageProp,
}) {
  const isSalesperson = role === "SALESPERSON";
  const customer = getOpportunityCustomer(opportunity);

  // Admin can manage every opportunity.
  // Salesperson can manage only their assigned opportunity.
  const canManage =
    canManageProp !== undefined ? canManageProp : !isSalesperson;

  const basePath = isSalesperson
    ? "/salesperson/opportunities"
    : "/admin/opportunities";

  const editHref = `${basePath}/${opportunity.id}/edit`;

  const updateFollowUpModeAction = isSalesperson
    ? updateSalespersonFollowUpMode
    : updateAdminFollowUpMode;

  const updateOpportunityStatusAction = isSalesperson
    ? updateSalespersonOpportunityStatus
    : updateAdminOpportunityStatus;

  const canEdit = opportunity.status === "OPEN" && canManage;

  const nextFollowUpAt = getNextFollowUp(opportunity.followUps || []);

  return (
    <section className="w-full max-w-3xl text-black">
      {/* Mobile Header Edit Action */}
      <MobileEditAction href={canEdit ? editHref : null} />

      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg font-bold uppercase leading-tight tracking-tight sm:text-xl">
            {customer?.businessName || "Business Name"}
          </h1>

          <p className="text-sm font-medium uppercase leading-5 text-neutral-600">
            {opportunity.jobType}
          </p>
        </div>

        {/* Desktop Edit Button */}
        {canEdit && (
          <Link
            href={editHref}
            className="hidden h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition-colors hover:border-black hover:bg-neutral-50 md:inline-flex"
          >
            Edit Opportunity
          </Link>
        )}
      </div>

      {/* OPPORTUNITY VALUE */}
      <div className="mt-5">
        <span className="inline-flex items-center bg-black px-2.5 py-1 text-sm font-semibold leading-5 text-white">
          {formatCurrency(opportunity.value, { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* CUSTOMER INFORMATION */}
      <div className="mt-6 space-y-1 text-sm leading-5 text-neutral-700">
        {customer?.pocName && (
          <p className="font-medium uppercase text-neutral-900">
            {customer.pocName}
          </p>
        )}

        {customer?.phone && <p>{customer.phone}</p>}

        {customer?.email && (
          <p className="break-all">{customer.email}</p>
        )}

        {customer?.location && (
          <p>{customer.location}</p>
        )}
      </div>

      {/* NEXT FOLLOW-UP */}
      {nextFollowUpAt && (
        <div className="mt-3 space-y-1 text-sm leading-5 text-neutral-900">
          <p>{formatDate(nextFollowUpAt)}</p>
          <p>{formatTime(nextFollowUpAt)}</p>
        </div>
      )}

      {/* OPPORTUNITY MESSAGE */}
      {opportunity.textMessage && (
        <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-neutral-700">
          {opportunity.textMessage}
        </p>
      )}

      {/* OPPORTUNITY ACTIONS */}
      <OpportunityActions
        opportunity={opportunity}
        schedule={schedule}
        role={role}
        canManage={canManage}
        updateFollowUpModeAction={updateFollowUpModeAction}
        updateOpportunityStatusAction={updateOpportunityStatusAction}
      />
    </section>
  );
}
