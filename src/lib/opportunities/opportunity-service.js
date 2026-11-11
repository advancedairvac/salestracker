
import { prisma } from "@/lib/prisma";

import {
  getFormValues,
  getErrorState,
} from "@/lib/opportunities/form-helpers";

import {
  parseDate,
  parseManualFollowUpDate,
} from "@/lib/opportunities/date-helpers";

import {
  getStandardFollowUps,
} from "@/lib/opportunities/follow-up-schedule";

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
// CUSTOMER MATCHING / CREATE / UPDATE
// ============================================

async function findOrCreateOpportunityCustomer(tx, values) {
  const {
    customerId,
    stCustomerId,
    pocName,
    businessName,
    email,
    phone,
    location,
  } = values;

  let customer = null;

  // Priority 1: Match by ServiceTitan customer ID
  if (stCustomerId) {
    customer = await tx.customer.findUnique({
      where: {
        stCustomerId,
      },
    });
  }

  // Priority 2: Match by local customer ID
  if (!customer && customerId) {
    customer = await tx.customer.findUnique({
      where: {
        id: customerId,
      },
    });
  }

  // Priority 3: Match by business name and POC name
  if (!customer && businessName && pocName) {
    customer = await tx.customer.findFirst({
      where: {
        businessName: {
          equals: businessName,
          mode: "insensitive",
        },
        pocName: {
          equals: pocName,
          mode: "insensitive",
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  // Update existing customer
  if (customer) {
    return tx.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        stCustomerId: stCustomerId || customer.stCustomerId,
        businessName: businessName || customer.businessName,
        pocName: pocName || customer.pocName,
        email: email || customer.email,
        phone: phone || customer.phone,
        location: location || customer.location,
      },
    });
  }

  // Create new customer
  return tx.customer.create({
    data: {
      stCustomerId: stCustomerId || null,
      businessName: businessName || null,
      pocName: pocName || null,
      email: email || null,
      phone: phone || null,
      location: location || null,
    },
  });
}

// ============================================
// ASSIGNMENT VALIDATION
// ============================================

async function getAssignedToId(user, requestedAssignedToId) {
  if (!user || !["ADMIN", "SALESPERSON"].includes(user.role)) {
    return null;
  }

  // Salesperson can only assign opportunities to themselves
  if (user.role === "SALESPERSON") {
    return user.id;
  }

  // Admin defaults to self
  const assignedToId = requestedAssignedToId || user.id;

  // Admin assigning to themselves
  if (assignedToId === user.id) {
    return user.id;
  }

  // Admin can assign to an active Admin or Salesperson
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
// CREATE OPPORTUNITY SERVICE
// ============================================

export async function createOpportunityService({ user, formData }) {
  const values = getFormValues(formData);

  if (!user || !["ADMIN", "SALESPERSON"].includes(user.role)) {
    return getErrorState("permission", values);
  }

  const {
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

  if (
    !Number.isFinite(opportunityValue) ||
    opportunityValue < 0
  ) {
    return getErrorState("value", values);
  }

  // ============================================
  // EMAIL VALIDATION
  // ============================================

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return getErrorState("email", values);
  }

  // ============================================
  // DATE VALIDATION
  // ============================================

  const opportunityDate = parseDate(opportunityDateInput);

  if (!opportunityDate) {
    return getErrorState("date", values);
  }

  const manualFollowUpDate = followUpDateInput
    ? parseManualFollowUpDate(followUpDateInput)
    : null;

  if (followUpDateInput && !manualFollowUpDate) {
    return getErrorState("followUpDate", values);
  }

  if (
    manualFollowUpDate &&
    manualFollowUpDate <= new Date()
  ) {
    return getErrorState("followUpDatePast", values);
  }

  // ============================================
  // ASSIGNMENT VALIDATION
  // ============================================

  const assignedToId = await getAssignedToId(
    user,
    requestedAssignedToId,
  );

  if (!assignedToId) {
    return getErrorState("assignment", values);
  }

  // ============================================
  // OPPORTUNITY SETTINGS
  // ============================================

  const source =
    assignedToId === user.id
      ? "SELF_GENERATED"
      : "COMPANY_GENERATED";

  const hasManualFollowUp = Boolean(manualFollowUpDate);

  const activeScheduleMode = hasManualFollowUp
    ? "MANUAL"
    : "STANDARD";

  const title = [businessName || pocName, jobType]
    .filter(Boolean)
    .join(" - ");

  // ============================================
  // DATABASE TRANSACTION
  // ============================================

  try {
    await prisma.$transaction(async (tx) => {
      // Find or create customer
      const customer = await findOrCreateOpportunityCustomer(
        tx,
        values,
      );

      // Create opportunity
      const opportunity = await tx.opportunity.create({
        data: {
          customerId: customer.id,
          title,
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

      // Create follow-up schedule
      const schedule = await tx.followUpSchedule.create({
        data: {
          opportunityId: opportunity.id,
          mode: activeScheduleMode,
          isActive: true,
          presentationAt: opportunityDate,
        },
      });

      // Generate standard follow-ups
      const standardFollowUps = getStandardFollowUps(
        opportunityDate,
      );

      const followUpRecords = standardFollowUps.map((item) => ({
        opportunityId: opportunity.id,
        scheduleId: schedule.id,
        assignedToId,
        dueAt: item.dueAt,
        status: "PENDING",
        scheduleType: "STANDARD",
        sequence: item.sequence,
        isActive: !hasManualFollowUp,
        notes: "Automatically scheduled standard follow-up.",
      }));

      // Add manual follow-up record
      followUpRecords.push({
        opportunityId: opportunity.id,
        scheduleId: schedule.id,
        assignedToId,
        dueAt: manualFollowUpDate,
        status: "PENDING",
        scheduleType: "MANUAL",
        sequence: 0,
        isActive: hasManualFollowUp,
        notes: hasManualFollowUp
          ? "Manually scheduled follow-up."
          : "Manual follow-up not scheduled.",
      });

      // Save all follow-ups
      await tx.followUp.createMany({
        data: followUpRecords,
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Create opportunity failed:", error);

    return getErrorState("create", values);
  }
}
