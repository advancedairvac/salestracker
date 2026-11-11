
"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// ============================================
// HELPERS
// ============================================

function parseManualDateTime(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

async function generateDisplayId(tx, prefix) {
  const counter = await tx.idCounter.upsert({
    where: { prefix },
    create: {
      prefix,
      nextValue: 1,
    },
    update: {
      nextValue: {
        increment: 1,
      },
    },
    select: {
      nextValue: true,
    },
  });

  return `${prefix}-${counter.nextValue}`;
}

// ============================================
// VERIFY OPPORTUNITY ACCESS
// ============================================

async function verifyAccess(opportunityId) {
  const user = await getAuthenticatedUser();

  if (!user || !["ADMIN", "SALESPERSON"].includes(user.role)) {
    throw new Error("Unauthorized.");
  }

  if (!opportunityId) {
    throw new Error("Opportunity ID is required.");
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: {
      id: opportunityId,
    },
    select: {
      id: true,
      customerId: true,
      assignedToId: true,
      status: true,
    },
  });

  if (!opportunity) {
    throw new Error("Opportunity not found.");
  }

  // Salesperson can only manage their own assigned opportunities.
  if (
    user.role === "SALESPERSON" &&
    opportunity.assignedToId !== user.id
  ) {
    throw new Error("You do not have permission to manage this opportunity.");
  }

  return { user, opportunity };
}

// ============================================
// REVALIDATE OPPORTUNITY PAGES
// ============================================

function revalidateOpportunityPages(opportunityId) {
  // Admin pages
  revalidatePath(`/admin/opportunities/${opportunityId}`);
  revalidatePath(`/admin/opportunities/${opportunityId}/edit`);
  revalidatePath("/admin/opportunities");
  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/sales-revenue");

  // Salesperson pages
  revalidatePath(`/salesperson/opportunities/${opportunityId}`);
  revalidatePath(`/salesperson/opportunities/${opportunityId}/edit`);
  revalidatePath("/salesperson/opportunities");
  revalidatePath("/salesperson/pipeline");
  revalidatePath("/salesperson/sales-revenue");
}

// ============================================
// UPDATE FOLLOW-UP MODE
// ============================================

