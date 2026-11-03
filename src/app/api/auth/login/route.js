
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const identifier = String(
      formData.get("username") ?? ""
    ).trim();

    const password = String(
      formData.get("password") ?? ""
    );

    if (!identifier || !password) {
      return NextResponse.redirect(
        new URL("/login?error=invalid", request.url),
        303
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: "insensitive" } },
          { email: { equals: identifier, mode: "insensitive" } },
        ],
      },
    });

    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return NextResponse.redirect(
        new URL("/login?error=invalid", request.url),
        303
      );
    }

    await createSession(user);

    const destination =
      user.role === "ADMIN" ? "/admin" : "/salesperson";

    return NextResponse.redirect(
      new URL(destination, request.url),
      303
    );
  } catch (error) {
    console.error("Login failed:", error);

    return NextResponse.redirect(
      new URL("/login?error=server", request.url),
      303
    );
  }
}
