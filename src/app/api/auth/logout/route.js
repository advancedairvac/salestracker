
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

function getRedirectUrl(request) {
  const origin =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin;

  return new URL("/login", origin);
}

export async function POST(request) {
  await destroySession();

  return NextResponse.redirect(
    getRedirectUrl(request),
    303,
  );
}
