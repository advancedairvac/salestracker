"use client";

import { useEffect } from "react";
import Link from "next/link";

import OpportunityActions from "@/components/dashboard/opportunity-actions";
import { useMobileEditAction } from "@/components/layout/app-shell";

// Admin Server Actions
import {
  updateFollowUpMode as updateAdminFollowUpMode,
  updateOpportunityStatus as updateAdminOpportunityStatus,
} from "@/app/admin/opportunities/[id]/actions";

// Salesperson Server Actions
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

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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
}) {
  const { setMobileEditHref } = useMobileEditAction();

  const isSalesperson = role === "SALESPERSON";

  // ============================================
  // ROLE-BASED ROUTES
  // ============================================

  const basePath = isSalesperson
    ? "/salesperson/opportunities"
    : "/admin/opportunities";

  const editHref = `${basePath}/${opportunity.id}/edit`;

  // ============================================
  // ROLE-BASED SERVER ACTIONS
  // ============================================

  const updateFollowUpModeAction = isSalesperson
    ? updateSalespersonFollowUpMode
    : updateAdminFollowUpMode;

  const updateOpportunityStatusAction = isSalesperson
    ? updateSalespersonOpportunityStatus
    : updateAdminOpportunityStatus;

  // ============================================
  // OPPORTUNITY STATE
  // ============================================

  const canEdit = opportunity.status === "OPEN";

  const nextFollowUpAt = getNextFollowUp(opportunity.followUps || []);

  // ============================================
  // MOBILE EDIT ACTION
  // ============================================

  useEffect(() => {
    setMobileEditHref(canEdit ? editHref : null);

    return () => {
      setMobileEditHref(null);
    };
  }, [setMobileEditHref, canEdit, editHref]);

  // ============================================
  // RENDER
  // ============================================

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

        {/* DESKTOP EDIT BUTTON */}

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

        {opportunity.customer?.phone && <p>{opportunity.customer.phone}</p>}

        {opportunity.customer?.email && (
          <p className="break-all">{opportunity.customer.email}</p>
        )}

        {opportunity.customer?.location && (
          <p>{opportunity.customer.location}</p>
        )}
      </div>

      {/* NEXT FOLLOW-UP DATE AND TIME */}

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
        updateFollowUpModeAction={updateFollowUpModeAction}
        updateOpportunityStatusAction={updateOpportunityStatusAction}
      />
    </section>
  );
}
