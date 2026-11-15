import { prisma } from "@/lib/prisma";

// ============================================
// SHARED ACCESS VALIDATION
// ============================================

async function getAuthorizedOpportunity(user, opportunityId) {
  if (!user || !["ADMIN", "SALESPERSON"].includes(user.role)) {
    throw new Error("Unauthorized.");
  }

  if (!opportunityId) {
    throw new Error("Opportunity ID is required.");
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      assignedToId: true,
      status: true,
    },
  });

  if (!opportunity) {
    throw new Error("Opportunity not found.");
  }

  if (user.role === "SALESPERSON" && opportunity.assignedToId !== user.id) {
    throw new Error("You are not authorized to manage this opportunity.");
  }

  if (opportunity.status !== "OPEN") {
    throw new Error("Only open opportunities can be updated.");
  }

  return opportunity;
}

// ============================================
// DATE HELPER
// ============================================

function parseDateTime(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ============================================
// CLOSE OPPORTUNITY SERVICE — ADMIN ONLY
// ============================================

export async function closeOpportunityService({
  user,
  opportunityId,
  action,
  payload = {},
}) {
  try {
    // This closing workflow is Admin-only for now.
    if (!user || user.role !== "ADMIN") {
      return {
        success: false,
        error: "Only Admin users can close opportunities.",
      };
    }

    const opportunity = await getAuthorizedOpportunity(user, opportunityId);

    if (action !== "CLOSE") {
      return {
        success: false,
        error: "Invalid opportunity action.",
      };
    }

    const closeType = payload.closeType;
    const note = typeof payload.note === "string" ? payload.note.trim() : "";

    const allowedCloseTypes = ["WON", "LOST", "SCHEDULE_REOPEN"];

    if (!allowedCloseTypes.includes(closeType)) {
      return {
        success: false,
        error: "Please select a valid closing type.",
      };
    }

    const now = new Date();
    let reopenAt = null;
    let titanJobId = null;

    // ======================================
    // WON — OPTIONAL TITAN JOB ID
    // ======================================

    if (closeType === "WON") {
      titanJobId =
        typeof payload.titanJobId === "string" ? payload.titanJobId.trim() : "";

      // An empty value does not clear an existing Titan Job ID.
      if (!titanJobId) {
        titanJobId = undefined;
      }
    }

    // ======================================
    // SCHEDULE REOPEN — REQUIRED DATE
    // ======================================

    if (closeType === "SCHEDULE_REOPEN") {
      reopenAt = parseDateTime(payload.reopenAt);

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

    // ======================================
    // STATUS AND ACTIVITY DESCRIPTION
    // ======================================

    const statusMap = {
      WON: "WON",
      LOST: "LOST",
      SCHEDULE_REOPEN: "SCHEDULED_TO_REOPEN",
    };

    const nextStatus = statusMap[closeType];

    let activityDescription = "";

    switch (closeType) {
      case "WON":
        activityDescription = "Opportunity marked as WON.";
        break;

      case "LOST":
        activityDescription = "Opportunity marked as LOST.";
        break;

      case "SCHEDULE_REOPEN":
        activityDescription = `Opportunity scheduled to reopen on ${reopenAt.toLocaleString()}.`;
        break;
    }

    if (note) {
      activityDescription += ` Note: ${note}`;
    }

    // ======================================
    // DATABASE TRANSACTION
    // ======================================

    await prisma.$transaction(async (tx) => {
      await tx.opportunity.update({
        where: {
          id: opportunity.id,
          status: "OPEN",
        },
        data: {
          status: nextStatus,
          closedAt: now,
          closedById: user.id,
          reopenAt,
          ...(closeType === "WON" && titanJobId !== undefined
            ? { titanJobId }
            : {}),
        },
      });

      // Keep the closing note in the Activity record.
      // Do not overwrite existing Opportunity.notes.
      await tx.activity.create({
        data: {
          opportunityId: opportunity.id,
          userId: user.id,
          type: "STATUS_CHANGE",
          description: activityDescription,
        },
      });

      // Deactivate pending follow-ups.
      await tx.followUp.updateMany({
        where: {
          opportunityId: opportunity.id,
          status: "PENDING",
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Deactivate active follow-up schedules.
      await tx.followUpSchedule.updateMany({
        where: {
          opportunityId: opportunity.id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    const messages = {
      WON: "Opportunity marked as WON successfully.",
      LOST: "Opportunity marked as LOST successfully.",
      SCHEDULE_REOPEN:
        "Opportunity closed and scheduled to reopen successfully.",
    };

    return {
      success: true,
      action: "CLOSE",
      status: nextStatus,
      message: messages[closeType],
    };
  } catch (error) {
    console.error("Close opportunity service failed:", error);

    // A Titan Job ID is unique in the Opportunity table.
    if (error.code === "P2002") {
      return {
        success: false,
        error: "This Titan Job ID is already linked to another opportunity.",
      };
    }

    return {
      success: false,
      error: error.message || "Unable to close opportunity.",
    };
  }
}

// ============================================
// UPDATE FOLLOW-UP MODE SERVICE
// ============================================

export async function updateFollowUpModeService({
  user,
  opportunityId,
  mode,
  manualDateTime = "",
}) {
  try {
    const opportunity = await getAuthorizedOpportunity(user, opportunityId);

    if (!["STANDARD", "MANUAL"].includes(mode)) {
      return {
        success: false,
        error: "Invalid follow-up mode.",
      };
    }

    let manualFollowUpDate = null;

    if (mode === "MANUAL" && manualDateTime) {
      manualFollowUpDate = parseDateTime(manualDateTime);

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
          opportunityId: opportunity.id,
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
            opportunityId: opportunity.id,
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
            opportunityId: opportunity.id,
            scheduleId: schedule.id,
            scheduleType: "MANUAL",
            status: "PENDING",
          },
          data: {
            isActive: false,
          },
        });

        await tx.followUpSchedule.update({
          where: { id: schedule.id },
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
            opportunityId: opportunity.id,
            scheduleId: schedule.id,
            scheduleType: "MANUAL",
            status: "PENDING",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Activate previously saved manual date.
        if (!manualFollowUpDate) {
          if (!existingManual?.dueAt) {
            return {
              needsDate: true,
              nextFollowUpAt: null,
              manualDateTime: null,
            };
          }

          await tx.followUp.update({
            where: { id: existingManual.id },
            data: { isActive: true },
          });

          await tx.followUp.updateMany({
            where: {
              opportunityId: opportunity.id,
              scheduleId: schedule.id,
              scheduleType: "STANDARD",
              status: "PENDING",
            },
            data: { isActive: false },
          });

          await tx.followUp.updateMany({
            where: {
              opportunityId: opportunity.id,
              scheduleId: schedule.id,
              scheduleType: "MANUAL",
              status: "PENDING",
              id: { not: existingManual.id },
            },
            data: { isActive: false },
          });

          await tx.followUpSchedule.update({
            where: { id: schedule.id },
            data: {
              mode: "MANUAL",
              isActive: true,
            },
          });
        }

        // Create or update manual follow-up date.
        if (manualFollowUpDate) {
          await tx.followUp.updateMany({
            where: {
              opportunityId: opportunity.id,
              scheduleId: schedule.id,
              scheduleType: "STANDARD",
              status: "PENDING",
            },
            data: { isActive: false },
          });

          if (existingManual) {
            await tx.followUp.update({
              where: { id: existingManual.id },
              data: {
                dueAt: manualFollowUpDate,
                assignedToId: opportunity.assignedToId,
                isActive: true,
                notes: "Manual follow-up scheduled.",
              },
            });

            await tx.followUp.updateMany({
              where: {
                opportunityId: opportunity.id,
                scheduleId: schedule.id,
                scheduleType: "MANUAL",
                status: "PENDING",
                id: { not: existingManual.id },
              },
              data: { isActive: false },
            });
          } else {
            await tx.followUp.create({
              data: {
                opportunityId: opportunity.id,
                scheduleId: schedule.id,
                assignedToId: opportunity.assignedToId,
                dueAt: manualFollowUpDate,
                status: "PENDING",
                scheduleType: "MANUAL",
                isActive: true,
                notes: "Manual follow-up scheduled.",
              },
            });
          }

          await tx.followUpSchedule.update({
            where: { id: schedule.id },
            data: {
              mode: "MANUAL",
              isActive: true,
            },
          });
        }
      }

      // ======================================
      // GET NEXT ACTIVE FOLLOW-UP
      // ======================================

      const nextFollowUp = await tx.followUp.findFirst({
        where: {
          opportunityId: opportunity.id,
          scheduleId: schedule.id,
          isActive: true,
          status: "PENDING",
          dueAt: { not: null },
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

    return {
      success: true,
      mode,
      needsDate: false,
      nextFollowUpAt: result.nextFollowUpAt,
      manualDateTime: result.manualDateTime,
    };
  } catch (error) {
    console.error("Update follow-up mode service failed:", error);

    return {
      success: false,
      error: error.message || "Unable to update follow-up schedule.",
    };
  }
}
