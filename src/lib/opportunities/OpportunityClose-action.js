
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

function parseManualDateTime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

async function verifyAccess(opportunityId) {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!["ADMIN", "SALESPERSON"].includes(user.role)) {
    throw new Error("You do not have permission to close this opportunity.");
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: {
      id: opportunityId,
    },
    select: {
      id: true,
      assignedToId: true,
      status: true,
    },
  });

  if (!opportunity) {
    throw new Error("Opportunity not found.");
  }

  // Salesperson can only close their own assigned opportunities.
  if (
    user.role === "SALESPERSON" &&
    opportunity.assignedToId !== user.id
  ) {
    throw new Error(
      "You do not have permission to close this opportunity."
    );
  }

  return {
    user,
    opportunity,
  };
}

function revalidateOpportunityPages(opportunityId) {
  const paths = [
    `/admin/opportunities/${opportunityId}`,
    `/admin/opportunities/${opportunityId}/edit`,
    "/admin/opportunities",
    "/admin/pipeline",
    "/admin/sales-revenue",

    `/salesperson/opportunities/${opportunityId}`,
    `/salesperson/opportunities/${opportunityId}/edit`,
    "/salesperson/opportunities",
    "/salesperson/pipeline",
    "/salesperson/sales-revenue",
  ];

  paths.forEach((path) => {
    revalidatePath(path);
  });
}

export async function updateOpportunityStatus(
  opportunityId,
  action,
  payload = {}
) {
  try {
    const { user, opportunity } = await verifyAccess(opportunityId);

    if (opportunity.status !== "OPEN") {
      return {
        success: false,
        message: "Only open opportunities can be closed.",
      };
    }

    if (action !== "CLOSE") {
      return {
        success: false,
        message: "Invalid action.",
      };
    }

    const closeTypes = {
      TEMPORARY: "TEMPORARILY_CLOSED",
      SCHEDULE_REOPEN: "SCHEDULED_TO_REOPEN",
    };

    const nextStatus = closeTypes[payload.closeType];

    if (!nextStatus) {
      return {
        success: false,
        message: "Invalid close type.",
      };
    }

    const reopenAt =
      payload.closeType === "SCHEDULE_REOPEN"
        ? parseManualDateTime(payload.reopenAt)
        : null;

    if (payload.closeType === "SCHEDULE_REOPEN") {
      if (!reopenAt) {
        return {
          success: false,
          message: "Please provide a valid reopen date and time.",
        };
      }

      if (reopenAt <= new Date()) {
        return {
          success: false,
          message: "Reopen date must be in the future.",
        };
      }
    }

    const note = String(payload.note || "").trim();

    const description =
      payload.closeType === "TEMPORARY"
        ? "Opportunity temporarily closed."
        : `Opportunity scheduled to reopen on ${reopenAt.toLocaleString()}.`;

    await prisma.$transaction(async (tx) => {
      await tx.opportunity.updateMany({
        where: {
          id: opportunityId,
          status: "OPEN",
        },
        data: {
          status: nextStatus,
          closedAt: new Date(),
          closedById: user.id,
          reopenAt,
        },
      });

      await tx.activity.create({
        data: {
          opportunityId,
          type: "STATUS_CHANGE",
          description: note
            ? `${description} Note: ${note}`
            : description,
          createdById: user.id,
        },
      });

      await tx.followUp.updateMany({
        where: {
          opportunityId,
          status: "PENDING",
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      await tx.followUpSchedule.updateMany({
        where: {
          opportunityId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    revalidateOpportunityPages(opportunityId);

    return {
      success: true,
      message: "Opportunity closed successfully.",
      status: nextStatus,
    };
  } catch (error) {
    console.error("Update opportunity status error:", error);

    return {
      success: false,
      message: error.message || "Failed to update opportunity status.",
    };
  }
}
