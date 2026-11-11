
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getAuthenticatedUser } from "@/lib/auth";

import {
  searchOpportunityCustomers,
  createOpportunityService,
} from "@/lib/opportunities/opportunity-service";

// ============================================
// CUSTOMER SEARCH
// ============================================

export async function searchCustomers(query) {
  const user = await getAuthenticatedUser();

  if (!user || !["ADMIN", "SALESPERSON"].includes(user.role)) {
    return [];
  }

  return searchOpportunityCustomers(query);
}

// ============================================
// CREATE OPPORTUNITY
// ============================================

export async function createOpportunity(previousState, formData) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    return {
      error: "permission",
      values: {},
    };
  }

  const result = await createOpportunityService({
    user,
    formData,
  });

  // Return validation or database error to the form
  if (result.error) {
    return result;
  }

  // Refresh Admin pages
  revalidatePath("/admin");
  revalidatePath("/admin/opportunities");
  revalidatePath("/admin/pipeline");

  redirect("/admin/opportunities?created=1");
}
