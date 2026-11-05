"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

function parseOpportunityDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
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

async function verifyAccess(opportunityId) {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized.");
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      customerId: true,
      assignedToId: true,
      source: true,
      status: true,
    },
  });

  if (!opportunity) {
    throw new Error("Opportunity not found.");
  }

  return { user, opportunity };
}

function revalidateOpportunityPages(opportunityId) {
  revalidatePath(`/admin/opportunities/${opportunityId}`);
  revalidatePath(`/admin/opportunities/${opportunityId}/edit`);
  revalidatePath("/admin/opportunities");
  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/sales-revenue");
}

// ============================================
// UPDATE OPPORTUNITY
// ============================================

export async function updateOpportunity(previousState, formData) {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== "ADMIN") {
    return {
      error: "update",
      values: {},
    };
  }

  const opportunityId = String(formData.get("opportunityId") || "").trim();

  const pocName = String(formData.get("pocName") || "").trim();

  const businessName = String(formData.get("businessName") || "").trim();

  const jobType = String(formData.get("jobType") || "").trim();

  const email = String(formData.get("email") || "").trim();

  const textMessage = String(formData.get("textMessage") || "").trim();

  const phone = String(formData.get("phone") || "").trim();

  const location = String(formData.get("location") || "").trim();

  const valueInput = String(formData.get("value") || "0").trim();

  // Preserve form values after validation errors.
  const values = {
    pocName,
    businessName,
    jobType,
    email,
    textMessage,
    phone,
    location,
    value: valueInput,
  };

  // Required fields
  // Opportunity Date intentionally excluded.
  if (!opportunityId || !businessName || !jobType) {
    return {
      error: "required",
      values,
    };
  }

  // Validate email
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      error: "email",
      values,
    };
  }

  // Validate dollar value
  const opportunityValue = Number(valueInput);

  if (
    valueInput === "" ||
    !Number.isFinite(opportunityValue) ||
    opportunityValue < 0
  ) {
    return {
      error: "value",
      values,
    };
  }

  try {
    const opportunity = await prisma.opportunity.findUnique({
      where: {
        id: opportunityId,
      },
      select: {
        id: true,
        customerId: true,
        status: true,
      },
    });

    if (!opportunity) {
      return {
        error: "opportunity",
        values,
      };
    }

    // Only OPEN opportunities can be edited.
    if (opportunity.status !== "OPEN") {
      return {
        error: "status",
        values,
      };
    }

    await prisma.$transaction(async (tx) => {
      // Update Customer information.
      await tx.customer.update({
        where: {
          id: opportunity.customerId,
        },
        data: {
          businessName,
          pocName: pocName || null,
          email: email || null,
          phone: phone || null,
          location: location || null,
        },
      });

      // Update Opportunity information.
      // Existing opportunityDate remains unchanged.
      await tx.opportunity.update({
        where: {
          id: opportunityId,
        },
        data: {
          title: businessName,
          jobType,
          textMessage: textMessage || null,
          value: opportunityValue,
        },
      });
    });

    revalidateOpportunityPages(opportunityId);
  } catch (error) {
    console.error("Update opportunity error:", error);

    return {
      error: "update",
      values,
    };
  }

  redirect(`/admin/opportunities/${opportunityId}`);
}

// ============================================
// UPDATE OPPORTUNITY STATUS / ACTIONS
// ============================================

