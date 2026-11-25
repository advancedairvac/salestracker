
import { prisma } from "@/lib/prisma";
import { serviceTitanRequest } from "@/lib/integrations/servicetitan";
import { validateJobAutoAssignment } from "./auto-assign-helpers";

export async function autoAssignServiceTitanJob(jobId) {
  try {
    if (!jobId) {
      return {
        success: false,
        status: "SKIPPED",
        reason: "MISSING_JOB_ID",
      };
    }

    const normalizedJobId = String(jobId);

    // Fetch the actual ServiceTitan Job.
    const job = await serviceTitanRequest(
      `/jpm/v2/tenant/{tenant}/jobs/${encodeURIComponent(normalizedJobId)}`,
    );

    if (!job?.id) {
      return {
        success: false,
        status: "SKIPPED",
        reason: "JOB_NOT_FOUND",
      };
    }

    // Find the matching WON Opportunity.
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        titanJobId: normalizedJobId,
        status: "WON",
      },
      select: {
        id: true,
        titanJobId: true,
        status: true,
        source: true,
        assignedToId: true,
        createdAt: true,
      },
    });

    if (!opportunity) {
      return {
        success: false,
        status: "SKIPPED",
        reason: "NO_MATCHING_WON_OPPORTUNITY",
      };
    }

    // Validate Auto Assignment rules.
    const validation = validateJobAutoAssignment({
      opportunity,
      job,
    });

    if (!validation.eligible) {
      return {
        success: false,
        status: "SKIPPED",
        reason: validation.reason,
      };
    }

    // Do not overwrite existing manual assignments.
    const existingSale = await prisma.sale.findUnique({
      where: {
        serviceTitanJobId: normalizedJobId,
      },
      select: {
        id: true,
      },
    });

    if (existingSale) {
      return {
        success: false,
        status: "SKIPPED",
        reason: "SALE_ALREADY_EXISTS",
      };
    }

    // Create the Sale using Opportunity assignment data.
    const sale = await prisma.sale.create({
      data: {
        serviceTitanJobId: normalizedJobId,
        source: opportunity.source,
        salesmanId: opportunity.assignedToId,
        commissionEstimate: 0,
      },
      select: {
        id: true,
        serviceTitanJobId: true,
        source: true,
        salesmanId: true,
      },
    });

    return {
      success: true,
      status: "ASSIGNED",
      data: sale,
    };
  } catch (error) {
    // Unique constraint protection against duplicate assignments.
    if (error?.code === "P2002") {
      return {
        success: false,
        status: "SKIPPED",
        reason: "SALE_ALREADY_EXISTS",
      };
    }

    console.error("[Titan Job Auto Assignment]", error);

    return {
      success: false,
      status: "FAILED",
      reason: "AUTO_ASSIGNMENT_ERROR",
    };
  }
}
