"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// ============================================
// HELPERS
// ============================================

function getFormValue(formData, key) {
  return formData.get(key)?.toString().trim() || "";
}

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

  // ------------------------------------------
  // FORM VALUES
  // ------------------------------------------

  const opportunityId = getFormValue(formData, "opportunityId");
  const stCustomerId = getFormValue(formData, "stCustomerId");
  const opportunityDateInput = getFormValue(formData, "opportunityDate");

  const pocName = getFormValue(formData, "pocName");
  const businessName = getFormValue(formData, "businessName");
  const jobType = getFormValue(formData, "jobType");

  const email = getFormValue(formData, "email");
  const textMessage = getFormValue(formData, "textMessage");
  const phone = getFormValue(formData, "phone");
  const location = getFormValue(formData, "location");

  const valueInput = getFormValue(formData, "value");
  const requestedAssignedToId = getFormValue(formData, "assignedToId");

  // Preserve form values after validation errors.
  const values = {
    stCustomerId,
    opportunityDate: opportunityDateInput,
    pocName,
    businessName,
    jobType,
    email,
    textMessage,
    phone,
    location,
    value: valueInput,
    assignedToId: requestedAssignedToId || user.id,
  };

  // ------------------------------------------
  // REQUIRED FIELD VALIDATION
  // ------------------------------------------

  if (
    !opportunityId ||
    !opportunityDateInput ||
    !pocName ||
    valueInput === ""
  ) {
    return {
      error: "required",
      values,
    };
  }

  // ------------------------------------------
  // DATE VALIDATION
  // ------------------------------------------

  const opportunityDate = parseOpportunityDate(opportunityDateInput);

  if (!opportunityDate) {
    return {
      error: "date",
      values,
    };
  }

  // ------------------------------------------
  // EMAIL VALIDATION
  // ------------------------------------------

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      error: "email",
      values,
    };
  }

  // ------------------------------------------
  // OPPORTUNITY VALUE VALIDATION
  // ------------------------------------------

  const opportunityValue = Number(valueInput);

  if (!Number.isFinite(opportunityValue) || opportunityValue < 0) {
    return {
      error: "value",
      values,
    };
  }

  // ------------------------------------------
  // ASSIGNMENT VALIDATION
  // ------------------------------------------

  // Admin can assign an opportunity to:
  // 1. Themselves.
  // 2. An active Salesperson.

  const assignedToId = requestedAssignedToId || user.id;

  if (assignedToId !== user.id) {
    const selectedUser = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        role: "SALESPERSON",
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!selectedUser) {
      return {
        error: "assignee",
        values,
      };
    }
  }

  // ------------------------------------------
  // AUTOMATIC OPPORTUNITY SOURCE
  // ------------------------------------------

  // Admin assigning to themselves = SELF_GENERATED.
  // Admin assigning to another salesperson = COMPANY_GENERATED.

  const source =
    assignedToId === user.id ? "SELF_GENERATED" : "COMPANY_GENERATED";

  try {
    // ----------------------------------------
    // FIND OPPORTUNITY
    // ----------------------------------------

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

    // ----------------------------------------
    // DATABASE TRANSACTION
    // ----------------------------------------

    await prisma.$transaction(async (tx) => {
      // --------------------------------------
      // CUSTOMER MATCHING
      // --------------------------------------

      let customer = null;

      // 1. Match by ServiceTitan Customer ID.
      if (stCustomerId) {
        customer = await tx.customer.findUnique({
          where: {
            stCustomerId,
          },
        });
      }

      // 2. If no matching ServiceTitan Customer
      // exists, use the current Opportunity Customer.
      if (!customer) {
        customer = await tx.customer.findUnique({
          where: {
            id: opportunity.customerId,
          },
        });
      }

      // --------------------------------------
      // CUSTOMER CREATE / UPDATE
      // --------------------------------------

      if (customer) {
        customer = await tx.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            stCustomerId: stCustomerId || customer.stCustomerId,
            businessName: businessName || null,
            pocName,
            email: email || null,
            phone: phone || null,
            location: location || null,
          },
        });
      } else {
        const customerDisplayId = await generateDisplayId(tx, "CM");

        customer = await tx.customer.create({
          data: {
            displayId: customerDisplayId,
            stCustomerId: stCustomerId || null,
            businessName: businessName || null,
            pocName,
            email: email || null,
            phone: phone || null,
            location: location || null,
          },
        });
      }

      // --------------------------------------
      // UPDATE OPPORTUNITY
      // --------------------------------------

      const opportunityTitle = [businessName || pocName, jobType]
        .filter(Boolean)
        .join(" - ");

      await tx.opportunity.update({
        where: {
          id: opportunityId,
        },
        data: {
          customerId: customer.id,
          title: opportunityTitle,
          opportunityDate,
          jobType: jobType || null,
          textMessage: textMessage || null,
          value: opportunityValue,
          assignedToId,
          source,
        },
      });

      // --------------------------------------
      // UPDATE PENDING FOLLOW-UP ASSIGNMENTS
      // --------------------------------------

      await tx.followUp.updateMany({
        where: {
          opportunityId,
          status: "PENDING",
        },
        data: {
          assignedToId,
        },
      });
    });

    // ----------------------------------------
    // REVALIDATE
    // ----------------------------------------

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
// CLOSE OPPORTUNITY
// ============================================

