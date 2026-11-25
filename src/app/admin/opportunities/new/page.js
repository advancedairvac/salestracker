import { redirect } from "next/navigation";
import { createOpportunity } from "./actions";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // ------------------------------------------
  // ADMIN PERMISSION
  // ------------------------------------------

  if (user.role !== "ADMIN") {
    redirect("/salesperson");
  }

  // ------------------------------------------
  // LOAD ACTIVE USERS FOR ADMIN ASSIGNMENT
  // ------------------------------------------

  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: {
        in: ["ADMIN", "SALESPERSON"],
      },
    },
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  // ------------------------------------------
  // DEFAULT DATE
  // ------------------------------------------

  const today = getTodayDate();

  // ------------------------------------------
  // PAGE UI
  // ------------------------------------------

  return (
    <div className="space-y-4 sm:space-y-5">
      <Breadcrumbs
        items={[{ label: "Sales Tracker", href: "/admin" }]}
        currentPage="New Opportunity"
      />

      <section className="mt-5 flex w-full flex-1 flex-col items-center sm:mt-6">
        <div className="w-full max-w-[700px]">
          <NewEditOpportunity
            user={user}
            users={users}
            today={today}
            createAction={createOpportunity}
          />
        </div>
      </section>

      <PageTagline>Failing to plan, is planning to fail.</PageTagline>
    </div>
  );
}
