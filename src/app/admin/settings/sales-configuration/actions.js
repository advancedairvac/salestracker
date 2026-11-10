"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

const SALES_CONFIGURATION_PATH = "/admin/settings/sales-configuration";

export async function saveJobAssignment({
  serviceTitanJobId,
  jobNumber,
  customerName,
  saleValue,
  completedOn,
  source,
  salesmanId,
}) {
  try {
    // Admin authentication
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

    // Validate Job ID
    if (!serviceTitanJobId) {
      return {
        success: false,
        message: "Invalid ServiceTitan Job ID.",
      };
    }

    // Validate Source
    const allowedSources = [
      "SELF_GENERATED",
      "COMPANY_GENERATED",
    ];

    if (!allowedSources.includes(source)) {
      return {
        success: false,
        message: "Please select a valid source.",
      };
    }

    // Validate Salesman
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

    const parsedValue = Number(saleValue);

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return {
        success: false,
        message: "Invalid Job Value.",
      };
    }

    const completedDate = completedOn
      ? new Date(completedOn)
      : null;

    const validCompletedDate =
      completedDate && !Number.isNaN(completedDate.getTime())
        ? completedDate
        : null;

    const savedSale = await prisma.sale.upsert({
      where: {
        serviceTitanJobId: String(serviceTitanJobId),
      },

      // Update only assignment fields.
      // Existing financial and customer data remain unchanged.
      update: {
        source,
        salesmanId: salesmanId || null,
      },

      // Create a new Sale record if this Job does not exist.
      create: {
        serviceTitanJobId: String(serviceTitanJobId),
        serviceTitanJobNumber: jobNumber
          ? String(jobNumber)
          : null,

        customerName: customerName || null,

        saleValue: parsedValue,

        completedAt: validCompletedDate,

        source,

        salesmanId: salesmanId || null,
      },

      select: {
        id: true,
        source: true,
        salesmanId: true,
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