"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  updateOpportunityService,
} from "@/lib/opportunities/opportunity-service";

import {
  closeOpportunityService,
  updateFollowUpModeService,
} from "@/lib/opportunities/opportunity-action-service";

// ============================================
// HELPERS
// ============================================

function getFormValue(formData, key) {
  return formData.get(key)?.toString().trim() || "";
}

async function getSalespersonUser() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== "SALESPERSON") {
    return null;
  }

  return user;
}

async function isOwnOpportunity(userId, opportunityId) {
  if (!userId || !opportunityId) {
    return false;
  }

  const opportunity = await prisma.opportunity.findFirst({
    where: {
      id: opportunityId,
      assignedToId: userId,
    },
    select: {
      id: true,
    },
  });

  return Boolean(opportunity);
}

function revalidateOpportunityPages(opportunityId) {
  revalidatePath("/salesperson");
  revalidatePath("/salesperson/opportunities");
  revalidatePath("/salesperson/pipeline");
  revalidatePath("/salesperson/sales-revenue");

  if (opportunityId) {
    revalidatePath(`/salesperson/opportunities/${opportunityId}`);
    revalidatePath(`/salesperson/opportunities/${opportunityId}/edit`);
  }
}

// ============================================
// UPDATE OPPORTUNITY
// ============================================

export async function updateOpportunity(previousState, formData) {
  const user = await getSalespersonUser();

  if (!user) {
    return {
      error: "permission",
      values: {},
    };
  }

  const opportunityId = getFormValue(formData, "opportunityId");

  if (!opportunityId) {
    return {
      error: "opportunity",
      values: {},
    };
  }

  const hasAccess = await isOwnOpportunity(user.id, opportunityId);

  if (!hasAccess) {
    return {
      error: "permission",
      values: {},
    };
  }

  const result = await updateOpportunityService({
    user,
    formData,
  });

  if (result?.error) {
    return result;
  }

  revalidateOpportunityPages(opportunityId);

  redirect(`/salesperson/opportunities/${opportunityId}`);
}

// ============================================
// CLOSE OPPORTUNITY
// ============================================

export async function updateOpportunityStatus(
  opportunityId,
  action,
  payload = {},
) {
  const user = await getSalespersonUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized.",
    };
  }

  const result = await closeOpportunityService({
    user,
    opportunityId,
    action,
    payload,
  });

  if (result.success) {
    revalidateOpportunityPages(opportunityId);
  }

  return result;
}

// ============================================
// UPDATE FOLLOW-UP MODE
// ============================================

export async function updateFollowUpMode(
  opportunityId,
  mode,
  manualDateTime = "",
) {
  const user = await getSalespersonUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized.",
    };
  }

  const result = await updateFollowUpModeService({
    user,
    opportunityId,
    mode,
    manualDateTime,
  });

  // No database change is made when needsDate is true.
  if (result.success && !result.needsDate) {
    revalidateOpportunityPages(opportunityId);
  }

  return result;
}