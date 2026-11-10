"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// --------------------------------------------
// FORM HELPERS
// --------------------------------------------

function getFormValue(formData, key) {
  return formData.get(key)?.toString().trim() || "";
}

function getFormValues(formData) {
  return {
    customerId: getFormValue(formData, "customerId"),
    stCustomerId: getFormValue(formData, "stCustomerId"),
    opportunityDate: getFormValue(formData, "opportunityDate"),
    pocName: getFormValue(formData, "pocName"),
    businessName: getFormValue(formData, "businessName"),
    jobType: getFormValue(formData, "jobType"),
    email: getFormValue(formData, "email"),
    textMessage: getFormValue(formData, "textMessage"),
    phone: getFormValue(formData, "phone"),
    location: getFormValue(formData, "location"),
    value: getFormValue(formData, "value"),
    assignedToId: getFormValue(formData, "assignedToId"),
    followUpDate: getFormValue(formData, "followUpDate"),
  };
}

function getErrorState(error, values) {
  return {
    error,
    values,
  };
}

// --------------------------------------------
// DATE HELPERS
// --------------------------------------------

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

// Manual Follow-up default time: 07:30 AM.
function parseManualFollowUpDate(value) {
  const date = parseDate(value);

  if (!date) {
    return null;
  }

  date.setHours(7, 30, 0, 0);

  return date;
}

function addHours(date, hours) {
  const result = new Date(date);

  result.setHours(result.getHours() + hours);

  return result;
}

function addDays(date, days) {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

// Add one calendar month without overflowing.
function addOneMonth(date) {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + 1);

  const lastDayOfMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();

  result.setDate(Math.min(originalDay, lastDayOfMonth));

  return result;
}

// --------------------------------------------
// STANDARD FOLLOW-UP SCHEDULE
// --------------------------------------------

function getStandardFollowUps(opportunityDate) {
  return [
    {
      sequence: 1,
      dueAt: addHours(opportunityDate, 24),
    },
    {
      sequence: 2,
      dueAt: addHours(opportunityDate, 36),
    },
    {
      sequence: 3,
      dueAt: addDays(opportunityDate, 7),
    },
    {
      sequence: 4,
      dueAt: addDays(opportunityDate, 14),
    },
    {
      sequence: 5,
      dueAt: addOneMonth(opportunityDate),
    },
  ];
}

// --------------------------------------------
// CUSTOMER SEARCH
// --------------------------------------------

