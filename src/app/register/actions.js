
"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { hashInvitationToken } from "@/lib/auth/invitations";

export async function completeSalesmanRegistration(values) {
  try {
    const name = String(values?.name || "").trim();
    const username = String(values?.username || "").trim();
    const password = String(values?.password || "");
    const confirmPassword = String(values?.confirmPassword || "");
    const token = String(values?.token || "").trim();

    if (!name || !username || !password || !confirmPassword) {
      return { error: "required" };
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return { error: "username" };
    }

    // Minimum password length: 4 characters
    if (password.length < 4) {
      return { error: "password-length" };
    }

    if (password !== confirmPassword) {
      return { error: "password-match" };
    }

    if (token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
      return { error: "invalid-token" };
    }

    const tokenHash = hashInvitationToken(token);

    const salesman = await prisma.user.findFirst({
      where: {
        invitationTokenHash: tokenHash,
        invitationExpiresAt: {
          gt: new Date(),
        },
        role: "SALESPERSON",
        status: "INVITED",
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

    // Atomically consume invitation and activate account.
    const result = await prisma.user.updateMany({
      where: {
        id: salesman.id,
        invitationTokenHash: tokenHash,
        invitationExpiresAt: {
          gt: new Date(),
        },
        role: "SALESPERSON",
        status: "INVITED",
        passwordHash: null,
      },
      data: {
        name,
        username,
        passwordHash,
        status: "ACTIVE",
        invitationTokenHash: null,
        invitationExpiresAt: null,
        acceptedAt: new Date(),
      },
    });

    if (result.count !== 1) {
      return { error: "invalid-token" };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Complete salesman registration failed:", error);

    if (error?.code === "P2002") {
      return { error: "username-taken" };
    }

    return { error: "server" };
  }
}
