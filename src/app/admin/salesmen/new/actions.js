
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

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

export async function createSalesman(values) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    return {
      error: "permission",
    };
  }

  const name = values?.name?.trim();
  const email = values?.email?.trim().toLowerCase();
  const title = values?.title?.trim() || null;

  if (!name || !email) {
    return {
      error: "required",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      error: "email",
    };
  }

  const monthlyGoal = parseGoal(values.monthlyGoal);
  const quarterlyGoal = parseGoal(values.quarterlyGoal);
  const annualGoal = parseGoal(values.annualGoal);

  if (
    monthlyGoal === undefined ||
    quarterlyGoal === undefined ||
    annualGoal === undefined
  ) {
    return {
      error: "goal",
    };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return {
        error: "duplicate-email",
      };
    }

    await prisma.user.create({
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
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Create salesman failed:", error);

    if (error.code === "P2002") {
      return {
        error: "duplicate-email",
      };
    }

    return {
      error: "create",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/salesmen");

  redirect("/admin/salesmen?created=1");
}
