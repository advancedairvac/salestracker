"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import {
  generateInvitationToken,
  hashInvitationToken,
  getInvitationExpiry,
} from "@/lib/auth/invitations";

import { sendSalesmanInvitation } from "@/lib/email/send-salesman-invitation";

function parseGoal(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return undefined;
  }

  return number;
}

function getValidatedSalesmanValues(values) {
  const name = values?.name?.trim();
  const email = values?.email?.trim().toLowerCase();
  const title = values?.title?.trim() || null;

  if (!name || !email) {
    return { error: "required" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "email" };
  }

  const monthlyGoal = parseGoal(values.monthlyGoal);
  const quarterlyGoal = parseGoal(values.quarterlyGoal);
  const annualGoal = parseGoal(values.annualGoal);

  if (
    monthlyGoal === undefined ||
    quarterlyGoal === undefined ||
    annualGoal === undefined
  ) {
    return { error: "goal" };
  }

  return {
    name,
    email,
    title,
    monthlyGoal,
    quarterlyGoal,
    annualGoal,
  };
}

async function requireAdmin() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    return null;
  }

  return user;
}

async function getInvitationUrl(token) {
  const headerStore = await headers();

  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost || headerStore.get("host");

  if (!host) {
    throw new Error("Unable to determine application host.");
  }

  const forwardedProtocol = headerStore.get("x-forwarded-proto");

  const protocol =
    forwardedProtocol?.split(",")[0]?.trim() ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  return `${protocol}://${host}/register?token=${encodeURIComponent(token)}`;
}

async function createAndSendInvitation(salesman) {
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = getInvitationExpiry();

  // Save the new token hash first.
  // This invalidates any previous invitation token.
  await prisma.user.update({
    where: {
      id: salesman.id,
    },
    data: {
      invitationTokenHash: tokenHash,
      invitationExpiresAt: expiresAt,
      invitedAt: new Date(),
      status: "INVITED",
    },
  });

  const invitationUrl = await getInvitationUrl(token);

  await sendSalesmanInvitation({
    name: salesman.name,
    email: salesman.email,
    invitationUrl,
  });
}

function revalidateSalesmanPages(salesmanId) {
  revalidatePath("/admin");
  revalidatePath("/admin/salesmen");
  revalidatePath(`/admin/salesmen/${salesmanId}`);
  revalidatePath(`/admin/salesmen/${salesmanId}/edit`);
}

