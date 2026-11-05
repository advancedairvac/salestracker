import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import OpportunityDetails from "@/components/dashboard/opportunity-details";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Opportunity Details | Sales Tracker",
};

export default async function OpportunityDetailsPage({ params }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  const { id } = await params;

  const opportunity = await prisma.opportunity.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,

      assignedTo: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },

      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },

      followUps: {
        orderBy: [
          {
            dueAt: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      },
    },
  });

  if (!opportunity) {
    notFound();
  }

  const schedule = await prisma.followUpSchedule.findFirst({
    where: {
      opportunityId: opportunity.id,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: "Sales Tracker", href: "/admin" },
          { label: "Opportunities", href: "/admin/opportunities" },
        ]}
        currentPage="Opportunity Details"
      />

      {/* Opportunity Details */}
      <OpportunityDetails
        opportunity={JSON.parse(JSON.stringify(opportunity))}
        schedule={schedule ? JSON.parse(JSON.stringify(schedule)) : null}
      />

      {/* Page Tagline */}
      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}