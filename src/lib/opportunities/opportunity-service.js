import { prisma } from "@/lib/prisma";

import {
  getFormValue,
  getFormValues,
  getErrorState,
} from "@/lib/opportunities/form-helpers";

import {
  parseDate,
  parseManualFollowUpDate,
} from "@/lib/opportunities/date-helpers";

import {
  getStandardFollowUps,
  getManualFollowUp,
} from "@/lib/opportunities/follow-up-schedule";

import { findOrCreateOpportunityCustomer } from "@/lib/opportunities/customer-helpers";

// ============================================
// CUSTOMER SEARCH
// ============================================

export async function searchOpportunityCustomers(query) {
  const search = query?.trim();

  if (!search || search.length < 2) {
    return [];
  }

  return prisma.customer.findMany({
    where: {
      OR: [
        {
          businessName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          pocName: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      stCustomerId: true,
      businessName: true,
      pocName: true,
      email: true,
      phone: true,
      location: true,
    },
    orderBy: {
      businessName: "asc",
    },
    take: 10,
  });
}

// ============================================
// ASSIGNMENT VALIDATION - CREATE
// ============================================

async function getAssignedToId(user, requestedAssignedToId) {
  if (!user || !["ADMIN", "SALESPERSON"].includes(user.role)) {
    return null;
  }

  // Salesperson can only assign opportunities to themselves.
  if (user.role === "SALESPERSON") {
    return user.id;
  }

  // Admin defaults to self.
  const assignedToId = requestedAssignedToId || user.id;

  // Admin assigning to themselves.
  if (assignedToId === user.id) {
    return user.id;
  }

  // Admin can assign to an active Admin or Salesperson.
  const assignedUser = await prisma.user.findFirst({
    where: {
      id: assignedToId,
      isActive: true,
      role: {
        in: ["ADMIN", "SALESPERSON"],
      },
    },
    select: {
      id: true,
    },
  });

  return assignedUser?.id || null;
}

// ============================================
// ASSIGNMENT VALIDATION - UPDATE
// ============================================

async function getUpdatedAssignedToId(user, requestedAssignedToId) {
  if (!user || !["ADMIN", "SALESPERSON"].includes(user.role)) {
    return null;
  }

  // Salesperson must remain assigned to themselves.
  if (user.role === "SALESPERSON") {
    return user.id;
  }

  // Admin defaults to self.
  const assignedToId = requestedAssignedToId || user.id;

  // Admin assigning to themselves.
  if (assignedToId === user.id) {
    return user.id;
  }

  // Admin can assign to an active Salesperson.
  const assignedUser = await prisma.user.findFirst({
    where: {
      id: assignedToId,
      isActive: true,
      role: "SALESPERSON",
    },
    select: {
      id: true,
    },
  });

  return assignedUser?.id || null;
}

// ============================================
// CREATE OPPORTUNITY SERVICE
// ============================================

export async function createOpportunityService({ user, formData }) {
  const values = getFormValues(formData);

  // Role validation.
  if (!user || !["ADMIN", "SALESPERSON"].includes(user.role)) {
    return getErrorState("permission", values);
  }

  const {
    opportunityDate: opportunityDateInput,
    pocName,
    jobType,
    email,
    textMessage,
    value: valueInput,
    assignedToId: requestedAssignedToId,
    followUpDate: followUpDateInput,
  } = values;

  // ============================================
  // REQUIRED FIELD VALIDATION
  // ============================================

  if (!opportunityDateInput || !pocName || !valueInput) {
    return getErrorState("required", values);
  }

  // ============================================
  // VALUE VALIDATION
  // ============================================

  const opportunityValue = Number(valueInput);

  if (!Number.isFinite(opportunityValue) || opportunityValue < 0) {
    return getErrorState("value", values);
  }

  // ============================================
  // EMAIL VALIDATION
  // ============================================

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return getErrorState("email", values);
  }

  // ============================================
  // DATE VALIDATION
  // ============================================

  const opportunityDate = parseDate(opportunityDateInput);

  if (!opportunityDate) {
    return getErrorState("date", values);
  }

  // ============================================
  // MANUAL FOLLOW-UP VALIDATION
  // ============================================

  const manualFollowUpDate = followUpDateInput
    ? parseManualFollowUpDate(followUpDateInput)
    : null;

  if (followUpDateInput && !manualFollowUpDate) {
    return getErrorState("followUpDate", values);
  }

  if (manualFollowUpDate && manualFollowUpDate <= new Date()) {
    return getErrorState("followUpDatePast", values);
  }

  // ============================================
  // ASSIGNMENT VALIDATION
  // ============================================

  const assignedToId = await getAssignedToId(user, requestedAssignedToId);

  if (!assignedToId) {
    return getErrorState("assignment", values);
  }

  // ============================================
  // OPPORTUNITY SETTINGS
  // ============================================

  const source = assignedToId === user.id ? "SELF_GENERATED" : "COMPANY";

  const hasManualFollowUp = Boolean(manualFollowUpDate);

  const activeScheduleMode = hasManualFollowUp ? "MANUAL" : "STANDARD";

  // ============================================
  // DATABASE TRANSACTION
  // ============================================

  try {
    await prisma.$transaction(async (tx) => {
      // Find or create customer.
      // Create does not perform name-based duplicate matching.
      const customer = await findOrCreateOpportunityCustomer(tx, values, {
        matchNames: false,
        updateMode: "preserve",
      });

      // Create opportunity.
      const opportunity = await tx.opportunity.create({
        data: {
          customerId: customer.id,
          opportunityDate,
          jobType: jobType || null,
          textMessage: textMessage || null,
          value: opportunityValue,
          source,
          status: "OPEN",
          assignedToId,
          createdById: user.id,
        },
      });

      // Create follow-up schedule.
      const schedule = await tx.followUpSchedule.create({
        data: {
          opportunityId: opportunity.id,
          mode: activeScheduleMode,
          isActive: true,
          presentationAt: opportunityDate,
          startedAt: new Date(),
        },
      });

      // Generate standard follow-ups.
      const standardFollowUps = getStandardFollowUps(opportunityDate);

      const followUpRecords = standardFollowUps.map((item) => ({
        opportunityId: opportunity.id,
        scheduleId: schedule.id,
        assignedToId,
        eventType: item.eventType,
        type: item.type,
        sequence: item.sequence,
        dueAt: item.dueAt,
        status: "PENDING",
        scheduleType: "STANDARD",
        isActive: !hasManualFollowUp,
        notes: "Automatically scheduled standard follow-up.",
      }));

      // Add manual follow-up record.
      const manualFollowUp = getManualFollowUp(manualFollowUpDate);

      followUpRecords.push({
        opportunityId: opportunity.id,
        scheduleId: schedule.id,
        assignedToId,
        eventType: manualFollowUp.eventType,
        type: manualFollowUp.type,
        sequence: manualFollowUp.sequence,
        dueAt: manualFollowUp.dueAt,
        status: "PENDING",
        scheduleType: "MANUAL",
        isActive: hasManualFollowUp,
        notes: hasManualFollowUp
          ? "Manually scheduled CALL follow-up."
          : "Manual follow-up not scheduled.",
      });

      // Save all follow-ups.
      await tx.followUp.createMany({
        data: followUpRecords,
      });
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Create opportunity failed:", error);

    return getErrorState("create", values);
  }
}

// ============================================
// UPDATE OPPORTUNITY SERVICE
// ============================================

export async function updateOpportunityService({ user, formData }) {
  const opportunityId = getFormValue(formData, "opportunityId");

  const values = getFormValues(formData);

  const requestedAssignedToId = values.assignedToId;

  // Preserve submitted values for form errors.
  const errorValues = {
    ...values,
    assignedToId:
      user?.role === "SALESPERSON"
        ? user.id
        : requestedAssignedToId || user?.id || "",
  };

  // ============================================
  // ROLE VALIDATION
  // ============================================

  if (!user || !["ADMIN", "SALESPERSON"].includes(user.role)) {
    return getErrorState("permission", errorValues);
  }

  if (!opportunityId) {
    return getErrorState("opportunity", errorValues);
  }

  // ============================================
  // EXTRACT FORM VALUES
  // ============================================

  const {
    opportunityDate: opportunityDateInput,
    pocName,
    jobType,
    email,
    textMessage,
    value: valueInput,
  } = values;

  // ============================================
  // REQUIRED FIELD VALIDATION
  // ============================================

  if (!opportunityDateInput || !pocName || !valueInput) {
    return getErrorState("required", errorValues);
  }

  // ============================================
  // VALUE VALIDATION
  // ============================================

  const opportunityValue = Number(valueInput);

  if (!Number.isFinite(opportunityValue) || opportunityValue < 0) {
    return getErrorState("value", errorValues);
  }

  // ============================================
  // EMAIL VALIDATION
  // ============================================

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return getErrorState("email", errorValues);
  }

  // ============================================
  // DATE VALIDATION
  // ============================================

  const opportunityDate = parseDate(opportunityDateInput);

  if (!opportunityDate) {
    return getErrorState("date", errorValues);
  }

  // ============================================
  // ASSIGNMENT VALIDATION
  // ============================================

  const assignedToId = await getUpdatedAssignedToId(
    user,
    requestedAssignedToId,
  );

  if (!assignedToId) {
    return getErrorState("assignment", errorValues);
  }

  // ============================================
  // OPPORTUNITY SETTINGS
  // ============================================

  const source = assignedToId === user.id ? "SELF_GENERATED" : "COMPANY";

  // ============================================
  // DATABASE TRANSACTION
  // ============================================

  try {
    await prisma.$transaction(async (tx) => {
      // Find opportunity.
      const opportunity = await tx.opportunity.findUnique({
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

      // Opportunity not found.
      if (!opportunity) {
        throw new Error("OPPORTUNITY_NOT_FOUND");
      }

      // Only OPEN opportunities can be edited.
      if (opportunity.status !== "OPEN") {
        throw new Error("OPPORTUNITY_NOT_OPEN");
      }

      // Salesperson can only edit their own opportunities.
      if (user.role === "SALESPERSON" && opportunity.assignedToId !== user.id) {
        throw new Error("OPPORTUNITY_PERMISSION_DENIED");
      }

      // ============================================
      // FIND OR UPDATE CUSTOMER
      // ============================================

      const customer = await findOrCreateOpportunityCustomer(
        tx,
        {
          ...values,
          customerId: opportunity.customerId,
        },
        {
          nameMatch: "both",
          updateMode: "replace",
        },
      );

      // ============================================
      // UPDATE OPPORTUNITY
      // ============================================

      await tx.opportunity.update({
        where: {
          id: opportunityId,
        },
        data: {
          customerId: customer.id,
          opportunityDate,
          jobType: jobType || null,
          textMessage: textMessage || null,
          value: opportunityValue,
          assignedToId,
          source,
        },
      });

      // ============================================
      // RECALCULATE PENDING STANDARD FOLLOW-UPS
      // ============================================

      const updatedStandardFollowUps = getStandardFollowUps(opportunityDate);

      for (const item of updatedStandardFollowUps) {
        await tx.followUp.updateMany({
          where: {
            opportunityId,
            sequence: item.sequence,
            scheduleType: "STANDARD",
            status: "PENDING",
          },
          data: {
            eventType: item.eventType,
            type: item.type,
            dueAt: item.dueAt,
            assignedToId,
          },
        });
      }

      // ============================================
      // UPDATE PENDING MANUAL FOLLOW-UP ASSIGNMENT
      // ============================================

      await tx.followUp.updateMany({
        where: {
          opportunityId,
          scheduleType: "MANUAL",
          status: "PENDING",
        },
        data: {
          assignedToId,
        },
      });

      // ============================================
      // UPDATE FOLLOW-UP SCHEDULE PRESENTATION DATE
      // ============================================

      await tx.followUpSchedule.updateMany({
        where: {
          opportunityId,
        },
        data: {
          presentationAt: opportunityDate,
        },
      });
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Update opportunity failed:", error);

    if (error.message === "OPPORTUNITY_NOT_FOUND") {
      return getErrorState("opportunity", errorValues);
    }

    if (error.message === "OPPORTUNITY_NOT_OPEN") {
      return getErrorState("status", errorValues);
    }

    if (error.message === "OPPORTUNITY_PERMISSION_DENIED") {
      return getErrorState("permission", errorValues);
    }

    return getErrorState("update", errorValues);
  }
}
