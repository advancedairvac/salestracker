import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function PATCH(request) {
  try {
    const authenticatedUser = await getAuthenticatedUser();

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in again." },
        { status: 401 },
      );
    }

    if (!["ADMIN", "SALESPERSON"].includes(authenticatedUser.role)) {
      return NextResponse.json(
        { error: "You are not authorized to update this profile." },
        { status: 403 },
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request data." },
        { status: 400 },
      );
    }

    const {
      name,
      title,
      email,
      username,
      oldPassword,
      newPassword,
      confirmPassword,
    } = body;

    if (
      typeof name !== "string" ||
      typeof title !== "string" ||
      typeof email !== "string" ||
      typeof username !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid profile information." },
        { status: 400 },
      );
    }

    const cleanName = name.trim();
    const cleanTitle = title.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (!cleanName || !cleanEmail || !cleanUsername) {
      return NextResponse.json(
        {
          error: "Full name, email address, and username are required.",
        },
        { status: 400 },
      );
    }

    if (
      cleanName.length > 100 ||
      cleanTitle.length > 100 ||
      cleanEmail.length > 254 ||
      cleanUsername.length > 50
    ) {
      return NextResponse.json(
        { error: "One or more fields exceed the allowed length." },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id: { not: authenticatedUser.id },
        OR: [{ username: cleanUsername }, { email: cleanEmail }],
      },
      select: {
        username: true,
        email: true,
      },
    });

    if (existingUser?.username === cleanUsername) {
      return NextResponse.json(
        { error: "This username is already taken." },
        { status: 409 },
      );
    }

    if (existingUser?.email === cleanEmail) {
      return NextResponse.json(
        { error: "This email address is already in use." },
        { status: 409 },
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: authenticatedUser.id },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json(
        { error: "Your account is unavailable." },
        { status: 401 },
      );
    }

    const passwordValues = [oldPassword, newPassword, confirmPassword];

    const hasAnyPasswordValue = passwordValues.some(
      (value) => typeof value === "string" && value.length > 0,
    );

    const updateData = {
      name: cleanName,
      title: cleanTitle || null,
      email: cleanEmail,
      username: cleanUsername,
    };

    if (hasAnyPasswordValue) {
      const allPasswordFieldsProvided = passwordValues.every(
        (value) => typeof value === "string" && value.length > 0,
      );

      if (!allPasswordFieldsProvided) {
        return NextResponse.json(
          {
            error:
              "To change your password, complete all three password fields.",
          },
          { status: 400 },
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          {
            error: "New password must be at least 8 characters long.",
          },
          { status: 400 },
        );
      }

      if (newPassword.length > 128) {
        return NextResponse.json(
          { error: "New password is too long." },
          { status: 400 },
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: "New passwords do not match." },
          { status: 400 },
        );
      }

      const oldPasswordIsValid = await compare(
        oldPassword,
        currentUser.passwordHash,
      );

      if (!oldPasswordIsValid) {
        return NextResponse.json(
          { error: "Your old password is incorrect." },
          { status: 400 },
        );
      }

      updateData.passwordHash = await hash(newPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: authenticatedUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        title: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "Profile updated successfully.",
        user: updatedUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Profile update API error:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Username or email address is already in use." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Something went wrong while updating your profile." },
      { status: 500 },
    );
  }
}
