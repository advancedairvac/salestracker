import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getQuickBooksClient } from "@/lib/quickbooks";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = randomBytes(32).toString("hex");
    const client = getQuickBooksClient();

    const authorizationUrl = client.authorizeUri({
      scope: ["com.intuit.quickbooks.accounting"],
      state,
    });

    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set("qb_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "QuickBooks connection setup failed." },
      { status: 500 }
    );
  }
}