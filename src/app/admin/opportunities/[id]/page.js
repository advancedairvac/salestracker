import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

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
      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
        <span className="font-semibold text-black">Sales Tracker</span>

        <span className="text-[#777]">/</span>

        <span className="text-[#666]">Opportunity</span>
      </div>

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
