
import { prisma } from "@/lib/prisma";

import { getStandardFollowUps } from "@/lib/opportunities/follow-up-schedule";
import { autoAssignServiceTitanJob } from "@/lib/automations/titanJobs/auto-assign";

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
      opportunityDate: true,
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
// CLOSE OPPORTUNITY SERVICE
// ADMIN: ANY OPPORTUNITY
// SALESPERSON: OWN ASSIGNED OPPORTUNITIES
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
      const updateResult = await tx.opportunity.updateMany({
        where: {
          id: opportunity.id,
          status: "OPEN",
          ...(user.role === "SALESPERSON" ? { assignedToId: user.id } : {}),
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

      if (updateResult.count !== 1) {
        throw new Error("OPPORTUNITY_ALREADY_UPDATED");
      }

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

    // ======================================
    // TITAN JOB AUTO ASSIGNMENT
    // Only runs for WON opportunities with a Titan Job ID.
    // ======================================

    let autoAssignment = null;

    if (closeType === "WON" && titanJobId) {
      try {
        autoAssignment = await autoAssignServiceTitanJob(titanJobId);
      } catch (autoAssignError) {
        // Auto Assignment must not prevent Opportunity closing.
        console.error(
          "[Titan Job Auto Assignment] Failed:",
          autoAssignError,
        );

        autoAssignment = {
          success: false,
          status: "FAILED",
          reason: "AUTO_ASSIGNMENT_ERROR",
        };
      }
    }

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

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
      ...(autoAssignment ? { autoAssignment } : {}),
    };
  } catch (error) {
    console.error("Close opportunity service failed:", error);

    if (error.code === "P2002") {
      return {
        success: false,
        error: "This Titan Job ID is already linked to another opportunity.",
      };
    }

    if (error.message === "OPPORTUNITY_ALREADY_UPDATED") {
      return {
        success: false,
        error: "This opportunity has already been updated.",
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

    // ======================================
    // MANUAL DATE VALIDATION
    // ======================================

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

    // ======================================
    // DATABASE TRANSACTION
    // ======================================

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
        const standardFollowUps = getStandardFollowUps(
          opportunity.opportunityDate,
        );

        for (const item of standardFollowUps) {
          const existing = await tx.followUp.findUnique({
            where: {
              scheduleId_sequence: {
                scheduleId: schedule.id,
                sequence: item.sequence,
              },
            },
          });

          if (existing?.status === "PENDING") {
            await tx.followUp.update({
              where: { id: existing.id },
              data: {
                eventType: item.eventType,
                type: item.type,
                dueAt: item.dueAt,
                assignedToId: opportunity.assignedToId,
                scheduleType: "STANDARD",
                isActive: true,
              },
            });
          } else if (!existing) {
            await tx.followUp.create({
              data: {
                opportunityId: opportunity.id,
                scheduleId: schedule.id,
                assignedToId: opportunity.assignedToId,
                eventType: item.eventType,
                type: item.type,
                sequence: item.sequence,
                dueAt: item.dueAt,
                status: "PENDING",
                scheduleType: "STANDARD",
                isActive: true,
                notes: "Automatically scheduled standard follow-up.",
              },
            });
          }
        }

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
        const existingManual = await tx.followUp.findFirst({
          where: {
            scheduleId: schedule.id,
            sequence: 6,
            scheduleType: "MANUAL",
          },
        });

        // ======================================
        // MANUAL MODE WITHOUT A NEW DATE
        // ======================================

        if (!manualFollowUpDate) {
          if (!existingManual?.dueAt) {
            return {
              needsDate: true,
              nextFollowUpAt: null,
              manualDateTime: null,
            };
          }

          if (existingManual.status !== "PENDING") {
            throw new Error(
              "The existing manual follow-up is no longer pending. A new manual follow-up cannot be created in this schedule.",
            );
          }

          // Deactivate pending standard follow-ups.
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

          // Activate the existing manual follow-up.
          await tx.followUp.update({
            where: {
              id: existingManual.id,
            },
            data: {
              eventType: "MANUAL",
              type: "CALL",
              sequence: 6,
              assignedToId: opportunity.assignedToId,
              isActive: true,
            },
          });
        }

        // ======================================
        // MANUAL MODE WITH A NEW DATE
        // ======================================

        if (manualFollowUpDate) {
          // Deactivate pending standard follow-ups.
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
            if (existingManual.status !== "PENDING") {
              throw new Error(
                "The existing manual follow-up is no longer pending. A new manual follow-up cannot be created in this schedule.",
              );
            }

            await tx.followUp.update({
              where: {
                id: existingManual.id,
              },
              data: {
                eventType: "MANUAL",
                type: "CALL",
                sequence: 6,
                dueAt: manualFollowUpDate,
                assignedToId: opportunity.assignedToId,
                isActive: true,
                notes: "Manual CALL follow-up scheduled.",
              },
            });
          } else {
            await tx.followUp.create({
              data: {
                opportunityId: opportunity.id,
                scheduleId: schedule.id,
                assignedToId: opportunity.assignedToId,
                eventType: "MANUAL",
                type: "CALL",
                sequence: 6,
                dueAt: manualFollowUpDate,
                status: "PENDING",
                scheduleType: "MANUAL",
                isActive: true,
                notes: "Manual CALL follow-up scheduled.",
              },
            });
          }
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
          mode === "MANUAL"
            ? nextFollowUp?.dueAt?.toISOString() || null
            : null,
      };
    });

    // ======================================
    // MANUAL DATE REQUIRED
    // ======================================

    if (result.needsDate) {
      return {
        success: true,
        mode: "MANUAL",
        needsDate: true,
        nextFollowUpAt: null,
        manualDateTime: null,
      };
    }

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

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
