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

    // Required fields
    if (!name || !username || !password || !confirmPassword || !token) {
      return {
        error: "required",
      };
    }

    // Invitation token validation
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return {
        error: "invalid-token",
      };
    }

    // Username validation
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return {
        error: "username",
      };
    }

    // Password validation
    if (password.length < 10) {
      return {
        error: "password-length",
      };
    }

    if (password !== confirmPassword) {
      return {
        error: "password-match",
      };
    }

    const tokenHash = hashInvitationToken(token);

    // Find valid invitation
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
      return {
        error: "invalid-token",
      };
    }

    // Check username availability
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
      return {
        error: "username-taken",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Atomically consume the invitation.
    // Only one request can successfully activate this invitation.
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
      return {
        error: "invalid-token",
      };
    }

    return {
      success: true,
      message: "Registration completed successfully.",
    };
  } catch (error) {
    console.error("Salesman registration failed:", error);

    if (error?.code === "P2002") {
      return {
        error: "username-taken",
      };
    }

    return {
      error: "server",
    };
  }
}