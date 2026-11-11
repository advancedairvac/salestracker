
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

  if (!user || user.role !== "SALESPERSON") {
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

  if (user.role !== "SALESPERSON") {
    return {
      error: "permission",
      values: {},
    };
  }

  const result = await createOpportunityService({
    user,
    formData,
  });

  // Return validation or database errors
  if (result.error) {
    return result;
  }

  // Refresh Salesperson pages
  revalidatePath("/salesperson");
  revalidatePath("/salesperson/opportunities");
  revalidatePath("/salesperson/pipeline");

  redirect("/salesperson/opportunities?created=1");
}
