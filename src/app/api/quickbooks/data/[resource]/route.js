
import { NextResponse } from "next/server";
import { queryQuickBooksResource } from "@/lib/quickbooks-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { resource } = await params;
    const url = new URL(request.url);

    const result = await queryQuickBooksResource(resource, {
      startPosition: url.searchParams.get("startPosition"),
      maxResults: url.searchParams.get("maxResults"),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error.message || "QuickBooks API request failed.";

    const status =
      error.status === 401 || error.status === 403
        ? 502
        : message.startsWith("No QuickBooks")
          ? 404
          : message === "Unsupported QuickBooks resource."
            ? 400
            : 500;

    return NextResponse.json(
      {
        success: false,
        message,
        quickBooksStatus: error.status || null,
      },
      { status }
    );
  }
}
