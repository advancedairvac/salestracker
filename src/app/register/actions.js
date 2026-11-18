"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

import {
  hashInvitationToken,
} from "@/lib/auth/invitations";

export async function completeSalesmanRegistration(values) {
  const token = String(values?.token || "").trim();
  const username = String(values?.username || "").trim();
  const password = String(values?.password || "");
  const confirmPassword = String(values?.confirmPassword || "");

  if (!token || !username || !password || !confirmPassword) {
    return { error: "required" };
  }

  if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
    return { error: "username-format" };
  }

  if (password.length < 10) {
    return { error: "password-length" };
  }

  if (password !== confirmPassword) {
    return { error: "password-mismatch" };
  }

  if (token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
    return { error: "invalid-token" };
  }

  const tokenHash = hashInvitationToken(token);

  try {
    const salesman = await prisma.user.findFirst({
      where: {
        invitationTokenHash: tokenHash,
        invitationExpiresAt: {
          gt: new Date(),
        },
        role: "SALESPERSON",
        isActive: false,
        passwordHash: null,
      },
      select: {
        id: true,
      },
    });

    if (!salesman) {
      return { error: "invalid-token" };
    }

    const existingUsername = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingUsername) {
      return { error: "username-taken" };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Atomic token consumption: only one request can activate this account.
    const result = await prisma.user.updateMany({
      where: {
        id: salesman.id,
        invitationTokenHash: tokenHash,
        invitationExpiresAt: {
          gt: new Date(),
        },
        role: "SALESPERSON",
        isActive: false,
        passwordHash: null,
      },
      data: {
        username,
        passwordHash,
        isActive: true,

        invitationTokenHash: null,
        invitationExpiresAt: null,
      },
    });

    if (result.count !== 1) {
      return { error: "invalid-token" };
    }

    return {
      success: true,
      message: "Your account has been activated successfully.",
    };
  } catch (error) {
    console.error("Salesman registration failed:", error);

    if (error.code === "P2002") {
      return { error: "username-taken" };
    }

    return { error: "server" };
  }
}