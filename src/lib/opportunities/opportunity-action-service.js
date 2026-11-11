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

  // Salesperson can only manage their own assigned opportunity.
  if (user.role === "SALESPERSON" && opportunity.assignedToId !== user.id) {
    throw new Error("You are not authorized to manage this opportunity.");
  }

  if (opportunity.status !== "OPEN") {
    throw new Error("Only open opportunities can be updated.");
  }

  return opportunity;
}

// ============================================
// DATE HELPERS
// ============================================

function parseDateTime(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

// ============================================
// CLOSE OPPORTUNITY SERVICE
// ============================================

export async function closeOpportunityService({
  user,
  opportunityId,
  action,
  payload = {},
}) {
  try {
    const opportunity = await getAuthorizedOpportunity(user, opportunityId);

    if (action !== "CLOSE") {
      return {
        success: false,
        error: "Invalid opportunity action.",
      };
    }

    const closeType = payload.closeType;

    const note = typeof payload.note === "string" ? payload.note.trim() : "";

    // Map closing type to opportunity status.
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

    const now = new Date();
    let reopenAt = null;

    // Validate scheduled reopening date.
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

    // Build activity description only for the selected close type.
    // This prevents calling toLocaleString() when reopenAt is null.
    const descriptions = {
      TEMPORARY: "Opportunity temporarily closed.",
      SCHEDULE_REOPEN: `Opportunity scheduled to reopen on ${reopenAt?.toLocaleString() || "the selected date"}.`,
    };

    const activityDescription = note
      ? `${descriptions[closeType]} Note: ${note}`
      : descriptions[closeType];

    await prisma.$transaction(async (tx) => {
      // Update opportunity status.
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
        },
      });

      // Record opportunity status change.
      await tx.activity.create({
        data: {
          opportunityId: opportunity.id,
          userId: user.id,
          type: "STATUS_CHANGE",
          description: activityDescription,
        },
      });

      // Deactivate all active pending follow-ups.
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
    console.error("Close opportunity service failed:", error);

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

    // Validate follow-up mode.
    if (!["STANDARD", "MANUAL"].includes(mode)) {
      return {
        success: false,
        error: "Invalid follow-up mode.",
      };
    }

    let manualFollowUpDate = null;

    // Validate manual follow-up date when provided.
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
      // Find the active follow-up schedule.
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
        // Activate pending standard follow-ups.
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

        // Deactivate pending manual follow-ups.
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

        // Update schedule mode.
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
        // Find the latest pending manual follow-up.
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

        // --------------------------------------
        // Activate previously saved manual date
        // --------------------------------------

        if (!manualFollowUpDate) {
          if (!existingManual?.dueAt) {
            return {
              needsDate: true,
              nextFollowUpAt: null,
              manualDateTime: null,
            };
          }

          // Activate the existing manual follow-up.
          await tx.followUp.update({
            where: {
              id: existingManual.id,
            },
            data: {
              isActive: true,
            },
          });

          // Deactivate standard follow-ups.
          await tx.followUp.updateMany({
            where: {
              opportunityId: opportunity.id,
              scheduleId: schedule.id,
              scheduleType: "STANDARD",
              status: "PENDING",
            },
            data: {
              isActive: false,
            },
          });

          // Deactivate other pending manual follow-ups.
          await tx.followUp.updateMany({
            where: {
              opportunityId: opportunity.id,
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

          // Update schedule mode.
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
        // Create or update manual follow-up date
        // --------------------------------------

        if (manualFollowUpDate) {
          // Deactivate standard follow-ups.
          await tx.followUp.updateMany({
            where: {
              opportunityId: opportunity.id,
              scheduleId: schedule.id,
              scheduleType: "STANDARD",
              status: "PENDING",
            },
            data: {
              isActive: false,
            },
          });

          if (existingManual) {
            // Update the existing manual follow-up.
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

            // Deactivate other pending manual follow-ups.
            await tx.followUp.updateMany({
              where: {
                opportunityId: opportunity.id,
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
            // Create a new manual follow-up.
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

          // Update schedule mode.
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
      // GET NEXT ACTIVE FOLLOW-UP
      // ======================================

      const nextFollowUp = await tx.followUp.findFirst({
        where: {
          opportunityId: opportunity.id,
          scheduleId: schedule.id,
          isActive: true,
          status: "PENDING",
          dueAt: {
            not: null,
          },
        },
        orderBy: [
          {
            dueAt: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
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

    // Manual mode requires a date when no saved date exists.
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
