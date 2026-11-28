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

import {
  findOrCreateOpportunityCustomer,
  resolveServiceTitanOpportunityCustomer,
  toOpportunityCustomerSnapshot,
} from "@/lib/opportunities/customer-helpers";

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
// SHARED ASSIGNMENT VALIDATION
// ============================================

async function getAssignedToId(
  user,
  requestedAssignedToId,
  currentAssignedToId = null,
) {
  if (!user || !["ADMIN", "SALESPERSON"].includes(user.role)) {
    return null;
  }

  // Salespersons can only assign opportunities to themselves.
  if (user.role === "SALESPERSON") {
    return user.id;
  }

  // Admin defaults to self.
  const assignedToId = requestedAssignedToId || user.id;

  // Admin assigning to themselves.
  if (assignedToId === user.id) {
    return user.id;
  }

  // Keep the existing assignee even if currently inactive.
  if (assignedToId === currentAssignedToId) {
    return currentAssignedToId;
  }

  // Admin can assign to any active Admin or Salesperson.
  const assignedUser = await prisma.user.findFirst({
    where: {
      id: assignedToId,
      status: "ACTIVE",
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
// SHARED ROLE VALIDATION
// ============================================

function isAuthorizedUser(user) {
  return Boolean(user && ["ADMIN", "SALESPERSON"].includes(user.role));
}

// ============================================
// CREATE OPPORTUNITY SERVICE
// ============================================

export async function createOpportunityService({ user, formData }) {
  const values = getFormValues(formData);

  // ============================================
  // ROLE VALIDATION
  // ============================================

  if (!isAuthorizedUser(user)) {
    return getErrorState("permission", values);
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
    assignedToId: requestedAssignedToId,
    followUpDate: followUpDateInput,
  } = values;

  // ============================================
  // REQUIRED FIELD VALIDATION
  // ============================================

  if (!opportunityDateInput || !valueInput) {
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
  // OPPORTUNITY DATE VALIDATION
  // ============================================

  const opportunityDate = parseDate(opportunityDateInput);

  if (!opportunityDate) {
    return getErrorState("date", values);
  }

  // ============================================
  // MANUAL FOLLOW-UP DATE VALIDATION
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

  if (manualFollowUpDate && manualFollowUpDate < opportunityDate) {
    return getErrorState("followUpDate", values);
  }

  // ============================================
  // ASSIGNMENT VALIDATION
  // ============================================

  let assignedToId;

  try {
    assignedToId = await getAssignedToId(user, requestedAssignedToId);
  } catch (error) {
    console.error("Opportunity assignment validation failed:", error);

    return getErrorState("assignment", values);
  }

  if (!assignedToId) {
    return getErrorState("assignment", values);
  }

  // ============================================
  // OPPORTUNITY SETTINGS
  // ============================================

  const source = assignedToId === user.id ? "SELF_GENERATED" : "COMPANY";

  const hasManualFollowUp = Boolean(manualFollowUpDate);

  const activeScheduleMode = hasManualFollowUp ? "MANUAL" : "STANDARD";

  let titanCustomer;
  try {
    titanCustomer = await resolveServiceTitanOpportunityCustomer(values);
  } catch (error) {
    console.error("ServiceTitan customer validation failed:", error);
    return getErrorState("customerLookup", values);
  }

  if (titanCustomer && !values.stCustomerId) {
    return getErrorState("duplicateCustomer", values);
  }

  // ============================================
  // DATABASE TRANSACTION
  // ============================================

  try {
    let createdOpportunityId = null;

    await prisma.$transaction(async (tx) => {
      // ----------------------------------------
      // FIND OR CREATE CUSTOMER
      // ----------------------------------------

      const localCustomer = titanCustomer
        ? null
        : await findOrCreateOpportunityCustomer(tx, values, {
            matchNames: false,
            updateMode: "preserve",
          });
      const customerSnapshot = titanCustomer
        ? toOpportunityCustomerSnapshot(titanCustomer, values)
        : null;

      // ----------------------------------------
      // CREATE OPPORTUNITY
      // ----------------------------------------

      const opportunity = await tx.opportunity.create({
        data: {
          customerId: titanCustomer
            ? customerSnapshot.stCustomerId
            : localCustomer.id,
          customerSource: titanCustomer ? "SERVICETITAN" : "POSTGRES",
          localCustomerId: localCustomer?.id || null,
          ...(customerSnapshot ? { customerSnapshot } : {}),
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
      createdOpportunityId = opportunity.id;

      // ----------------------------------------
      // CREATE FOLLOW-UP SCHEDULE
      // ----------------------------------------

      const schedule = await tx.followUpSchedule.create({
        data: {
          opportunityId: opportunity.id,
          mode: activeScheduleMode,
          isActive: true,
          presentationAt: opportunityDate,
          startedAt: new Date(),
        },
      });

      // Create only the selected schedule mode. Inactive alternative rows
      // caused duplicate follow-up records to accumulate for every opportunity.
      let followUpRecords;

      if (hasManualFollowUp) {
        const manualFollowUp = getManualFollowUp(manualFollowUpDate);
        followUpRecords = [{
              opportunityId: opportunity.id,
              scheduleId: schedule.id,
              assignedToId,
              eventType: manualFollowUp.eventType,
              type: manualFollowUp.type,
              sequence: manualFollowUp.sequence,
              dueAt: manualFollowUp.dueAt,
              status: "PENDING",
              scheduleType: "MANUAL",
              isActive: true,
              notes: "Manually scheduled CALL follow-up.",
            }];
      } else {
        followUpRecords = getStandardFollowUps(opportunityDate).map((item) => ({
            opportunityId: opportunity.id,
            scheduleId: schedule.id,
            assignedToId,
            eventType: item.eventType,
            type: item.type,
            sequence: item.sequence,
            dueAt: item.dueAt,
            status: "PENDING",
            scheduleType: "STANDARD",
            isActive: true,
            notes: "Automatically scheduled standard follow-up.",
          }));
      }

      // ----------------------------------------
      // SAVE FOLLOW-UPS FOR THE ACTIVE MODE
      // ----------------------------------------

      await tx.followUp.createMany({ data: followUpRecords });
    }, { maxWait: 10000, timeout: 30000 });

    return {
      success: true,
      opportunityId: createdOpportunityId,
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

  // ============================================
  // PRESERVE FORM VALUES FOR ERRORS
  // ============================================

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

  if (!isAuthorizedUser(user)) {
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

  if (!opportunityDateInput || !valueInput) {
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
  // OPPORTUNITY DATE VALIDATION
  // ============================================

  const opportunityDate = parseDate(opportunityDateInput);

  if (!opportunityDate) {
    return getErrorState("date", errorValues);
  }

  // ============================================
  // FETCH CURRENT OPPORTUNITY
  // ============================================

  let currentOpportunity;

  try {
    currentOpportunity = await prisma.opportunity.findUnique({
      where: {
        id: opportunityId,
      },
      select: {
        id: true,
        assignedToId: true,
        status: true,
      },
    });
  } catch (error) {
    console.error("Opportunity lookup failed:", error);

    return getErrorState("opportunity", errorValues);
  }

  if (!currentOpportunity) {
    return getErrorState("opportunity", errorValues);
  }

  if (currentOpportunity.status !== "OPEN") {
    return getErrorState("status", errorValues);
  }

  if (
    user.role === "SALESPERSON" &&
    currentOpportunity.assignedToId !== user.id
  ) {
    return getErrorState("permission", errorValues);
  }

  let titanCustomer;
  try {
    titanCustomer = await resolveServiceTitanOpportunityCustomer(values);
  } catch (error) {
    console.error("ServiceTitan customer validation failed:", error);
    return getErrorState("customerLookup", errorValues);
  }

  if (titanCustomer && !values.stCustomerId) {
    return getErrorState("duplicateCustomer", errorValues);
  }

  // ============================================
  // ASSIGNMENT VALIDATION
  // ============================================

  let assignedToId;

  try {
    assignedToId = await getAssignedToId(
      user,
      requestedAssignedToId,
      currentOpportunity.assignedToId,
    );
  } catch (error) {
    console.error("Opportunity assignment validation failed:", error);

    return getErrorState("assignment", errorValues);
  }

  if (!assignedToId) {
    return getErrorState("assignment", errorValues);
  }

  // ============================================
  // DATABASE TRANSACTION
  // ============================================

  try {
    await prisma.$transaction(async (tx) => {
      // ----------------------------------------
      // FIND OPPORTUNITY AGAIN
      // ----------------------------------------

      const opportunity = await tx.opportunity.findUnique({
        where: {
          id: opportunityId,
        },

        select: {
          id: true,
          customerId: true,
          localCustomerId: true,
          assignedToId: true,
          status: true,
        },
      });

      if (!opportunity) {
        throw new Error("OPPORTUNITY_NOT_FOUND");
      }

      // ----------------------------------------
      // STATUS VALIDATION
      // ----------------------------------------

      if (opportunity.status !== "OPEN") {
        throw new Error("OPPORTUNITY_NOT_OPEN");
      }

      // ----------------------------------------
      // SALESPERSON PERMISSION VALIDATION
      // ----------------------------------------

      if (user.role === "SALESPERSON" && opportunity.assignedToId !== user.id) {
        throw new Error("OPPORTUNITY_PERMISSION_DENIED");
      }

      // ----------------------------------------
      // FIND OR UPDATE CUSTOMER
      // ----------------------------------------

      const localCustomer = titanCustomer
        ? null
        : await findOrCreateOpportunityCustomer(
            tx,
            {
              ...values,
              customerId: opportunity.localCustomerId,
            },
            { nameMatch: "both", updateMode: "replace" },
          );
      const customerSnapshot = titanCustomer
        ? toOpportunityCustomerSnapshot(titanCustomer, values)
        : null;

      // ----------------------------------------
      // UPDATE OPPORTUNITY
      // ----------------------------------------

      const updateResult = await tx.opportunity.updateMany({
        where: {
          id: opportunityId,
          status: "OPEN",
          ...(user.role === "SALESPERSON" ? { assignedToId: user.id } : {}),
        },

        data: {
          customerId: titanCustomer
            ? customerSnapshot.stCustomerId
            : localCustomer.id,
          customerSource: titanCustomer ? "SERVICETITAN" : "POSTGRES",
          localCustomerId: localCustomer?.id || null,
          ...(customerSnapshot ? { customerSnapshot } : {}),
          opportunityDate,
          jobType: jobType || null,
          textMessage: textMessage || null,
          value: opportunityValue,
          assignedToId,

          // Preserve the original source.
          // Editing or reassigning an opportunity must not
          // change how the opportunity was generated.
        },
      });

      if (updateResult.count !== 1) {
        throw new Error("OPPORTUNITY_ALREADY_UPDATED");
      }

      // ----------------------------------------
      // RECALCULATE PENDING STANDARD FOLLOW-UPS
      // ----------------------------------------

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

      // ----------------------------------------
      // UPDATE PENDING MANUAL FOLLOW-UP ASSIGNMENT
      // ----------------------------------------

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

      // ----------------------------------------
      // UPDATE FOLLOW-UP SCHEDULE PRESENTATION DATE
      // ----------------------------------------

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

    if (error.message === "OPPORTUNITY_ALREADY_UPDATED") {
      return getErrorState("update", errorValues);
    }

    return getErrorState("update", errorValues);
  }
}