export async function updateOpportunityStatus(
  opportunityId,
  action,
  payload = {},
) {
  try {
    const { user, opportunity } = await verifyAccess(opportunityId);

    // Only OPEN opportunities can be closed.
    if (opportunity.status !== "OPEN") {
      return {
        success: false,
        error: "Only open opportunities can be closed.",
      };
    }

    // Only CLOSE action is supported.
    if (action !== "CLOSE") {
      return {
        success: false,
        error: "Invalid opportunity action.",
      };
    }

    const note = typeof payload.note === "string" ? payload.note.trim() : "";

    const closeType = payload.closeType;
    const now = new Date();

    // ------------------------------------------
    // ALLOWED CLOSE TYPES
    // ------------------------------------------

    const closeStatuses = {
      TEMPORARY: "TEMPORARILY_CLOSED",
      SCHEDULE_REOPEN: "SCHEDULED_TO_REOPEN",
    };

    const nextStatus = closeStatuses[closeType];

    if (!nextStatus) {
      return {
        success: false,
        error: "Please select a valid closing option.",
      };
    }

    // ------------------------------------------
    // VALIDATE REOPEN DATE
    // ------------------------------------------

    let reopenAt = null;

    if (closeType === "SCHEDULE_REOPEN") {
      reopenAt = parseManualDateTime(payload.reopenAt);

      if (!reopenAt) {
        return {
          success: false,
          error: "Please select a valid reopening date and time.",
        };
      }

      if (reopenAt <= now) {
        return {
          success: false,
          error: "Reopening date and time must be in the future.",
        };
      }
    }

    // ------------------------------------------
    // DATABASE TRANSACTION
    // ------------------------------------------

    await prisma.$transaction(async (tx) => {
      // Close the opportunity.
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

      // ----------------------------------------
      // CREATE ACTIVITY
      // ----------------------------------------

      const descriptions = {
        TEMPORARY: "Opportunity temporarily closed.",
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

      // ----------------------------------------
      // DEACTIVATE PENDING FOLLOW-UPS
      // ----------------------------------------

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

      // ----------------------------------------
      // DEACTIVATE FOLLOW-UP SCHEDULE
      // ----------------------------------------

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

    // ------------------------------------------
    // REVALIDATE
    // ------------------------------------------

    revalidateOpportunityPages(opportunityId);

    return {
      success: true,
      action: "CLOSE",
      status: nextStatus,
      message:
        closeType === "TEMPORARY"
          ? "Opportunity temporarily closed successfully."
          : "Opportunity closed and scheduled to reopen successfully.",
    };
  } catch (error) {
    console.error("Close opportunity failed:", error);

    return {
      success: false,
      error: error.message || "Unable to close opportunity.",
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

        // ------------------------------------
        // NO NEW DATE PROVIDED
        // ------------------------------------

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

        // ------------------------------------
        // NEW OR UPDATED MANUAL DATE
        // ------------------------------------

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