export async function createSalesman(values) {
  const admin = await requireAdmin();

  if (!admin) {
    return { error: "permission" };
  }

  const validated = getValidatedSalesmanValues(values);

  if (validated.error) {
    return { error: validated.error };
  }

  const { name, email, title, monthlyGoal, quarterlyGoal, annualGoal } =
    validated;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return { error: "duplicate-email" };
    }

    const salesman = await prisma.user.create({
      data: {
        name,
        email,
        title,
        username: null,
        passwordHash: null,
        monthlyGoal,
        quarterlyGoal,
        annualGoal,
        role: "SALESPERSON",
        status: "INVITED",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    try {
      await createAndSendInvitation(salesman);
    } catch (emailError) {
      console.error("Salesman invitation email failed:", emailError);

      revalidateSalesmanPages(salesman.id);

      return {
        error: "invitation-email",
        salesmanId: salesman.id,
      };
    }

    revalidateSalesmanPages(salesman.id);

    return {
      success: true,
      message: "Salesman created and invitation email sent successfully.",
    };
  } catch (error) {
    console.error("Create salesman failed:", error);

    if (error.code === "P2002") {
      return { error: "duplicate-email" };
    }

    return { error: "create" };
  }
}

export async function resendSalesmanInvitation(salesmanId) {
  const admin = await requireAdmin();

  if (!admin) {
    return { error: "permission" };
  }

  if (!salesmanId) {
    return { error: "not-found" };
  }

  try {
    // Find invited salesperson by ID and status.
    // Username/password are checked separately because
    // they may contain null or empty-string values.
    const salesman = await prisma.user.findFirst({
      where: {
        id: salesmanId,
        role: "SALESPERSON",
        status: "INVITED",
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        passwordHash: true,
      },
    });

    if (!salesman) {
      return { error: "not-found" };
    }

    // Allow resend if either username or password is missing.
    const usernameMissing =
      !salesman.username ||
      salesman.username === "EMPTY_STRING" ||
      salesman.username.trim() === "";

    const passwordMissing = !salesman.passwordHash;

    if (!usernameMissing && !passwordMissing) {
      return { error: "not-eligible" };
    }

    await createAndSendInvitation(salesman);

    revalidateSalesmanPages(salesmanId);

    return {
      success: true,
      message: "A new invitation email has been sent.",
    };
  } catch (error) {
    console.error("Resend invitation failed:", error);

    return {
      error: "invitation-email",
    };
  }
}

export async function updateSalesman(values) {
  const admin = await requireAdmin();

  if (!admin) {
    return { error: "permission" };
  }

  const salesmanId = values?.salesmanId;

  if (!salesmanId) {
    return { error: "required" };
  }

  const validated = getValidatedSalesmanValues(values);

  if (validated.error) {
    return { error: validated.error };
  }

  const { name, email, title, monthlyGoal, quarterlyGoal, annualGoal } =
    validated;

  try {
    // Admin can edit their own profile or a salesperson.
    // An admin cannot edit another admin's profile.
    const existingSalesman = await prisma.user.findFirst({
      where: {
        id: salesmanId,
        OR: [
          { role: "SALESPERSON" },
          {
            role: "ADMIN",
            id: admin.id,
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        passwordHash: true,
        status: true,
        role: true,
      },
    });

    if (!existingSalesman) {
      return { error: "not-found" };
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: {
          id: salesmanId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return { error: "duplicate-email" };
    }

    const isPendingInvitation =
      existingSalesman.role === "SALESPERSON" &&
      existingSalesman.status === "INVITED" &&
      (!existingSalesman.username || !existingSalesman.passwordHash);

    const emailChanged = existingSalesman.email !== email;

    const updatedSalesman = await prisma.user.update({
      where: {
        id: salesmanId,
      },
      data: {
        name,
        email,
        title,
        monthlyGoal,
        quarterlyGoal,
        annualGoal,

        // Invalidate the previous invitation when the email changes.
        ...(isPendingInvitation && emailChanged
          ? {
              invitationTokenHash: null,
              invitationExpiresAt: null,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Send a new invitation when the pending user's email changes.
    if (isPendingInvitation && emailChanged) {
      try {
        await createAndSendInvitation(updatedSalesman);
      } catch (emailError) {
        console.error("Updated invitation email failed:", emailError);

        revalidateSalesmanPages(salesmanId);

        return {
          error: "invitation-email",
          message:
            "Profile updated, but the new invitation email could not be sent. Please use Resend Invitation.",
        };
      }
    }

    revalidateSalesmanPages(salesmanId);

    return {
      success: true,
      redirectTo: `/admin/salesmen/${salesmanId}`,
      message: "Profile updated successfully.",
    };
  } catch (error) {
    console.error("Update profile failed:", error);

    if (error.code === "P2002") {
      return { error: "duplicate-email" };
    }

    return { error: "update" };
  }
}

export async function terminateSalesman(salesmanId) {
  const admin = await requireAdmin();

  if (!admin) {
    return { error: "permission" };
  }

  if (!salesmanId) {
    return { error: "not-found" };
  }

  try {
    const result = await prisma.user.updateMany({
      where: {
        id: salesmanId,
        role: "SALESPERSON",
        status: "ACTIVE",
        username: { not: null },
        passwordHash: { not: null },
      },
      data: {
        status: "TERMINATED",
      },
    });

    if (result.count !== 1) {
      return { error: "not-eligible" };
    }

    revalidateSalesmanPages(salesmanId);

    return {
      success: true,
      message: "Salesperson account terminated successfully.",
    };
  } catch (error) {
    console.error("Terminate salesperson failed:", error);

    return { error: "update" };
  }
}

export async function reactivateSalesman(salesmanId) {
  const admin = await requireAdmin();

  if (!admin) {
    return { error: "permission" };
  }

  if (!salesmanId) {
    return { error: "not-found" };
  }

  try {
    const result = await prisma.user.updateMany({
      where: {
        id: salesmanId,
        role: "SALESPERSON",
        status: "TERMINATED",
        username: { not: null },
        passwordHash: { not: null },
      },
      data: {
        status: "ACTIVE",
      },
    });

    if (result.count !== 1) {
      return { error: "not-eligible" };
    }

    revalidateSalesmanPages(salesmanId);

    return {
      success: true,
      message: "Salesperson account reactivated successfully.",
    };
  } catch (error) {
    console.error("Reactivate salesperson failed:", error);

    return { error: "update" };
  }
}
