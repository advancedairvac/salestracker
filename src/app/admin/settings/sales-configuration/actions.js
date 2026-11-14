"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

const SALES_CONFIGURATION_PATH = "/admin/settings/sales-configuration";

export async function saveJobAssignment({
  serviceTitanJobId,
  source,
  salesmanId,
  commissionEstimate,
}) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
      return {
        success: false,
        message: "You are not authorized to perform this action.",
      };
    }

    if (!currentUser.isActive) {
      return {
        success: false,
        message: "Your account is inactive.",
      };
    }

    if (!serviceTitanJobId) {
      return {
        success: false,
        message: "Invalid ServiceTitan Job ID.",
      };
    }

    const allowedSources = ["SELF_GENERATED", "COMPANY"];

    if (!allowedSources.includes(source)) {
      return {
        success: false,
        message: "Please select a valid source.",
      };
    }

    if (salesmanId) {
      const salesman = await prisma.user.findFirst({
        where: {
          id: salesmanId,
          role: "SALESPERSON",
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!salesman) {
        return {
          success: false,
          message: "Selected salesperson is not available.",
        };
      }
    }

    const parsedCommission = Number(commissionEstimate);

    if (!Number.isFinite(parsedCommission) || parsedCommission < 0) {
      return {
        success: false,
        message: "Please enter a valid commission estimate.",
      };
    }

    const savedSale = await prisma.sale.upsert({
      where: {
        serviceTitanJobId: String(serviceTitanJobId),
      },

      update: {
        source,
        salesmanId: salesmanId || null,
        commissionEstimate: parsedCommission,
      },

      create: {
        serviceTitanJobId: String(serviceTitanJobId),
        source,
        salesmanId: salesmanId || null,
        commissionEstimate: parsedCommission,
      },

      select: {
        id: true,
        serviceTitanJobId: true,
        source: true,
        salesmanId: true,
        commissionEstimate: true,
        salesman: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    revalidatePath(SALES_CONFIGURATION_PATH);
    revalidatePath("/admin/sales-revenue");

    return {
      success: true,
      message: "Job assignment saved successfully.",
      data: {
        id: savedSale.id,
        source: savedSale.source,
        salesmanId: savedSale.salesmanId,
        salesmanName: savedSale.salesman?.name || null,
        commissionEstimate: Number(savedSale.commissionEstimate),
      },
    };
  } catch (error) {
    console.error("Save Job Assignment Error:", error);

    return {
      success: false,
      message: "Something went wrong while saving the assignment.",
    };
  }
}