export async function updateOpportunityStatus(
  opportunityId,
  action,
  payload = {},
) {
  try {
    const { user, opportunity } = await verifyAccess(opportunityId);

    if (opportunity.status !== "OPEN") {
      return {
        success: false,
        error: "Only open opportunities can be updated.",
      };
    }

    const note = typeof payload.note === "string" ? payload.note.trim() : "";

    const now = new Date();

    // ========================================
    // WON
    // ========================================

    if (action === "WON") {
      const finalValue = Number(payload.finalValue);

      if (
        payload.finalValue === "" ||
        payload.finalValue === null ||
        payload.finalValue === undefined ||
        !Number.isFinite(finalValue) ||
        finalValue < 0
      ) {
        return {
          success: false,
          error: "Please enter a valid Final Value.",
        };
      }

      await prisma.$transaction(async (tx) => {
        const existingSale = await tx.sale.findUnique({
          where: {
            opportunityId,
          },
          select: {
            id: true,
          },
        });

        if (existingSale) {
          throw new Error("A sale already exists for this opportunity.");
        }

        const updatedOpportunity = await tx.opportunity.update({
          where: {
            id: opportunityId,
            status: "OPEN",
          },
          data: {
            status: "WON",
            closedAt: now,
            closedById: user.id,
          },
        });

        const saleDisplayId = await generateDisplayId(tx, "SAL");

        await tx.sale.create({
          data: {
            displayId: saleDisplayId,
            opportunityId,
            closedById: user.id,
            saleValue: finalValue,
            source: updatedOpportunity.source,
            notes: note || null,
            closedAt: now,
          },
        });

        await tx.activity.create({
          data: {
            opportunityId,
            userId: user.id,
            type: "STATUS_CHANGE",
            description: note
              ? `Opportunity marked as Won. Final Value: $${finalValue.toFixed(2)}. Note: ${note}`
              : `Opportunity marked as Won. Final Value: $${finalValue.toFixed(2)}.`,
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
    }

    // ========================================
    // LOST
    // ========================================
    else if (action === "LOST") {
      await prisma.$transaction(async (tx) => {
        await tx.opportunity.update({
          where: {
            id: opportunityId,
            status: "OPEN",
          },
          data: {
            status: "LOST",
            closedAt: now,
            closedById: user.id,
          },
        });

        await tx.activity.create({
          data: {
            opportunityId,
            userId: user.id,
            type: "STATUS_CHANGE",
            description: note
              ? `Opportunity marked as Lost. Note: ${note}`
              : "Opportunity marked as Lost.",
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
    }

    // ========================================
    // CLOSE ACTIONS
    // ========================================
    else if (action === "CLOSE") {
      const closeType = payload.closeType;

      const closeStatuses = {
        TEMPORARY: "TEMPORARILY_CLOSED",
        PERMANENT: "PERMANENTLY_CLOSED",
        SCHEDULE_REOPEN: "SCHEDULED_TO_REOPEN",
      };

      const nextStatus = closeStatuses[closeType];

      if (!nextStatus) {
        return {
          success: false,
          error: "Invalid close action.",
        };
      }

      let reopenAt = null;

      if (closeType === "SCHEDULE_REOPEN") {
        reopenAt = parseManualDateTime(payload.reopenAt);

        if (!reopenAt) {
          return {
            success: false,
            error: "Please select a valid reopen date and time.",
          };
        }

        if (reopenAt <= now) {
          return {
            success: false,
            error: "Reopen date and time must be in the future.",
          };
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.opportunity.update({
          where: {
            id: opportunityId,
            status: "OPEN",
          },
          data: {
            status: nextStatus,
            closedAt: now,
            closedById: user.id,
            reopenAt,
          },
        });

        const descriptions = {
          TEMPORARY: "Opportunity temporarily closed.",
          PERMANENT: "Opportunity permanently closed.",
          SCHEDULE_REOPEN: `Opportunity scheduled to reopen on ${reopenAt.toLocaleString()}.`,
        };

        await tx.activity.create({
          data: {
            opportunityId,
            userId: user.id,
            type: "STATUS_CHANGE",
            description: note
              ? `${descriptions[closeType]} Note: ${note}`
              : descriptions[closeType],
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
    } else {
      return {
        success: false,
        error: "Invalid opportunity action.",
      };
    }

    revalidateOpportunityPages(opportunityId);

    return {
      success: true,
      action,
    };
  } catch (error) {
    console.error("Update opportunity status failed:", error);

    return {
      success: false,
      error: error.message || "Unable to update opportunity.",
    };
  }
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

      // ======================================
      // STANDARD MODE
      // ======================================

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

      // ======================================
      // MANUAL MODE
      // ======================================

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

        // ====================================
        // NO NEW DATE PROVIDED
        // ====================================

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

        // ====================================
        // NEW OR UPDATED MANUAL DATE
        // ====================================

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

      // ======================================
      // GET ACTIVE NEXT FOLLOW-UP
      // ======================================

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
        orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
        select: {
          dueAt: true,
        },
      });

      return {
        needsDate: false,
        nextFollowUpAt: nextFollowUp?.dueAt?.toISOString() || null,
        manualDateTime:
          mode === "MANUAL" ? nextFollowUp?.dueAt?.toISOString() || null : null,
      };
    });

    if (result.needsDate) {
      return {
        success: true,
        mode: "MANUAL",
        needsDate: true,
        nextFollowUpAt: null,
        manualDateTime: null,
      };
    }

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