export async function updateFollowUpMode(
  opportunityId,
  mode,
  manualDateTime = "",
) {
  try {
    const { opportunity } = await verifyAccess(opportunityId);

    // Only OPEN opportunities can have their follow-ups changed.
    if (opportunity.status !== "OPEN") {
      return {
        success: false,
        error: "Follow-ups can only be changed for open opportunities.",
      };
    }

    if (!["STANDARD", "MANUAL"].includes(mode)) {
      return {
        success: false,
        error: "Invalid follow-up mode.",
      };
    }

    let manualFollowUpDate = null;

    if (mode === "MANUAL" && manualDateTime) {
      manualFollowUpDate = parseManualDateTime(manualDateTime);

      if (!manualFollowUpDate) {
        return {
          success: false,
          error: "Please select a valid follow-up date and time.",
        };
      }

      if (manualFollowUpDate <= new Date()) {
        return {
          success: false,
          error: "Please select a future date and time.",
        };
      }
    }

    // ==========================================
    // DATABASE TRANSACTION
    // ==========================================

    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.followUpSchedule.findFirst({
        where: {
          opportunityId,
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!schedule) {
        throw new Error("Active follow-up schedule not found.");
      }

      // ========================================
      // STANDARD MODE
      // ========================================

      if (mode === "STANDARD") {
        await tx.followUp.updateMany({
          where: {
            opportunityId,
            scheduleId: schedule.id,
            scheduleType: "STANDARD",
            status: "PENDING",
          },
          data: {
            isActive: true,
          },
        });

        await tx.followUp.updateMany({
          where: {
            opportunityId,
            scheduleId: schedule.id,
            scheduleType: "MANUAL",
            status: "PENDING",
          },
          data: {
            isActive: false,
          },
        });

        await tx.followUpSchedule.update({
          where: {
            id: schedule.id,
          },
          data: {
            mode: "STANDARD",
            isActive: true,
          },
        });
      }

      // ========================================
      // MANUAL MODE
      // ========================================

      if (mode === "MANUAL") {
        const existingManual = await tx.followUp.findFirst({
          where: {
            opportunityId,
            scheduleId: schedule.id,
            scheduleType: "MANUAL",
            status: "PENDING",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // --------------------------------------
        // NO NEW DATE PROVIDED
        // --------------------------------------

        if (!manualFollowUpDate) {
          if (!existingManual?.dueAt) {
            return {
              needsDate: true,
              nextFollowUpAt: null,
              manualDateTime: null,
            };
          }

          await tx.followUp.update({
            where: {
              id: existingManual.id,
            },
            data: {
              isActive: true,
            },
          });

          await tx.followUp.updateMany({
            where: {
              opportunityId,
              scheduleId: schedule.id,
              scheduleType: "STANDARD",
              status: "PENDING",
            },
            data: {
              isActive: false,
            },
          });

          await tx.followUp.updateMany({
            where: {
              opportunityId,
              scheduleId: schedule.id,
              scheduleType: "MANUAL",
              status: "PENDING",
              id: {
                not: existingManual.id,
              },
            },
            data: {
              isActive: false,
            },
          });

          await tx.followUpSchedule.update({
            where: {
              id: schedule.id,
            },
            data: {
              mode: "MANUAL",
              isActive: true,
            },
          });
        }

        // --------------------------------------
        // NEW OR UPDATED MANUAL DATE
        // --------------------------------------

        if (manualFollowUpDate) {
          await tx.followUp.updateMany({
            where: {
              opportunityId,
              scheduleId: schedule.id,
              scheduleType: "STANDARD",
              status: "PENDING",
            },
            data: {
              isActive: false,
            },
          });

          if (existingManual) {
            await tx.followUp.update({
              where: {
                id: existingManual.id,
              },
              data: {
                dueAt: manualFollowUpDate,
                assignedToId: opportunity.assignedToId,
                isActive: true,
                notes: "Manual follow-up scheduled.",
              },
            });

            await tx.followUp.updateMany({
              where: {
                opportunityId,
                scheduleId: schedule.id,
                scheduleType: "MANUAL",
                status: "PENDING",
                id: {
                  not: existingManual.id,
                },
              },
              data: {
                isActive: false,
              },
            });
          } else {
            const displayId = await generateDisplayId(tx, "FLW");

            await tx.followUp.create({
              data: {
                displayId,
                opportunityId,
                scheduleId: schedule.id,
                assignedToId: opportunity.assignedToId,
                dueAt: manualFollowUpDate,
                status: "PENDING",
                scheduleType: "MANUAL",
                sequence: null,
                isActive: true,
                notes: "Manual follow-up scheduled.",
              },
            });
          }

          await tx.followUpSchedule.update({
            where: {
              id: schedule.id,
            },
            data: {
              mode: "MANUAL",
              isActive: true,
            },
          });
        }
      }

      // ========================================
      // GET ACTIVE NEXT FOLLOW-UP
      // ========================================

      const nextFollowUp = await tx.followUp.findFirst({
        where: {
          opportunityId,
          scheduleId: schedule.id,
          isActive: true,
          status: "PENDING",
          dueAt: {
            not: null,
          },
        },
        orderBy: [
          { dueAt: "asc" },
          { createdAt: "asc" },
        ],
        select: {
          dueAt: true,
        },
      });

      return {
        needsDate: false,
        nextFollowUpAt: nextFollowUp?.dueAt?.toISOString() || null,
        manualDateTime:
          mode === "MANUAL"
            ? nextFollowUp?.dueAt?.toISOString() || null
            : null,
      };
    });

    // ==========================================
    // MANUAL DATE REQUIRED
    // ==========================================

    if (result.needsDate) {
      return {
        success: true,
        mode: "MANUAL",
        needsDate: true,
        nextFollowUpAt: null,
        manualDateTime: null,
      };
    }

    // ==========================================
    // REVALIDATE
    // ==========================================

    revalidateOpportunityPages(opportunityId);

    return {
      success: true,
      mode,
      needsDate: false,
      nextFollowUpAt: result.nextFollowUpAt,
      manualDateTime: result.manualDateTime,
    };
  } catch (error) {
    console.error("Update follow-up mode failed:", error);

    return {
      success: false,
      error: error.message || "Unable to update follow-up schedule.",
    };
  }
}