export async function searchCustomers(query) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const search = query?.trim();

  if (!search || search.length < 2) {
    return [];
  }

  const customers = await prisma.customer.findMany({
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

  return customers;
}

// --------------------------------------------
// CREATE OPPORTUNITY
// --------------------------------------------

export async function createOpportunity(previousState, formData) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const values = getFormValues(formData);

  const {
    customerId,
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

  // ------------------------------------------
  // USER PERMISSION
  // ------------------------------------------

  if (user.role !== "ADMIN" && user.role !== "SALESPERSON") {
    return getErrorState("permission", values);
  }

  // ------------------------------------------
  // REQUIRED FIELD VALIDATION
  // ------------------------------------------

  if (!opportunityDateInput || !pocName || valueInput === "") {
    return getErrorState("required", values);
  }

  // Zero is allowed. Negative values are not allowed.
  const value = Number(valueInput);

  if (!Number.isFinite(value) || value < 0) {
    return getErrorState("value", values);
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return getErrorState("email", values);
  }

  const opportunityDate = parseDate(opportunityDateInput);

  if (!opportunityDate) {
    return getErrorState("date", values);
  }

  const manualFollowUpDate = followUpDateInput
    ? parseManualFollowUpDate(followUpDateInput)
    : null;

  if (followUpDateInput && !manualFollowUpDate) {
    return getErrorState("followup", values);
  }

  // Manual Follow-up must be in the future.
  if (manualFollowUpDate && manualFollowUpDate < new Date()) {
    return getErrorState("followup", values);
  }

  // ------------------------------------------
  // ASSIGNMENT
  // ------------------------------------------

  // Salesperson can only create opportunities
  // assigned to themselves.
  let assignedToId = user.id;

  // Admin can assign to themselves or another
  // active team member.
  if (user.role === "ADMIN") {
    const selectedAssigneeId = requestedAssignedToId || user.id;

    const selectedUser = await prisma.user.findFirst({
      where: {
        id: selectedAssigneeId,
        isActive: true,
        role: {
          in: ["ADMIN", "SALESPERSON"],
        },
      },
      select: {
        id: true,
      },
    });

    if (!selectedUser) {
      return getErrorState("assignee", values);
    }

    assignedToId = selectedUser.id;
  }

  // ------------------------------------------
  // OPPORTUNITY SOURCE
  // ------------------------------------------

  const source =
    assignedToId === user.id ? "SELF_GENERATED" : "COMPANY_GENERATED";

  // ------------------------------------------
  // FOLLOW-UP MODE
  // ------------------------------------------

  const hasManualFollowUp = Boolean(manualFollowUpDate);

  const activeScheduleMode = hasManualFollowUp ? "MANUAL" : "STANDARD";

  // ------------------------------------------
  // DATABASE TRANSACTION
  // ------------------------------------------

  try {
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

      // 2. Match by local Customer ID.
      if (!customer && customerId) {
        customer = await tx.customer.findUnique({
          where: {
            id: customerId,
          },
        });
      }

      // 3. Fallback matching for manually entered customers.
      if (!customer && (businessName || pocName)) {
        const customerConditions = [];

        if (businessName) {
          customerConditions.push({
            businessName: {
              equals: businessName,
              mode: "insensitive",
            },
          });
        }

        if (pocName) {
          customerConditions.push({
            pocName: {
              equals: pocName,
              mode: "insensitive",
            },
          });
        }

        customer = await tx.customer.findFirst({
          where: {
            OR: customerConditions,
          },
          orderBy: {
            createdAt: "asc",
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
            businessName: businessName || customer.businessName || null,
            pocName,
            phone: phone || customer.phone,
            email: email || customer.email,
            location: location || customer.location,
            ...(stCustomerId ? { stCustomerId } : {}),
          },
        });
      } else {
        customer = await tx.customer.create({
          data: {
            stCustomerId: stCustomerId || null,
            businessName: businessName || null,
            pocName,
            phone: phone || null,
            email: email || null,
            location: location || null,
          },
        });
      }

      // --------------------------------------
      // OPPORTUNITY CREATE
      // --------------------------------------

      const opportunityTitle = [businessName || pocName, jobType]
        .filter(Boolean)
        .join(" - ");

      const opportunity = await tx.opportunity.create({
        data: {
          title: opportunityTitle,
          customerId: customer.id,
          opportunityDate,
          jobType: jobType || null,
          textMessage: textMessage || null,
          value,
          source,
          status: "OPEN",
          assignedToId,
          createdById: user.id,
        },
      });

      // --------------------------------------
      // CREATE FOLLOW-UP SCHEDULE
      // --------------------------------------

      const schedule = await tx.followUpSchedule.create({
        data: {
          opportunityId: opportunity.id,
          mode: activeScheduleMode,
          isActive: true,
          presentationAt: opportunityDate,
        },
      });

      // --------------------------------------
      // CREATE FIVE STANDARD FOLLOW-UPS
      // --------------------------------------

      const standardFollowUps = getStandardFollowUps(opportunityDate);

      const followUpRecords = standardFollowUps.map((followUp) => ({
        opportunityId: opportunity.id,
        scheduleId: schedule.id,
        assignedToId,
        dueAt: followUp.dueAt,
        status: "PENDING",
        scheduleType: "STANDARD",
        sequence: followUp.sequence,
        isActive: !hasManualFollowUp,
        notes: "Automatically scheduled standard follow-up.",
      }));

      // --------------------------------------
      // CREATE ONE MANUAL FOLLOW-UP
      // --------------------------------------

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
          ? "Manual follow-up scheduled during opportunity creation."
          : "Manual follow-up is inactive until a date is selected.",
      });

      // --------------------------------------
      // SAVE ALL SIX FOLLOW-UPS
      // --------------------------------------

      await tx.followUp.createMany({
        data: followUpRecords,
      });
    });
  } catch (error) {
    console.error("Create opportunity failed:", error);

    return getErrorState("create", values);
  }

  // ------------------------------------------
  // REVALIDATE
  // ------------------------------------------

  revalidatePath("/admin");
  revalidatePath("/admin/opportunities");
  revalidatePath("/admin/pipeline");

  redirect("/admin/opportunities?created=1");
}
