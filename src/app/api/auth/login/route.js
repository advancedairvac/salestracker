import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

function getRedirectUrl(path, request) {
  const origin =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin;

  return new URL(path, origin);
}

export async function POST(request) {
  try {
    const formData = await request.formData();

    const identifier = String(formData.get("username") ?? "").trim();

    const password = String(formData.get("password") ?? "");

    if (!identifier || !password) {
      return NextResponse.redirect(
        getRedirectUrl("/login?error=invalid", request),
        303,
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
        getRedirectUrl("/login?error=invalid", request),
        303,
      );
    }

    await createSession(user);

    const destination = user.role === "ADMIN" ? "/admin" : "/salesperson";

    return NextResponse.redirect(getRedirectUrl(destination, request), 303);
  } catch (error) {
    console.error("Login failed:", error);

    return NextResponse.redirect(
      getRedirectUrl("/login?error=server", request),
      303,
    );
  }
}
