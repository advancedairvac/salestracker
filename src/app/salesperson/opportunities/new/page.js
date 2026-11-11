import { redirect } from "next/navigation";
import { createOpportunity } from "./actions";
import { getAuthenticatedUser } from "@/lib/auth";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";
import NewEditOpportunity from "@/components/dashboard/newEdit-opportunity";

export const metadata = {
  title: "New Opportunity | Sales Tracker",
};

// --------------------------------------------
// GET TODAY'S DATE
// --------------------------------------------

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// --------------------------------------------
// NEW OPPORTUNITY PAGE
// --------------------------------------------

export default async function NewOpportunityPage() {
  // ------------------------------------------
  // AUTHENTICATION
  // ------------------------------------------

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "SALESPERSON") {
    redirect("/admin");
  }

  // ------------------------------------------
  // DEFAULT DATE
  // ------------------------------------------

  const today = getTodayDate();

  // ------------------------------------------
  // PAGE UI
  // ------------------------------------------

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/salesperson",
          },
        ]}
        currentPage="New Opportunity"
      />

      {/* New Opportunity Form */}
      <section className="mt-5 flex w-full flex-1 flex-col sm:mt-6">
        <NewEditOpportunity
          user={user}
          users={[]}
          today={today}
          createAction={createOpportunity}
        />
      </section>

      {/* Page Tagline */}
      <PageTagline>Failing to plan, is planning to fail.</PageTagline>
    </div>
  );
}
