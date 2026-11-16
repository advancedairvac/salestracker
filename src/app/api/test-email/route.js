
import { resend } from "@/lib/email/resend";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { to, subject, message } = await request.json();

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Subject and message are required." },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "Advanced Sales Tracker <onboarding@resend.dev>",
      to: [to.trim()],
      subject: subject.trim(),
      text: message.trim(),
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email accepted by Resend.",
      data,
    });
  } catch (error) {
    console.error("Test email error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to send test email." },
      { status: 500 }
    );
  }
}
